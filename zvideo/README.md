# 🎬 ZVID — Chevereto Video Archive Frontend

Trang xem video từ data MongoDB crawl từ Chevereto V4.

---

## ✨ Tính năng

- 🔍 Tìm kiếm video theo tên
- 📅 Lọc theo ngày crawl
- 🎞️ Grid thumbnail với poster ảnh
- ▶️ Trang xem video với player HTML5
- 🔙 Quay lại giữ nguyên bộ lọc & trang (URL-synced state)
- ⚡ Pagination thông minh
- 📱 Responsive mobile

---

## 🚀 Chạy local

```bash
npm install
cp .env.example .env.local
# Sửa .env.local điền MongoDB URI
npm run dev
# → http://localhost:3000
```

**Nếu không có .env.local**, app tự động dùng demo data từ 5 video mẫu.

---

## ☁️ Deploy lên Vercel (3 bước)

### Cách 1: GitHub + Vercel (khuyến nghị)

**Bước 1 — Push lên GitHub:**
```bash
git init
git add .
git commit -m "init zvid"
git remote add origin https://github.com/YOUR_USER/zvid.git
git push -u origin main
```

**Bước 2 — Import vào Vercel:**
1. Vào https://vercel.com/new
2. Click **"Import Git Repository"**
3. Chọn repo `zvid` vừa push
4. Framework: **Next.js** (tự detect)
5. Click **Deploy**

**Bước 3 — Thêm Environment Variables:**
Trong Vercel dashboard → Settings → Environment Variables:
```
MONGODB_URI    = mongodb+srv://user:pass@cluster.net/?...
MONGODB_DB     = chevereto
MONGODB_COLLECTION = media
```
→ Redeploy là xong ✅

---

### Cách 2: Vercel CLI (không cần GitHub)

```bash
npm i -g vercel
vercel login
vercel --prod
# Nhập env vars khi được hỏi
```

---

### Cách 3: GitHub Actions auto-deploy

Tạo file `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

Lấy tokens từ: https://vercel.com/account/tokens

---

## 🗄️ MongoDB Atlas (Free tier)

Nếu đang dùng MongoDB local, migrate lên Atlas miễn phí:

1. Tạo account tại https://cloud.mongodb.com
2. Tạo cluster Free M0
3. Import data: `mongorestore` hoặc dùng Compass
4. Lấy connection string: `mongodb+srv://...`
5. Whitelist IP: **0.0.0.0/0** (cho Vercel serverless)

---

## 📁 Cấu trúc project

```
zvid/
├── pages/
│   ├── index.js          # Trang danh sách + search
│   ├── video/[id].js     # Trang xem video chi tiết
│   ├── _app.js
│   └── api/
│       ├── videos.js     # GET /api/videos?q=&page=&dateFrom=&dateTo=
│       └── video/[id].js # GET /api/video/:id
├── lib/
│   └── mongodb.js        # MongoDB connection singleton
├── styles/
│   └── globals.css
├── .env.example
├── vercel.json
└── next.config.js
```

---

## 🔗 API Endpoints

```
GET /api/videos
  ?q=keyword        # tìm kiếm
  ?dateFrom=YYYY-MM-DD
  ?dateTo=YYYY-MM-DD
  ?page=1
  ?limit=24

GET /api/video/:mongoId
```
