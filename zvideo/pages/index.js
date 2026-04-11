import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

const PAGE_SIZE = 24;
const FEED_SIZE = 8;

function formatDate(str) {
  if (!str) return "—";
  try {
    return new Date(str).toLocaleDateString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  } catch { return str; }
}

// ─────────────────── SKELETON (desktop) ───────────────────────

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

// ─────────────────── VIDEO CARD (desktop) ─────────────────────

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

// ─────────────────── DESKTOP GRID ─────────────────────────────

function DesktopGrid() {
  const router = useRouter();
  const searchTimer = useRef(null);

  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const [videos, setVideos] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!router.isReady) return;
    const { q: rq = "", dateFrom: rdf = "", dateTo: rdt = "", page: rp = "1" } = router.query;
    setQ(rq);
    setDateFrom(rdf);
    setDateTo(rdt);
    setPage(parseInt(rp) || 1);
  }, [router.isReady]);

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
    const qp = {};
    if (q) qp.q = q;
    if (dateFrom) qp.dateFrom = dateFrom;
    if (dateTo) qp.dateTo = dateTo;
    if (page > 1) qp.page = page;
    router.replace({ pathname: "/", query: qp }, undefined, { shallow: true });
  }, [q, dateFrom, dateTo, page, router.isReady]);

  const handleSearch = (val) => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setQ(val); setPage(1); }, 380);
  };

  const handleDateFrom = (val) => { setDateFrom(val); setPage(1); };
  const handleDateTo = (val) => { setDateTo(val); setPage(1); };

  const clearFilters = () => {
    setQ(""); setDateFrom(""); setDateTo(""); setPage(1);
    document.getElementById("search-input").value = "";
  };

  const hasFilter = q || dateFrom || dateTo;

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
      <header className="header">
        <div className="logo">
          <img src="/img/logo.png" alt="Zpic.Biz" />
        </div>
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
          <input className="date-input" type="date" value={dateFrom} onChange={(e) => handleDateFrom(e.target.value)} title="Từ ngày" />
          <input className="date-input" type="date" value={dateTo} onChange={(e) => handleDateTo(e.target.value)} title="Đến ngày" />
        </div>
      </header>

      <div className="stats-bar">
        <span>
          {loading ? "Đang tải..." : (
            <><span className="stats-count">{total.toLocaleString()}</span> video{hasFilter && " (đã lọc)"}</>
          )}
        </span>
        {hasFilter && <button className="clear-btn" onClick={clearFilters}>✕ Xóa bộ lọc</button>}
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
                <VideoCard key={v._id} video={v} onClick={(vid) => router.push(`/video/${vid._id}`)} index={i} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button className="page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>←</button>
                {pageNums().map((n, i) =>
                  n === "…" ? (
                    <span key={`e${i}`} style={{ color: "var(--muted)", padding: "0 4px" }}>…</span>
                  ) : (
                    <button key={n} className={`page-btn${n === page ? " active" : ""}`} onClick={() => setPage(n)}>{n}</button>
                  )
                )}
                <button className="page-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>→</button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ─────────────────── MOBILE FEED (TikTok-style) ───────────────

function MobileFeed() {
  const router = useRouter();

  const [videos, setVideos] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [initLoading, setInitLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [showSearch, setShowSearch] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [muted, setMuted] = useState(true);

  const itemRefs = useRef([]);
  const videoRefs = useRef([]);
  const sentinelRef = useRef(null);
  const playObserver = useRef(null);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const mutedRef = useRef(true);
  const searchTimer = useRef(null);

  // Khởi tạo feed
  useEffect(() => {
    fetch(`/api/videos?page=1&limit=${FEED_SIZE}`)
      .then((r) => r.json())
      .then((data) => {
        const vids = data.videos || [];
        setVideos(vids);
        hasMoreRef.current = vids.length === FEED_SIZE;
        setHasMore(hasMoreRef.current);
        setInitLoading(false);
      })
      .catch(() => setInitLoading(false));
  }, []);

  // IntersectionObserver: tự phát video khi vào khung hình
  useEffect(() => {
    if (videos.length === 0) return;

    if (!playObserver.current) {
      playObserver.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const idx = parseInt(entry.target.dataset.feedIndex ?? "-1");
            const vid = videoRefs.current[idx];
            if (!vid) return;
            if (entry.isIntersecting) {
              vid.muted = mutedRef.current;
              vid.play().catch(() => {});
            } else {
              vid.pause();
            }
          });
        },
        { threshold: 0.65 }
      );
    }

    const obs = playObserver.current;
    itemRefs.current.forEach((el) => { if (el) obs.observe(el); });

    return () => {}; // không disconnect, chỉ clean up khi unmount
  }, [videos]);

  // Cleanup khi unmount
  useEffect(() => {
    return () => { playObserver.current?.disconnect(); };
  }, []);

  // Observer cho sentinel (load thêm)
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMoreRef.current && !loadingMoreRef.current) {
          doLoadMore();
        }
      },
      { rootMargin: "200px" }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [videos.length]);

  const doLoadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);

    const nextPage = pageRef.current + 1;
    try {
      const res = await fetch(`/api/videos?page=${nextPage}&limit=${FEED_SIZE}`);
      const data = await res.json();
      const newVids = data.videos || [];
      if (newVids.length > 0) {
        setVideos((prev) => [...prev, ...newVids]);
        pageRef.current = nextPage;
        hasMoreRef.current = newVids.length === FEED_SIZE;
        setHasMore(hasMoreRef.current);
      } else {
        hasMoreRef.current = false;
        setHasMore(false);
      }
    } catch {}

    loadingMoreRef.current = false;
    setLoadingMore(false);
  }, []);

  const toggleMuted = () => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    videoRefs.current.forEach((v) => { if (v) v.muted = next; });
  };

  const handleTap = (idx) => {
    const vid = videoRefs.current[idx];
    if (!vid) return;
    if (vid.paused) vid.play().catch(() => {});
    else vid.pause();
  };

  const handleSearchInput = (val) => {
    setSearchQ(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      if (!val.trim()) { setSearchResults([]); return; }
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/videos?q=${encodeURIComponent(val)}&limit=20`);
        const data = await res.json();
        setSearchResults(data.videos || []);
      } catch {}
      setSearchLoading(false);
    }, 400);
  };

  const closeSearch = () => {
    setShowSearch(false);
    setSearchQ("");
    setSearchResults([]);
  };

  if (initLoading) {
    return (
      <div className="feed-loading-screen">
        <div className="feed-spinner" />
      </div>
    );
  }

  return (
    <div className="mobile-root">
      {/* Top bar */}
      <div className="mobile-topbar">
        <img src="/img/logo.png" className="mobile-logo" alt="Zpic" />
        <div className="mobile-topbar-actions">
          <button className="mobile-icon-btn" onClick={toggleMuted} title={muted ? "Bật âm thanh" : "Tắt âm thanh"}>
            {muted ? (
              <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                <path d="M3.63 3.63a.996.996 0 000 1.41L7.29 8.7 7 9H4c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71v-4.17l4.18 4.18c-.49.37-1.02.68-1.6.91-.36.15-.58.53-.58.92 0 .72.73 1.18 1.39.91.8-.33 1.55-.77 2.22-1.31l1.34 1.34a.996.996 0 101.41-1.41L5.05 3.63c-.39-.39-1.02-.39-1.42 0zM19 12c0 .82-.15 1.61-.41 2.34l1.53 1.53c.56-1.17.88-2.48.88-3.87 0-3.83-2.4-7.11-5.78-8.4-.59-.23-1.22.23-1.22.86v.19c0 .38.25.71.61.85C17.18 6.54 19 9.06 19 12zm-8.71-6.29l-.17.17L12 7.76V6.41c0-.89-1.08-1.33-1.71-.7zM16.5 12A4.5 4.5 0 0014 7.97v1.79l2.48 2.48c.01-.08.02-.16.02-.24z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              </svg>
            )}
          </button>
          <button className="mobile-icon-btn" onClick={() => setShowSearch(true)} title="Tìm kiếm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="22" height="22">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>
      </div>

      {/* Feed */}
      <div className="feed-container">
        {videos.map((v, i) => (
          <div
            key={v._id}
            className="feed-item"
            data-feed-index={i}
            ref={(el) => { itemRefs.current[i] = el; }}
            onClick={() => handleTap(i)}
          >
            <video
              ref={(el) => { videoRefs.current[i] = el; }}
              className="feed-video"
              src={v.src}
              poster={v.poster || undefined}
              playsInline
              muted
              loop
              preload="metadata"
            />
            {/* Gradient overlay + info */}
            <div className="feed-overlay">
              <div className="feed-info">
                <div className="feed-title">{v.title || "Untitled"}</div>
                <div className="feed-meta">
                  <span>📅 {formatDate(v.crawledAt)}</span>
                  {v.sourceUrl && (
                    <a
                      href={v.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="feed-source-link"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Nguồn ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Sentinel để trigger load thêm */}
        <div ref={sentinelRef} className="feed-sentinel">
          {loadingMore && <div className="feed-spinner feed-spinner-sm" />}
          {!hasMore && videos.length > 0 && <span className="feed-end-text">— Hết video —</span>}
        </div>
      </div>

      {/* Search overlay */}
      {showSearch && (
        <div className="search-overlay-mobile">
          <div className="search-overlay-header">
            <div className="search-overlay-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="soi-icon">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                autoFocus
                className="search-overlay-input"
                placeholder="Tìm kiếm video..."
                value={searchQ}
                onChange={(e) => handleSearchInput(e.target.value)}
              />
              {searchQ && (
                <button className="soi-clear" onClick={() => { setSearchQ(""); setSearchResults([]); }}>✕</button>
              )}
            </div>
            <button className="search-overlay-cancel" onClick={closeSearch}>Hủy</button>
          </div>

          <div className="search-overlay-results">
            {!searchQ && (
              <div className="soe-state">Nhập từ khoá để tìm kiếm</div>
            )}
            {searchLoading && <div className="soe-state">Đang tìm kiếm...</div>}
            {!searchLoading && searchQ && searchResults.length === 0 && (
              <div className="soe-state">Không tìm thấy kết quả nào</div>
            )}
            {searchResults.map((v) => (
              <div
                key={v._id}
                className="search-result-item"
                onClick={() => router.push(`/video/${v._id}`)}
              >
                <img
                  src={v.poster || "/placeholder.svg"}
                  className="sri-thumb"
                  onError={(e) => { e.target.src = "/placeholder.svg"; }}
                  alt={v.title}
                />
                <div className="sri-info">
                  <div className="sri-title">{v.title || "Untitled"}</div>
                  <div className="sri-date">{formatDate(v.crawledAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────── MAIN ─────────────────────────────────────

export default function Home() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <>
      <Head>
        <title>Zpic.Biz - Video Archive</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎬</text></svg>"
        />
      </Head>
      {isMobile ? <MobileFeed /> : <DesktopGrid />}
    </>
  );
}
