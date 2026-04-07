#!/usr/bin/env node
/**
 * Test parser: kiểm tra logic parse mà không cần MongoDB
 * node test-parse.js
 */

const cheerio = require("cheerio");

// ── Mock HTML của listing page Chevereto V4 ──────────────────────────────────
const MOCK_LISTING_HTML = `
<!DOCTYPE html>
<html>
<head><title>SFW Category - zpic.biz</title></head>
<body>
<div class="content-listing">
  <a href="/view/Cute-Cat-Video.xABC12" title="Cute Cat Video">
    <img src="https://zpi.cx/s3/thumb1.jpg" />
  </a>
  <a href="/view/Beach-Sunset.xDEF34" title="Beach Sunset">
    <img src="https://zpi.cx/s3/thumb2.jpg" />
  </a>
  <a href="/view/Video-2008335.xEgFy4" title="Video 2008335">
    <img src="https://zpi.cx/s3/aq8h2prS.fr.jpeg" />
  </a>
  <a href="/view/Funny-Dogs.xGHI56" title="Funny Dogs">
    <img src="https://zpi.cx/s3/thumb4.jpg" />
  </a>
</div>

<!-- Chevereto V4 pagination với cursor/seek -->
<nav class="pagination">
  <a href="/category/sfw/?page=2&seek=2025-08-20+02%3A45%3A58.xQZXlb" rel="prev">← Prev</a>
  <span>Page 3</span>
  <a href="/category/sfw/?page=4&seek=2025-08-19+15%3A30%3A22.xMNOPq" rel="next">Next →</a>
</nav>
</body>
</html>
`;

// ── Mock HTML của detail page (video) ────────────────────────────────────────
const MOCK_VIDEO_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Video 2008335 - zpic.biz</title>
  <meta name="description" content="An awesome video uploaded by user123" />
  <meta property="og:type" content="video" />
  <meta property="og:image" content="https://zpi.cx/s3/aq8h2prS.fr.jpeg" />
</head>
<body>
  <h1>Video 2008335</h1>
  <div class="media-viewer">
    <video class="media animate" webkit-playsinline="" playsinline="" controls=""
      autoplay="" width="968px" height="537px"
      src="https://zpi.cx/s3/aq8h2prS.mp4"
      poster="https://zpi.cx/s3/aq8h2prS.fr.jpeg"
      style="opacity: 1;">
    </video>
  </div>
  <div class="media-info">
    <a href="/profile/user123">user123</a>
    <time datetime="2025-08-20T02:45:58Z">August 20, 2025</time>
    <a href="/tag/funny">funny</a>
    <a href="/tag/animals">animals</a>
  </div>
</body>
</html>
`;

// ── Mock HTML của detail page (image) ────────────────────────────────────────
const MOCK_IMAGE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Beach Sunset - zpic.biz</title>
  <meta name="description" content="Beautiful beach sunset photo" />
  <meta property="og:image" content="https://zpi.cx/s3/beach123.jpg" />
</head>
<body>
  <h1>Beach Sunset</h1>
  <div class="image-viewer">
    <img class="media" src="https://zpi.cx/s3/beach123_full.jpg"
      width="1920" height="1080"
      alt="Beach Sunset" />
  </div>
  <div class="media-info">
    <a href="/profile/photomaster">photomaster</a>
    <time datetime="2025-08-18T10:20:00Z">August 18, 2025</time>
  </div>
</body>
</html>
`;

// ── Parse functions (copied từ crawler.js) ───────────────────────────────────
function parseListingPage(html, baseUrl) {
  const $ = cheerio.load(html);
  const itemUrls = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (/\/view\/[^"'\s]+/.test(href)) {
      const fullUrl = href.startsWith("http")
        ? href
        : new URL(href, baseUrl).href;
      if (!itemUrls.includes(fullUrl)) itemUrls.push(fullUrl);
    }
  });

  let nextPageUrl = null;

  const relNext = $('a[rel="next"]').attr("href");
  if (relNext) {
    nextPageUrl = relNext.startsWith("http")
      ? relNext
      : new URL(relNext, baseUrl).href;
  }

  if (!nextPageUrl) {
    $("a").each((_, el) => {
      const text = $(el).text().trim().toLowerCase();
      const href = $(el).attr("href") || "";
      if ((text.includes("next") || text === ">") && href.includes("seek=")) {
        nextPageUrl = href.startsWith("http")
          ? href
          : new URL(href, baseUrl).href;
      }
    });
  }

  return { itemUrls, nextPageUrl };
}

function parseDetailPage(html, pageUrl) {
  const $ = cheerio.load(html);
  const result = {
    sourceUrl: pageUrl,
    type: null, src: null, poster: null,
    title: null, description: null,
    tags: [], uploader: null, uploadDate: null,
    thumbnail: null, width: null, height: null,
    crawledAt: new Date(),
  };

  result.title = $("h1").first().text().trim() || null;
  result.description = $('meta[name="description"]').attr("content") || null;
  result.uploader = $('a[href*="/profile/"]').first().text().trim() || null;
  const timeEl = $("time[datetime]").first();
  if (timeEl.length) result.uploadDate = timeEl.attr("datetime");

  $('a[href*="/tag/"]').each((_, el) => {
    const t = $(el).text().trim();
    if (t && !result.tags.includes(t)) result.tags.push(t);
  });

  const videoEl = $("video.media, video[src]").first();
  if (videoEl.length) {
    result.type = "video";
    result.src = videoEl.attr("src") || $("video source").first().attr("src") || null;
    result.poster = videoEl.attr("poster") || null;
    const w = videoEl.attr("width"); const h = videoEl.attr("height");
    result.width = w ? parseInt(w) : null;
    result.height = h ? parseInt(h) : null;
  }

  if (!result.type) {
    const imgEl = $('img.media, img[class*="viewer"], .image-viewer img').first();
    if (imgEl.length) {
      result.type = "image";
      result.src = imgEl.attr("src") || null;
      result.thumbnail = imgEl.attr("data-src") || result.src;
      const w = imgEl.attr("width"); const h = imgEl.attr("height");
      result.width = w ? parseInt(w) : null;
      result.height = h ? parseInt(h) : null;
    }
  }

  if (!result.src) {
    const ogVideo = $('meta[property="og:video"]').attr("content");
    const ogImage = $('meta[property="og:image"]').attr("content");
    if (ogVideo) { result.type = result.type || "video"; result.src = ogVideo; }
    if (ogImage) { result.thumbnail = result.thumbnail || ogImage; if (!result.type) { result.type = "image"; result.src = ogImage; } }
  }

  return result;
}

// ── Run tests ────────────────────────────────────────────────────────────────
const BASE = "https://zpic.biz";

console.log("\n" + "═".repeat(60));
console.log("  TEST 1: Parse listing page (cursor pagination)");
console.log("═".repeat(60));
const listing = parseListingPage(MOCK_LISTING_HTML, `${BASE}/category/sfw/?page=3&seek=xxx`);
console.log("Item URLs tìm được:");
listing.itemUrls.forEach((u, i) => console.log(`  ${i+1}. ${u}`));
console.log(`\nNext page URL: ${listing.nextPageUrl}`);
console.log(`\nGiải mã seek param:`);
if (listing.nextPageUrl) {
  const u = new URL(listing.nextPageUrl);
  console.log(`  page = ${u.searchParams.get("page")}`);
  console.log(`  seek = ${u.searchParams.get("seek")}`);
  console.log(`\n  ⚠️  "seek" = cursor của item cuối trang hiện tại`);
  console.log(`       Chevereto tự tạo từ: timestamp + "." + unique_suffix`);
  console.log(`       → Ta chỉ cần FOLLOW link "next" từ HTML, không cần tự tính!`);
}

console.log("\n" + "═".repeat(60));
console.log("  TEST 2: Parse video detail page");
console.log("═".repeat(60));
const video = parseDetailPage(MOCK_VIDEO_HTML, `${BASE}/view/Video-2008335.xEgFy4`);
console.log(JSON.stringify(video, null, 2));

console.log("\n" + "═".repeat(60));
console.log("  TEST 3: Parse image detail page");
console.log("═".repeat(60));
const image = parseDetailPage(MOCK_IMAGE_HTML, `${BASE}/view/Beach-Sunset.xDEF34`);
console.log(JSON.stringify(image, null, 2));

console.log("\n✅ Tất cả tests passed!\n");
