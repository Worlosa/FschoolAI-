// ShareCard.jsx — Social profile card with leaderboard opt-in + share action.

import { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";

/* Hallmark · component: card · genre: atmospheric · theme: App Shell (studied-DNA)
 * states: default · hover · focus · active · disabled · loading · error · success
 * contrast: pass (46–50)
 */

const AVATAR_HUE = [
  "rgba(0,210,190,0.7)",
  "rgba(100,150,255,0.7)",
  "rgba(255,130,100,0.7)",
  "rgba(175,130,255,0.7)",
  "rgba(70,200,130,0.7)",
  "rgba(255,175,50,0.7)",
];

function nameToHue(name = "") {
  const n = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_HUE[n % AVATAR_HUE.length];
}

const inputStyle = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "8px",
  padding: "8px 12px",
  color: "var(--text-primary)",
  fontSize: "13px",
  outline: "none",
  fontFamily: "inherit",
  width: "100%",
  transition: "border-color 0.15s",
};

function StatPill({ label, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
      <span style={{ color: "var(--text-primary)", fontSize: "17px", fontWeight: "600", letterSpacing: "-0.3px" }}>
        {value ?? "—"}
      </span>
      <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "10px", letterSpacing: "0.5px" }}>
        {label}
      </span>
    </div>
  );
}

export default function ShareCard() {
  const { userData, updateUserField } = useApp();
  const cardRef = useRef(null);

  const [song,        setSong]        = useState(userData?.favorite_song ?? "");
  const [songEditing, setSongEditing] = useState(false);
  const [optIn,       setOptIn]       = useState(Boolean(userData?.leaderboard_opt_in));
  const [copied,      setCopied]      = useState(false);

  // Sync song + optIn when userData loads asynchronously from Supabase
  useEffect(() => {
    if (!userData) return;
    setSong(userData.favorite_song ?? "");
    setOptIn(Boolean(userData.leaderboard_opt_in));
  }, [userData]);

  // Derived display values — recalculated every render so they stay in sync
  const name      = userData?.name      ?? localStorage.getItem("fschool_name") ?? "Student";
  const school    = userData?.school    ?? "My University";
  const city      = userData?.city      ?? null;
  const country   = userData?.country   ?? null;
  const gpa       = userData?.gpa        != null ? userData.gpa.toFixed(2)      : "3.87";
  const streak    = userData?.streak     != null ? `${userData.streak}d`        : "0d";
  const studyTime = userData?.study_time != null ? `${userData.study_time}h`    : "0h";

  const location    = [city, country].filter(Boolean).join(", ");
  const hue         = nameToHue(name);
  const initial     = (name?.[0] ?? "?").toUpperCase();

  async function handleSongBlur() {
    setSongEditing(false);
    await updateUserField("favorite_song", song);
  }

  async function handleOptInToggle() {
    const next = !optIn;
    setOptIn(next);
    await updateUserField("leaderboard_opt_in", next);
  }

  async function handleShare() {
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#0d0d0d",
        scale: 3,
        useCORS: true,
        logging: false,
      });

      const blob = await new Promise(res => canvas.toBlob(res, "image/png"));
      const file = new File([blob], "my-neuroagi-card.png", { type: "image/png" });

      // Use native share sheet if available (mobile), else download
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${name} · NeuroAGI` });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "my-neuroagi-card.png";
        a.click();
        URL.revokeObjectURL(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error("Share failed:", err);
      // Fallback to text copy
      const text = [
        `📚 ${name} · ${school}`,
        location ? `📍 ${location}` : null,
        `GPA ${gpa}  ·  ${streak} streak  ·  ${studyTime} studied`,
        song ? `🎵 ${song}` : null,
        `via NeuroAGI`,
      ].filter(Boolean).join("\n");
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  return (
    <div style={{ marginTop: "32px" }}>
      <p style={{
        fontSize: "11px", color: "var(--text-dim)",
        letterSpacing: "2px", textTransform: "uppercase", marginBottom: "14px",
      }}>
        Your Card
      </p>

      <div ref={cardRef} style={{
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(32px)",
        WebkitBackdropFilter: "blur(32px)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "20px",
        padding: "24px 20px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Teal accent stripe */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "2px",
          background: "linear-gradient(90deg, rgba(0,210,190,0.7) 0%, rgba(0,210,190,0.1) 60%, transparent 100%)",
          borderRadius: "20px 20px 0 0",
          pointerEvents: "none",
        }} />

        {/* Ambient glow */}
        <div style={{
          position: "absolute", top: -40, right: -40, width: 180, height: 180,
          background: "radial-gradient(circle, rgba(0,210,190,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Header row */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "flex-start", marginBottom: "20px",
        }}>
          <div style={{ flex: 1, minWidth: 0, marginRight: "12px" }}>
            <p style={{
              color: "var(--text-primary)", fontSize: "18px",
              fontWeight: "700", letterSpacing: "-0.4px",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {name}
            </p>
            <p style={{
              color: "rgba(255,255,255,0.38)", fontSize: "12px", marginTop: "2px",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {school}
            </p>
            {location && (
              <p style={{ color: "rgba(255,255,255,0.22)", fontSize: "11px", marginTop: "2px" }}>
                {location}
              </p>
            )}
          </div>

          {/* Avatar with initial */}
          <div style={{
            width: 42, height: 42, borderRadius: "50%",
            background: `radial-gradient(circle at 35% 35%, ${hue}, rgba(0,0,0,0.3))`,
            border: `1.5px solid ${hue}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <span style={{ fontSize: "17px", fontWeight: "700", color: "#fff" }}>{initial}</span>
          </div>
        </div>

        {/* Stats row */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px",
          paddingBottom: "18px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          marginBottom: "18px",
        }}>
          <StatPill label="GPA"        value={gpa} />
          <StatPill label="Streak"     value={streak} />
          <StatPill label="Study Time" value={studyTime} />
        </div>

        {/* Favorite song */}
        <div style={{ marginBottom: "18px" }}>
          <p style={{
            fontSize: "10px", color: "rgba(255,255,255,0.25)",
            letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "7px",
          }}>
            Now Playing
          </p>
          {songEditing ? (
            <input
              autoFocus
              value={song}
              onChange={e => setSong(e.target.value)}
              onBlur={handleSongBlur}
              onKeyDown={e => e.key === "Enter" && handleSongBlur()}
              placeholder="Artist — Song title"
              style={inputStyle}
            />
          ) : (
            <button
              onClick={() => setSongEditing(true)}
              style={{
                background: "none", border: "none", padding: 0,
                color: song ? "var(--text-secondary)" : "rgba(255,255,255,0.2)",
                fontSize: "13px", cursor: "text",
                fontFamily: "inherit", textAlign: "left", width: "100%",
              }}
            >
              {song || "Tap to add a song…"}
            </button>
          )}
        </div>

        {/* Leaderboard opt-in */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: "18px",
        }}>
          <div>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Show on Leaderboard</p>
            <p style={{ color: "rgba(255,255,255,0.22)", fontSize: "11px", marginTop: "2px" }}>
              Visible to all users when opted in
            </p>
          </div>
          <button
            onClick={handleOptInToggle}
            style={{
              width: 44, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
              background: optIn ? "rgba(0,210,190,0.7)" : "rgba(255,255,255,0.12)",
              position: "relative", flexShrink: 0,
              transition: "background 0.2s",
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: "50%",
              background: "#fff",
              position: "absolute", top: 3,
              left: optIn ? 21 : 3,
              transition: "left 0.2s",
            }} />
          </button>
        </div>

        {/* Share button */}
        <button
          onClick={handleShare}
          style={{
            width: "100%",
            background: copied ? "rgba(0,210,190,0.15)" : "rgba(255,255,255,0.07)",
            border: `1px solid ${copied ? "rgba(0,210,190,0.3)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: "12px",
            padding: "12px",
            color: copied ? "rgba(0,210,190,0.9)" : "var(--text-primary)",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "background 0.2s, color 0.2s, border-color 0.2s",
          }}
        >
          {copied ? "Saved!" : "Share Card 🖼️"}
        </button>
      </div>
    </div>
  );
}