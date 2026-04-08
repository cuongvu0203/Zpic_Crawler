#!/usr/bin/env node

/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║        CHEVERETO V4 CRAWLER - by Claude                  ║
 * ║  Hỗ trợ cursor/seek pagination, lưu MongoDB             ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * Cách dùng:
 *   node crawler.js --url "https://zpic.biz/category/sfw/" --mongo "mongodb://localhost:27017" --db mydb --delay 1500
 *   node crawler.js --url "https://zpic.biz/" --limit 100
 *   node crawler.js --help
 */

const { chromium } = require("playwright");
const { MongoClient } = require("mongodb");
const cheerio = require("cheerio");
const axios = require("axios");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const chalk = require("chalk");

// ─── CLI Arguments ──────────────────────────────────────────────────────────
const argv = yargs(hideBin(process.argv))
  .usage("$0 [options]")
  .option("url", {
    alias: "u",
    type: "string",
    description: "URL bắt đầu crawl (category, listing, homepage...)",
    demandOption: true,
  })
  .option("mongo", {
    alias: "m",
    type: "string",
    description: "MongoDB connection string",
    default: "mongodb+srv://yihoyif834_db_user:xFjda4mUC5loqmPr@zpic.mx23ymo.mongodb.net",
  })
  .option("db", {
    type: "string",
    description: "Tên database MongoDB",
    default: "chevereto",
  })
  .option("collection", {
    alias: "c",
    type: "string",
    description: "Tên collection lưu media",
    default: "media",
  })
  .option("delay", {
    alias: "d",
    type: "number",
    description: "Delay giữa mỗi request (ms)",
    default: 1500,
  })
  .option("limit", {
    alias: "l",
    type: "number",
    description: "Giới hạn số item crawl (0 = không giới hạn)",
    default: 0,
  })
  .option("concurrency", {
    type: "number",
    description: "Số tab song song khi fetch detail page",
    default: 3,
  })
  .option("headless", {
    type: "boolean",
    description: "Chạy browser headless",
    default: true,
  })
  .option("mode", {
    type: "string",
    choices: ["axios", "playwright"],
    description: "Dùng axios (nhanh) hay playwright (bypass JS rendering)",
    default: "axios",
  })
  .option("resume", {
    type: "boolean",
    description: "Tiếp tục từ checkpoint cũ (nếu có)",
    default: true,
  })
  .help()
  .alias("help", "h")
  .example(
    '$0 --url "https://zpic.biz/category/sfw/" --db mydb',
    "Crawl category SFW"
  )
  .example(
    '$0 --url "https://zpic.biz/" --limit 50 --delay 2000',
    "Crawl 50 items từ homepage"
  ).argv;

// ─── Logger ─────────────────────────────────────────────────────────────────
const log = {
  info: (msg) => console.log(chalk.cyan(`[INFO] ${msg}`)),
  success: (msg) => console.log(chalk.green(`[OK]   ${msg}`)),
  warn: (msg) => console.log(chalk.yellow(`[WARN] ${msg}`)),
  error: (msg) => console.log(chalk.red(`[ERR]  ${msg}`)),
  page: (msg) => console.log(chalk.magenta(`[PAGE] ${msg}`)),
  item: (msg) => console.log(chalk.white(`[ITEM] ${msg}`)),
};

// ─── Sleep helper ────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── HTTP client với retry ───────────────────────────────────────────────────
const http = axios.create({
  timeout: 30000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
  },
});

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await http.get(url);
      return res.data;
    } catch (err) {
      const status = err.response?.status;
      if (status === 429) {
        log.warn(`Rate limited, chờ 10s trước khi thử lại... (${url})`);
        await sleep(10000);
      } else if (i === retries - 1) {
        throw err;
      } else {
        log.warn(`Retry ${i + 1}/${retries} cho: ${url}`);
        await sleep(2000 * (i + 1));
      }
    }
  }
}

// ─── Parse listing page: lấy item URLs + next page URL ──────────────────────
/**
 * Chevereto V4 cursor pagination:
 *   ?page=N&seek=TIMESTAMP.UNIQUE_ID
 *
 * "seek" = cursor được lấy trực tiếp từ thẻ <a rel="next"> trong HTML.
 * Ta KHÔNG cần tự tính seek — chỉ cần follow link "next page".
 */
function parseListingPage(html, baseUrl) {
  const $ = cheerio.load(html);
  const itemUrls = [];

  // ── 1. Lấy URLs của từng media item ────────────────────────────────────────
  // Chevereto V4 render thumbnail với link dạng /view/Slug.ID
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    // Pattern: /view/Something.XXXXX hoặc full URL
    if (/\/view\/[^"'\s]+/.test(href)) {
      const fullUrl = href.startsWith("http")
        ? href
        : new URL(href, baseUrl).href;
      if (!itemUrls.includes(fullUrl)) {
        itemUrls.push(fullUrl);
      }
    }
  });

  // ── 2. Lấy next page URL từ <a rel="next"> hoặc pagination ─────────────────
  let nextPageUrl = null;

  // Cách 1: rel="next" (chuẩn HTML)
  const relNext = $('a[rel="next"]').attr("href");
  if (relNext) {
    nextPageUrl = relNext.startsWith("http")
      ? relNext
      : new URL(relNext, baseUrl).href;
  }

  // Cách 2: nút "Next" / ">" trong pagination block
  if (!nextPageUrl) {
    $("a").each((_, el) => {
      const text = $(el).text().trim().toLowerCase();
      const href = $(el).attr("href") || "";
      if (
        (text === "next" ||
          text === ">" ||
          text === "→" ||
          text.includes("next page")) &&
        href.includes("seek=")
      ) {
        nextPageUrl = href.startsWith("http")
          ? href
          : new URL(href, baseUrl).href;
      }
    });
  }

  // Cách 3: Tìm bất kỳ link nào chứa ?page=N&seek= (lấy page số lớn nhất)
  if (!nextPageUrl) {
    let maxPage = 0;
    $('a[href*="seek="]').each((_, el) => {
      const href = $(el).attr("href") || "";
      const m = href.match(/[?&]page=(\d+)/);
      const pageNum = m ? parseInt(m[1]) : 0;
      if (pageNum > maxPage) {
        maxPage = pageNum;
        nextPageUrl = href.startsWith("http")
          ? href
          : new URL(href, baseUrl).href;
      }
    });
  }

  return { itemUrls, nextPageUrl };
}

// ─── Parse detail page: extract media info ───────────────────────────────────
function parseDetailPage(html, pageUrl) {
  const $ = cheerio.load(html);

  const result = {
    sourceUrl: pageUrl,
    type: null,
    src: null,
    poster: null,
    title: null,
    description: null,
    tags: [],
    uploader: null,
    uploadDate: null,
    thumbnail: null,
    width: null,
    height: null,
    crawledAt: new Date(),
  };

  // ── Title ──────────────────────────────────────────────────────────────────
  result.title =
    $("h1").first().text().trim() ||
    $("title").text().replace(/\s*[-|].*$/, "").trim() ||
    null;

  // ── Description / caption ─────────────────────────────────────────────────
  result.description =
    $('meta[name="description"]').attr("content") ||
    $(".media-description, .content-description, .image-description")
      .first()
      .text()
      .trim() ||
    null;

  // ── Uploader ──────────────────────────────────────────────────────────────
  result.uploader =
    $('a[href*="/profile/"], a[href*="/user/"]').first().text().trim() || null;

  // ── Upload date ───────────────────────────────────────────────────────────
  const timeEl = $("time[datetime]").first();
  if (timeEl.length) {
    result.uploadDate = timeEl.attr("datetime") || null;
  }

  // ── Tags ──────────────────────────────────────────────────────────────────
  $('a[href*="/tag/"], .tag, [class*="tag"]').each((_, el) => {
    const t = $(el).text().trim();
    if (t && !result.tags.includes(t)) result.tags.push(t);
  });

  // ── VIDEO ──────────────────────────────────────────────────────────────────
  const videoEl = $("video.media, video[src], video source").first();
  if (videoEl.length) {
    result.type = "video";

    // src có thể nằm trực tiếp trên <video> hoặc trong <source>
    result.src =
      videoEl.attr("src") ||
      $("video source").first().attr("src") ||
      null;

    result.poster = $("video").first().attr("poster") || null;

    const w = $("video").first().attr("width");
    const h = $("video").first().attr("height");
    result.width = w ? parseInt(w) : null;
    result.height = h ? parseInt(h) : null;
  }

  // ── IMAGE ──────────────────────────────────────────────────────────────────
  if (!result.type) {
    // Chevereto thường có class "image-viewer", "media", "viewer-image"
    const imgEl = $(
      'img.media, img[class*="viewer"], .image-viewer img, #image-viewer img, img[src*="/images/"]'
    ).first();
    if (imgEl.length) {
      result.type = "image";
      result.src = imgEl.attr("src") || null;
      result.thumbnail = imgEl.attr("data-src") || result.src;

      const w = imgEl.attr("width");
      const h = imgEl.attr("height");
      result.width = w ? parseInt(w) : null;
      result.height = h ? parseInt(h) : null;
    }
  }

  // ── Fallback: OG tags ──────────────────────────────────────────────────────
  if (!result.src) {
    const ogVideo = $('meta[property="og:video"]').attr("content");
    const ogImage = $('meta[property="og:image"]').attr("content");
    const ogType = $('meta[property="og:type"]').attr("content") || "";

    if (ogVideo) {
      result.type = result.type || "video";
      result.src = result.src || ogVideo;
    }
    if (ogImage) {
      result.thumbnail = result.thumbnail || ogImage;
      if (!result.type) {
        result.type = "image";
        result.src = ogImage;
      }
    }
    if (!result.type && ogType.includes("video")) result.type = "video";
    if (!result.type && ogType.includes("image")) result.type = "image";
  }

  return result;
}

// ─── MongoDB helper ──────────────────────────────────────────────────────────
class Database {
  constructor(uri, dbName, collectionName) {
    this.uri = uri;
    this.dbName = dbName;
    this.collectionName = collectionName;
    this.client = null;
    this.col = null;
    this.checkpointCol = null;
  }

  async connect() {
    this.client = new MongoClient(this.uri);
    await this.client.connect();
    const db = this.client.db(this.dbName);
    this.col = db.collection(this.collectionName);
    this.checkpointCol = db.collection("_crawler_checkpoints");

    // Tạo indexes
    await this.col.createIndex({ sourceUrl: 1 }, { unique: true });
    await this.col.createIndex({ type: 1 });
    await this.col.createIndex({ crawledAt: -1 });

    log.success(`Kết nối MongoDB: ${this.dbName}.${this.collectionName}`);
  }

  async upsert(doc) {
    return this.col.updateOne(
      { sourceUrl: doc.sourceUrl },
      { $set: doc },
      { upsert: true }
    );
  }

  async exists(url) {
    const count = await this.col.countDocuments({ sourceUrl: url });
    return count > 0;
  }

  async saveCheckpoint(startUrl, nextPageUrl, stats) {
    await this.checkpointCol.updateOne(
      { startUrl },
      { $set: { startUrl, nextPageUrl, stats, updatedAt: new Date() } },
      { upsert: true }
    );
  }

  async loadCheckpoint(startUrl) {
    return this.checkpointCol.findOne({ startUrl });
  }

  async close() {
    if (this.client) await this.client.close();
  }
}

// ─── Crawl với concurrency pool ──────────────────────────────────────────────
async function crawlDetails(urls, db, concurrency, delay) {
  const results = [];
  const chunks = [];
  for (let i = 0; i < urls.length; i += concurrency) {
    chunks.push(urls.slice(i, i + concurrency));
  }

  for (const chunk of chunks) {
    const tasks = chunk.map(async (url) => {
      // Skip nếu đã có trong DB
      if (await db.exists(url)) {
        log.warn(`Đã có trong DB, bỏ qua: ${url}`);
        return null;
      }

      try {
        const html = await fetchWithRetry(url);
        const data = parseDetailPage(html, url);

        // ── Chỉ lưu VIDEO, bỏ qua ảnh ─────────────────────────────────────
        if (data.type !== "video") {
          log.warn(`SKIP (${data.type || "?"}) | ${data.title || url}`);
          return null;
        }

        await db.upsert(data);
        log.item(
          `${data.type.toUpperCase()} | ${data.title || url} | src: ${data.src ? "✓" : "✗"}`
        );
        return data;
      } catch (err) {
        log.error(`Lỗi fetch detail: ${url} — ${err.message}`);
        return null;
      }
    });

    const batch = await Promise.all(tasks);
    results.push(...batch.filter(Boolean));
    await sleep(delay);
  }

  return results;
}

// ─── Main crawler ─────────────────────────────────────────────────────────────
async function main() {
  const {
    url: startUrl,
    mongo,
    db: dbName,
    collection,
    delay,
    limit,
    concurrency,
    resume,
  } = argv;

  log.info(`Bắt đầu crawl: ${startUrl}`);
  log.info(
    `MongoDB: ${mongo} | DB: ${dbName} | Collection: ${collection}`
  );
  log.info(`Delay: ${delay}ms | Limit: ${limit || "không giới hạn"} | Concurrency: ${concurrency}`);

  const db = new Database(mongo, dbName, collection);
  await db.connect();

  const stats = { pages: 0, items: 0, skipped: 0, errors: 0 };
  let currentUrl = startUrl;

  // Resume từ checkpoint nếu có
  if (resume) {
    const ckpt = await db.loadCheckpoint(startUrl);
    if (ckpt?.nextPageUrl) {
      log.info(`Tiếp tục từ checkpoint: ${ckpt.nextPageUrl}`);
      currentUrl = ckpt.nextPageUrl;
      Object.assign(stats, ckpt.stats || {});
    }
  }

  try {
    while (currentUrl) {
      log.page(`Đang crawl trang ${stats.pages + 1}: ${currentUrl}`);

      let html;
      try {
        html = await fetchWithRetry(currentUrl);
      } catch (err) {
        log.error(`Không thể fetch listing page: ${err.message}`);
        break;
      }

      const { itemUrls, nextPageUrl } = parseListingPage(html, currentUrl);
      log.info(
        `Tìm thấy ${itemUrls.length} items | Next: ${nextPageUrl || "không có"}`
      );

      if (itemUrls.length === 0) {
        log.warn("Không tìm thấy item nào — kiểm tra lại selector hoặc trang đã hết.");
        break;
      }

      // Giới hạn số item nếu cần
      let toProcess = itemUrls;
      if (limit > 0) {
        const remaining = limit - stats.items;
        if (remaining <= 0) break;
        toProcess = itemUrls.slice(0, remaining);
      }

      // Crawl detail pages
      const crawled = await crawlDetails(toProcess, db, concurrency, delay);
      stats.items += crawled.length;
      stats.pages += 1;

      // Lưu checkpoint sau mỗi trang
      await db.saveCheckpoint(startUrl, nextPageUrl, stats);

      log.success(
        `Trang ${stats.pages} xong | Tổng items: ${stats.items}`
      );

      // Kiểm tra limit
      if (limit > 0 && stats.items >= limit) {
        log.info(`Đã đạt giới hạn ${limit} items. Dừng.`);
        break;
      }

      if (!nextPageUrl) {
        log.success("Đã crawl hết tất cả các trang!");
        break;
      }

      currentUrl = nextPageUrl;
      await sleep(delay);
    }
  } finally {
    await db.close();
  }

  // Summary
  console.log("\n" + "═".repeat(55));
  console.log(chalk.bold.green("  ✅  CRAWL HOÀN THÀNH"));
  console.log("═".repeat(55));
  console.log(`  📄 Tổng trang đã crawl : ${chalk.yellow(stats.pages)}`);
  console.log(`  🎬 Tổng items lưu vào DB: ${chalk.yellow(stats.items)}`);
  console.log(`  ❌ Lỗi                  : ${chalk.red(stats.errors)}`);
  console.log("═".repeat(55) + "\n");
}

main().catch((err) => {
  log.error(`Fatal: ${err.message}`);
  console.error(err);
  process.exit(1);
});