// DocReader.tsx — Full-screen reader view for an uploaded/synced course file.
import { useState } from "react";

interface DocFile {
  id?: string;
  name?: string;
  file_type?: string;
  summary?: string;
  highlights?: string[];
  content_text?: string;
  source_url?: string;
  storage_path?: string;
  processedAt?: string;
}

interface Props {
  file: DocFile;
  onBack: () => void;
}

export default function DocReader({ file, onBack }: Props) {
  const [tab, setTab] = useState<"summary" | "content">("summary");

  const hasSummary  = Boolean(file.summary);
  const hasContent  = Boolean(file.content_text);
  const highlights  = Array.isArray(file.highlights) ? file.highlights : [];

  return (
    <div style={{ fontFamily: "var(--font-sans)" }}>
      {/* Back button + title */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <button
          onClick={onBack}
          style={{
            background: "none", border: "none", color: "var(--text-secondary)",
            fontSize: "14px", cursor: "pointer", padding: 0, fontFamily: "inherit",
          }}
        >
          ← Back
        </button>
        <h2 style={{
          fontSize: "17px", fontWeight: "600", color: "var(--text-primary)",
          letterSpacing: "-0.2px", margin: 0, overflow: "hidden",
          textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {file.name ?? "Document"}
        </h2>
      </div>

      {/* Tab bar */}
      {(hasSummary || hasContent) && (
        <div style={{
          display: "flex", gap: "6px", marginBottom: "18px",
          background: "rgba(255,255,255,0.04)", border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-btn)", padding: "4px",
        }}>
          {(["summary", "content"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                background: tab === t ? "var(--color-surface-hover)" : "transparent",
                border:     tab === t ? "1px solid var(--color-border-strong)" : "1px solid transparent",
                borderRadius: "9px", padding: "8px",
                color:      tab === t ? "var(--text-primary)" : "var(--text-secondary)",
                fontSize: "13px", fontWeight: tab === t ? "600" : "400",
                cursor: "pointer", fontFamily: "inherit",
                transition: "all var(--dur-fast) var(--ease-apple)",
              }}
            >
              {t === "summary" ? "AI Summary" : "Full Text"}
            </button>
          ))}
        </div>
      )}

      {/* Summary tab */}
      {tab === "summary" && (
        <div style={{
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-card)", padding: "20px 22px",
        }}>
          {hasSummary ? (
            <>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.75", marginBottom: highlights.length ? "18px" : 0 }}>
                {file.summary}
              </p>
              {highlights.length > 0 && (
                <>
                  <p style={{ color: "var(--text-dim)", fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "10px" }}>
                    Key Highlights
                  </p>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                    {highlights.map((h, i) => (
                      <li key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                        <span style={{ color: "var(--text-dim)", fontSize: "13px", flexShrink: 0, marginTop: "1px" }}>·</span>
                        <span style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.65" }}>{h}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          ) : (
            <p style={{ color: "var(--text-dim)", fontSize: "14px" }}>
              No summary available yet. Re-upload the file to generate one.
            </p>
          )}
        </div>
      )}

      {/* Full text tab */}
      {tab === "content" && (
        <div style={{
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-card)", padding: "20px 22px",
        }}>
          {hasContent ? (
            <pre style={{
              color: "var(--text-secondary)", fontSize: "13px", lineHeight: "1.8",
              whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0,
              fontFamily: "inherit",
            }}>
              {file.content_text}
            </pre>
          ) : (
            <p style={{ color: "var(--text-dim)", fontSize: "14px" }}>
              No extracted text available.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
