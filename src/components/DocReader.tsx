// DocReader.tsx — YouLearn Phase 1: document reader with AI summary + gold highlights.
// Receives a file object (already processed or freshly processed) and renders:
//   • Back nav  • AI Summary section  • Key points  • Full extracted text with highlights
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../api/supabase";

// ── Highlight the text: wrap exact-match excerpts in a <mark> ────────────────
function HighlightedText({
  text,
  highlights,
}: {
  text: string;
  highlights: string[];
}) {
  if (!highlights?.length) {
    return (
      <p style={{ whiteSpace: "pre-wrap", lineHeight: "1.85", color: "var(--text-primary)", fontSize: "15px", margin: 0 }}>
        {text}
      </p>
    );
  }

  // Build a regex from the highlights, escaping special chars
  const escaped = highlights
    .filter(h => h?.trim())
    .map(h => h.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!escaped.length) {
    return (
      <p style={{ whiteSpace: "pre-wrap", lineHeight: "1.85", color: "var(--text-primary)", fontSize: "15px", margin: 0 }}>
        {text}
      </p>
    );
  }

  const pattern = new RegExp(`(${escaped.join("|")})`, "g");
  const parts = text.split(pattern);

  const hlSet = new Set(highlights.map(h => h.trim().toLowerCase()));

  return (
    <p style={{ whiteSpace: "pre-wrap", lineHeight: "1.85", color: "var(--text-primary)", fontSize: "15px", margin: 0 }}>
      {parts.map((part, i) => {
        if (hlSet.has(part.trim().toLowerCase())) {
          return (
            <mark
              key={i}
              style={{
                background: "rgba(196,154,60,0.18)",
                color: "var(--text-primary)",
                borderRadius: "3px",
                padding: "1px 0",
                // Subtle underline instead of full-bg so it reads naturally
                boxShadow: "inset 0 -1.5px 0 rgba(196,154,60,0.55)",
              }}
            >
              {part}
            </mark>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}

// ── DocReader ─────────────────────────────────────────────────────────────────
interface DocFile {
  id: string;
  name: string;
  fileType?: string;
  storagePath?: string;
  summary?: string | null;
  highlights?: string[] | null;
  processedAt?: string | null;
}

interface Props {
  file: DocFile;
  onBack: () => void;
}

export default function DocReader({ file, onBack }: Props) {
  const [contentText, setContentText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true); // summary section

  const fetchContent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("files")
        .select("content_text")
        .eq("id", file.id)
        .maybeSingle();
      if (err) throw new Error(err.message);
      setContentText(data?.content_text ?? "");
    } catch (e: any) {
      setError(e.message || "Couldn't load document.");
    } finally {
      setLoading(false);
    }
  }, [file.id]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const fileExt = file.fileType?.toUpperCase() ?? file.name?.split(".").pop()?.toUpperCase() ?? "DOC";

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      {/* ── Sticky header ───────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: "12px",
        marginBottom: "28px",
      }}>
        <button
          onClick={onBack}
          aria-label="Back to files"
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--text-secondary)", padding: "6px",
            borderRadius: "8px", display: "flex", alignItems: "center",
            flexShrink: 0,
            transition: "background 0.12s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
          onMouseLeave={e => (e.currentTarget.style.background = "none")}
        >
          {/* ← arrow */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{
            fontFamily: "'Fraunces', serif",
            fontSize: "20px", fontWeight: "600",
            color: "var(--text-primary)",
            letterSpacing: "-0.2px",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            margin: 0,
          }}>
            {file.name}
          </h1>
        </div>
        <span style={{
          fontSize: "10px", fontWeight: "700", letterSpacing: "0.6px",
          textTransform: "uppercase",
          padding: "3px 8px", borderRadius: "5px",
          background: "rgba(196,154,60,0.1)", color: "#C49A3C",
          border: "1px solid rgba(196,154,60,0.22)",
          flexShrink: 0,
        }}>
          {fileExt}
        </span>
      </div>

      {/* ── AI Summary ──────────────────────────────────────────────────────── */}
      {file.summary && (
        <section style={{ marginBottom: "28px" }}>
          <button
            onClick={() => setExpanded(v => !v)}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              background: "none", border: "none", cursor: "pointer",
              padding: 0, fontFamily: "inherit", marginBottom: "12px", width: "100%",
            }}
          >
            <span style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "15px", fontWeight: "600",
              color: "#C49A3C",
              letterSpacing: "-0.1px",
            }}>
              AI Summary
            </span>
            <svg
              width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="#C49A3C" strokeWidth="2.5"
              strokeLinecap="round"
              style={{ transition: "transform 0.18s", transform: expanded ? "rotate(0deg)" : "rotate(-90deg)", flexShrink: 0 }}
            >
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>

          {expanded && (
            <div style={{
              borderLeft: "2px solid rgba(196,154,60,0.35)",
              paddingLeft: "16px",
            }}>
              <p style={{
                fontSize: "14px", lineHeight: "1.7",
                color: "rgba(245,245,245,0.82)",
                margin: 0,
              }}>
                {file.summary}
              </p>
            </div>
          )}
        </section>
      )}

      {/* ── Key highlights list ──────────────────────────────────────────────── */}
      {file.highlights?.length ? (
        <section style={{ marginBottom: "32px" }}>
          <h2 style={{
            fontSize: "11px", fontWeight: "700",
            letterSpacing: "0.7px", textTransform: "uppercase",
            color: "rgba(255,255,255,0.28)", marginBottom: "12px", margin: "0 0 12px",
          }}>
            Key Points
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
            {file.highlights.map((h, i) => (
              <li key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <span style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: "#C49A3C", flexShrink: 0, marginTop: "7px",
                }} />
                <p style={{ fontSize: "13px", lineHeight: "1.6", color: "rgba(245,245,245,0.78)", margin: 0 }}>
                  {h}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── Separator ───────────────────────────────────────────────────────── */}
      {(file.summary || file.highlights?.length) && (
        <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.07)", marginBottom: "28px" }} />
      )}

      {/* ── Document content ─────────────────────────────────────────────────── */}
      <section style={{ flex: 1 }}>
        <h2 style={{
          fontSize: "11px", fontWeight: "700",
          letterSpacing: "0.7px", textTransform: "uppercase",
          color: "rgba(255,255,255,0.28)", margin: "0 0 16px",
        }}>
          Document Content
        </h2>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "24px 0", color: "var(--text-dim)", fontSize: "14px" }}>
            <span style={{
              width: 16, height: 16, borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.12)",
              borderTopColor: "#C49A3C",
              animation: "spin 0.7s linear infinite",
              display: "inline-block", flexShrink: 0,
            }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            Loading document…
          </div>
        ) : error ? (
          <div style={{
            padding: "20px", borderRadius: "12px",
            background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)",
            color: "rgba(255,100,90,0.85)", fontSize: "13px",
          }}>
            {error}
            <button
              onClick={fetchContent}
              style={{
                marginLeft: "12px", background: "none", border: "none",
                color: "#C49A3C", cursor: "pointer", fontSize: "13px",
                fontFamily: "inherit", textDecoration: "underline",
              }}
            >
              Retry
            </button>
          </div>
        ) : !contentText ? (
          <p style={{ color: "var(--text-dim)", fontSize: "14px" }}>
            No text content found in this document.
          </p>
        ) : (
          <div style={{
            maxWidth: "68ch",
            fontFamily: "var(--font-sans)",
          }}>
            <HighlightedText
              text={contentText}
              highlights={file.highlights ?? []}
            />
          </div>
        )}
      </section>
    </div>
  );
}
