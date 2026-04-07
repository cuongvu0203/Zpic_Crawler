# 🕷️ Chevereto V4 Crawler

Tool crawler dữ liệu website chạy **Chevereto V4** (ảnh/video hosting), hỗ trợ **cursor/seek pagination** và lưu vào **MongoDB**.

---

## 📦 Cài đặt

```bash
npm install
```

---

## 🚀 Cách dùng

```bash
# Crawl category SFW
node crawler.js --url "https://zpic.biz/category/sfw/"

# Crawl với MongoDB tùy chỉnh
node crawler.js \
  --url "https://zpic.biz/category/sfw/" \
  --mongo "mongodb://localhost:27017" \
  --db mydb \
  --collection videos \
  --delay 2000

# Giới hạn 100 items, chạy 5 tab song song
node crawler.js --url "https://zpic.biz/" --limit 100 --concurrency 5

# Test parser (không cần MongoDB)
node test-parse.js
```

---

## ❓ Giải thích `seek` parameter

URL pagination của Chevereto V4 trông như thế này:
```
https://zpic.biz/category/sfw/?page=3&seek=2025-08-20+02%3A45%3A58.xQZXlb
```

Decode: `seek = 2025-08-20 02:45:58.xQZXlb`

**Cấu trúc:** `TIMESTAMP.UNIQUE_SUFFIX`

```
2025-08-20 02:45:58   →  Timestamp của item cuối trang hiện tại
xQZXlb                →  Unique ID suffix (Chevereto tự tạo)
```

**Đây là cursor-based pagination (keyset/seek):**
- Server dùng seek để query: `WHERE created_at <= '2025-08-20 02:45:58' AND id_suffix < 'xQZXlb'`
- Không cần tính seek thủ công — chỉ cần **follow link "Next page"** từ HTML
- Link next page đã có sẵn trong `<a rel="next">` hoặc trong pagination block

```
┌─────────────────────────────────────────────────────────┐
│  Trang 1                                                │
│  items: [A, B, C, D, E]                                 │
│  Cursor cuối = timestamp của E + unique_id E            │
│                                                         │
│  → Next URL: ?page=2&seek=TIMESTAMP_E.ID_E              │
└─────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────┐
│  Trang 2  (bắt đầu sau E)                              │
│  items: [F, G, H, I, J]                                 │
│  Cursor cuối = timestamp của J + unique_id J            │
│                                                         │
│  → Next URL: ?page=3&seek=TIMESTAMP_J.ID_J              │
└─────────────────────────────────────────────────────────┘
```

---

## 🗄️ Schema MongoDB

```json
{
  "sourceUrl": "https://zpic.biz/view/Video-2008335.xEgFy4",
  "type": "video",
  "src": "https://zpi.cx/s3/aq8h2prS.mp4",
  "poster": "https://zpi.cx/s3/aq8h2prS.fr.jpeg",
  "thumbnail": "https://zpi.cx/s3/aq8h2prS.fr.jpeg",
  "title": "Video 2008335",
  "description": "...",
  "tags": ["funny", "animals"],
  "uploader": "user123",
  "uploadDate": "2025-08-20T02:45:58Z",
  "width": 968,
  "height": 537,
  "crawledAt": "2025-04-07T10:00:00.000Z"
}
```

---

## ⚙️ Options đầy đủ

| Option | Alias | Default | Mô tả |
|--------|-------|---------|-------|
| `--url` | `-u` | (bắt buộc) | URL bắt đầu crawl |
| `--mongo` | `-m` | `mongodb://localhost:27017` | MongoDB URI |
| `--db` | | `chevereto` | Tên database |
| `--collection` | `-c` | `media` | Tên collection |
| `--delay` | `-d` | `1500` | Delay giữa requests (ms) |
| `--limit` | `-l` | `0` | Giới hạn items (0 = vô hạn) |
| `--concurrency` | | `3` | Số tab song song |
| `--resume` | | `true` | Tiếp tục từ checkpoint |
| `--headless` | | `true` | Browser headless |

---

## 🔄 Resume / Checkpoint

Crawler tự động lưu checkpoint vào collection `_crawler_checkpoints`.  
Nếu bị gián đoạn, chạy lại với cùng `--url` là tự động tiếp tục từ trang dở.

```bash
# Lần 1: bắt đầu crawl
node crawler.js --url "https://zpic.biz/category/sfw/"
# (Ctrl+C dừng giữa chừng)

# Lần 2: tự động tiếp tục từ chỗ dừng
node crawler.js --url "https://zpic.biz/category/sfw/"
```

---

## 🛡️ Anti-ban

- Delay mặc định 1500ms giữa các requests
- User-Agent giả browser thật
- Retry tự động khi gặp lỗi 429 (rate limit)
- Bỏ qua item đã crawl (upsert by sourceUrl)
