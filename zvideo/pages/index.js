import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

const PAGE_SIZE = 24;

function formatDate(str) {
  if (!str) return "—";
  try {
    return new Date(str).toLocaleDateString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  } catch { return str; }
}

function SkeletonGrid({ count = 12 }) {
  return (
    <div className="skeleton-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card" style={{ animationDelay: `${i * 0.05}s` }}>
          <div className="skeleton-thumb" />
          <div className="skeleton-body">
            <div className="skeleton-line" />
            <div className="skeleton-line short" />
          </div>
        </div>
      ))}
    </div>
  );
}

function VideoCard({ video, onClick, index }) {
  return (
    <div
      className="card"
      style={{ animationDelay: `${(index % 24) * 0.04}s` }}
      onClick={() => onClick(video)}
    >
      <div className="card-thumb">
        <img
          src={video.poster || "/placeholder.svg"}
          alt={video.title}
          loading="lazy"
          onError={(e) => { e.target.src = "/placeholder.svg"; }}
        />
        <div className="play-icon">
          <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
        </div>
      </div>
      <div className="card-body">
        <div className="card-title" title={video.title}>
          {video.title || "Untitled"}
        </div>
        <div className="card-date">{formatDate(video.crawledAt)}</div>
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const searchTimer = useRef(null);

  // Sync state với URL query
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const [videos, setVideos] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  // Khôi phục search state từ URL khi quay lại
  useEffect(() => {
    if (!router.isReady) return;
    const { q: rq = "", dateFrom: rdf = "", dateTo: rdt = "", page: rp = "1" } = router.query;
    setQ(rq);
    setDateFrom(rdf);
    setDateTo(rdt);
    setPage(parseInt(rp) || 1);
  }, [router.isReady]);

  // Fetch khi state thay đổi
  const fetchVideos = useCallback(async (params) => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (params.q) sp.set("q", params.q);
      if (params.dateFrom) sp.set("dateFrom", params.dateFrom);
      if (params.dateTo) sp.set("dateTo", params.dateTo);
      sp.set("page", params.page);
      sp.set("limit", PAGE_SIZE);

      const res = await fetch(`/api/videos?${sp}`);
      const data = await res.json();
      setVideos(data.videos || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    fetchVideos({ q, dateFrom, dateTo, page });
    // Sync URL
    const qp = {};
    if (q) qp.q = q;
    if (dateFrom) qp.dateFrom = dateFrom;
    if (dateTo) qp.dateTo = dateTo;
    if (page > 1) qp.page = page;
    router.replace({ pathname: "/", query: qp }, undefined, { shallow: true });
  }, [q, dateFrom, dateTo, page, router.isReady]);

  const handleSearch = (val) => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setQ(val);
      setPage(1);
    }, 380);
  };

  const handleDateFrom = (val) => { setDateFrom(val); setPage(1); };
  const handleDateTo = (val) => { setDateTo(val); setPage(1); };

  const clearFilters = () => {
    setQ(""); setDateFrom(""); setDateTo(""); setPage(1);
    document.getElementById("search-input").value = "";
  };

  const hasFilter = q || dateFrom || dateTo;

  const handleCardClick = (video) => {
    router.push(`/video/${video._id}`);
  };

  // Render page numbers
  const pageNums = () => {
    const nums = [];
    const delta = 2;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
        nums.push(i);
      } else if (nums[nums.length - 1] !== "…") {
        nums.push("…");
      }
    }
    return nums;
  };

  return (
    <>
      <Head>
        <title>ZVID — Video Archive</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎬</text></svg>" />
      </Head>

      <header className="header">
        <div className="logo">Z<span>V</span>ID</div>

        <div className="search-bar">
          <div className="search-wrap">
            <span className="search-icon">⌕</span>
            <input
              id="search-input"
              className="search-input"
              type="text"
              placeholder="Tìm kiếm video..."
              defaultValue={q}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <input
            className="date-input"
            type="date"
            value={dateFrom}
            onChange={(e) => handleDateFrom(e.target.value)}
            title="Từ ngày"
          />
          <input
            className="date-input"
            type="date"
            value={dateTo}
            onChange={(e) => handleDateTo(e.target.value)}
            title="Đến ngày"
          />
        </div>
      </header>

      <div className="stats-bar">
        <span>
          {loading ? "Đang tải..." : (
            <>
              <span className="stats-count">{total.toLocaleString()}</span> video
              {hasFilter && " (đã lọc)"}
            </>
          )}
        </span>
        {hasFilter && (
          <button className="clear-btn" onClick={clearFilters}>✕ Xóa bộ lọc</button>
        )}
      </div>

      <div className="grid-container">
        {loading ? (
          <SkeletonGrid />
        ) : videos.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📭</div>
            <div className="empty-text">Không tìm thấy video nào</div>
          </div>
        ) : (
          <>
            <div className="video-grid">
              {videos.map((v, i) => (
                <VideoCard key={v._id} video={v} onClick={handleCardClick} index={i} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="page-btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ←
                </button>
                {pageNums().map((n, i) =>
                  n === "…" ? (
                    <span key={`e${i}`} style={{ color: "var(--muted)", padding: "0 4px" }}>…</span>
                  ) : (
                    <button
                      key={n}
                      className={`page-btn${n === page ? " active" : ""}`}
                      onClick={() => setPage(n)}
                    >
                      {n}
                    </button>
                  )
                )}
                <button
                  className="page-btn"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
