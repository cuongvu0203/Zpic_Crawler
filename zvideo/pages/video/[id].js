import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import Head from "next/head";

function formatDate(str) {
  if (!str) return "—";
  try {
    return new Date(str).toLocaleString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return str; }
}

export default function VideoDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/video/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => { setVideo(data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [id]);

  const goBack = () => {
    // Giữ lại search state (đã được lưu trong URL của trang trước)
    router.back();
  };

  return (
    <>
      <Head>
        <title>{video?.title || "Video"} — ZVID</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="header">
        <div className="logo" style={{ cursor: "pointer" }} onClick={() => router.push("/")}>
          Z<span style={{ color: "var(--accent2)" }}>V</span>ID
        </div>
      </header>

      <div className="detail-wrap">
        <button className="back-btn" onClick={goBack}>
          ← Quay lại danh sách
        </button>

        {loading && (
          <div style={{ color: "var(--muted)", padding: "4rem 0", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
            Đang tải video...
          </div>
        )}

        {error && (
          <div style={{ color: "var(--accent2)", padding: "4rem 0", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⚠️</div>
            {error}
          </div>
        )}

        {video && (
          <>
            <div className="video-player">
              <video
                controls
                autoPlay
                playsInline
                poster={video.poster}
                key={video.src}
                style={{ width: "100%", display: "block", maxHeight: "75vh" }}
              >
                <source src={video.src} type="video/mp4" />
                Trình duyệt không hỗ trợ video tag.
              </video>
            </div>

            <div className="video-meta">
              <h1 className="video-title">{video.title || "Untitled"}</h1>

              <div className="video-info-row">
                <span>📅 {formatDate(video.crawledAt)}</span>
                {video.uploader && <span>👤 {video.uploader}</span>}
                {video.width && video.height && (
                  <span>📐 {video.width}×{video.height}</span>
                )}
                {video.sourceUrl && (
                  <a href={video.sourceUrl} target="_blank" rel="noopener noreferrer">
                    Nguồn gốc ↗
                  </a>
                )}
              </div>

              {video.description && video.description !== `Watch video: ${video.title}` && (
                <p className="video-desc">{video.description}</p>
              )}

              {video.tags && video.tags.length > 0 && (
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                  {video.tags.map((t) => (
                    <span
                      key={t}
                      style={{
                        fontSize: "0.75rem",
                        background: "var(--surface2)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius)",
                        padding: "0.2rem 0.6rem",
                        color: "var(--muted)",
                      }}
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* Direct URLs */}
              <div
                style={{
                  marginTop: "1.5rem",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "1rem",
                  fontSize: "0.78rem",
                  color: "var(--muted)",
                  fontFamily: "monospace",
                }}
              >
                <div style={{ marginBottom: "0.5rem" }}>
                  <span style={{ color: "var(--accent)", marginRight: "0.5rem" }}>▶ src:</span>
                  <a
                    href={video.src}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--text)", wordBreak: "break-all" }}
                  >
                    {video.src}
                  </a>
                </div>
                {video.poster && (
                  <div>
                    <span style={{ color: "var(--accent2)", marginRight: "0.5rem" }}>🖼 poster:</span>
                    <a
                      href={video.poster}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--text)", wordBreak: "break-all" }}
                    >
                      {video.poster}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
