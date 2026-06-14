// FschoolAI Founding Card — Apple iPhone 17 Pro + Cluely aesthetic
// Pure black, full-bleed, cinematic scroll, live engraving, Founder Delivery $3k tier
import { useState, useEffect, useRef } from "react";

const HERO_IMG     = "/card-group.jpg";
const TITANIUM_IMG = "/card-titanium.jpg";
const STAGE_IMG    = "/card-stage.jpg";

const COLORWAYS = [
  { id: "white",  name: "Base White",   hex: "#F5F5F0", border: "#D8D8D3", accent: "#1a1a1a", tagline: "Clean. Timeless. Iconic.",     img: "/card-white.jpg" },
  { id: "purple", name: "Royal Purple", hex: "#C8B4F0", border: "#9B7FD4", accent: "#6B3FA0", tagline: "Bold. Regal. Unforgettable.",  img: "/card-purple.jpg" },
  { id: "pink",   name: "Royal Pink",   hex: "#F0B8CC", border: "#E07898", accent: "#C04870", tagline: "Vivid. Confident. Distinct.", img: "/card-pink.jpg" },
  { id: "blue",   name: "Royal Blue",   hex: "#B4D0F0", border: "#78A8E0", accent: "#2860B0", tagline: "Sharp. Focused. Brilliant.",  img: "/card-blue.jpg" },
  { id: "green",  name: "Royal Green",  hex: "#D8ECA0", border: "#A8C870", accent: "#5A8020", tagline: "Fresh. Grounded. Alive.",      img: "/card-green.jpg" },
];

const FEATURES = [
  { eyebrow: "AI Tutor", headline: "Your tutor.\nAlways on.", body: "Priority access to your personal FschoolAI AI tutor — 24/7, for every subject, forever. Answers grounded in your actual lecture notes, not just the internet.", bg: "#000", visual: "tutor" },
  { eyebrow: "In-Class Recording", headline: "Never miss\nwhat's said.", body: "FschoolAI captures and transcribes your lectures in real time. Searchable, always there, in your own notes. Every word your professor says — yours forever.", bg: "#0a0a0a", visual: "recording" },
  { eyebrow: "Canvas Sync", headline: "Every course.\nEvery deadline.", body: "Connect your Canvas account and FschoolAI pulls every course, assignment, and deadline automatically. Your card is linked to your verified academic identity.", bg: "#000", visual: "canvas" },
  { eyebrow: "NFC Identity", headline: "Tap to connect.\nInstantly.", body: "One tap shares your full profile, Brain Card, and links with anyone. No app needed. Your entire academic identity — in a single touch.", bg: "#0a0a0a", visual: "nfc" },
  { eyebrow: "Leaderboard", headline: "Your rank.\nYour legacy.", body: "Founding members get a permanent verified badge on the FschoolAI global leaderboard. Your founding number is your identity — forever.", bg: "#000", visual: "leaderboard" },
  { eyebrow: "FST Token Wallet", headline: "Earn as\nyou learn.", body: "Every study session, every milestone — rewarded in FST tokens. Your card is your wallet. Hold, spend, and trade within the FschoolAI ecosystem.", bg: "#0a0a0a", visual: "wallet" },
  { eyebrow: "Lifetime Pro", headline: "Lifetime Pro.\nForever.", body: "Every FschoolAI Pro feature. Every future update. No subscription. No renewal. No expiry. You're in — forever.", bg: "#000", visual: "pro" },
];

const SPECS = [
  { icon: "🧠", label: "NeuroAGI Brain ID",          desc: "Your unique neural identity across the entire NeuroAGI ecosystem" },
  { icon: "🤖", label: "AI Tutor — Priority Access",  desc: "24/7 personal AI tutor grounded in your actual lecture notes" },
  { icon: "🎙️", label: "In-Class Recording",          desc: "Real-time transcription, searchable, always in your notes" },
  { icon: "📚", label: "Canvas Sync",                 desc: "Every course, assignment, and deadline — automatically synced" },
  { icon: "📡", label: "NFC Tap",                     desc: "One tap shares your full profile and Brain Card instantly" },
  { icon: "🏅", label: "Founding Member #0001–#0500", desc: "Permanently engraved founding number — only 500 exist, ever" },
  { icon: "💎", label: "FST Token Wallet",            desc: "Built-in FschoolAI token wallet — earn, hold, and spend FST" },
  { icon: "🏆", label: "Leaderboard Badge",           desc: "Verified rank badge on the FschoolAI global leaderboard" },
  { icon: "♾️", label: "Lifetime FschoolAI Pro",      desc: "Every Pro feature, every future update — forever, no subscription" },
];

/* ─── Hooks ──────────────────────────────────────────────────────────────── */
function useCountdown(targetDate) {
  const [t, setT] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    function calc() {
      const diff = new Date(targetDate) - new Date();
      if (diff <= 0) { setT({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return; }
      setT({ days: Math.floor(diff/86400000), hours: Math.floor((diff%86400000)/3600000), minutes: Math.floor((diff%3600000)/60000), seconds: Math.floor((diff%60000)/1000) });
    }
    calc(); const id = setInterval(calc, 1000); return () => clearInterval(id);
  }, [targetDate]);
  return t;
}

function useReveal(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el); return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

/* ─── Feature Visuals ────────────────────────────────────────────────────── */
function FeatureVisual({ type }) {
  const s = { borderRadius: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "20px", maxWidth: 320, width: "100%" };
  const lbl = { fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 12 };
  const row = { display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" };

  if (type === "tutor") return (
    <div style={s}>
      <div style={lbl}>AI Tutor · BIOL 201</div>
      {[{ role: "user", msg: "What's homeostasis?" }, { role: "ai", msg: "Based on your Lecture 4 notes, homeostasis is the body's mechanism for maintaining stable internal conditions — your professor used temperature regulation as the key example." }].map((m, i) => (
        <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
          <div style={{ maxWidth: "82%", background: m.role === "user" ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)", borderRadius: 12, padding: "8px 12px", fontSize: 12, color: m.role === "user" ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.55)", lineHeight: 1.55 }}>{m.msg}</div>
        </div>
      ))}
    </div>
  );
  if (type === "recording") return (
    <div style={s}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff3b30", boxShadow: "0 0 8px #ff3b30" }} />
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em" }}>REC 00:04 · COMP 101</span>
      </div>
      <div style={lbl}>Live Transcript</div>
      {["…cognitive load theory suggests working memory has limited capacity…", "…four components: phonological loop, visuospatial sketchpad…"].map((t, i) => (
        <div key={i} style={{ fontSize: 13, color: i === 0 ? "#f5f5f7" : "rgba(245,245,247,0.4)", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", lineHeight: 1.5 }}>{t}</div>
      ))}
    </div>
  );
  if (type === "canvas") return (
    <div style={s}>
      <div style={lbl}>Canvas · 3 Courses</div>
      {[{ course: "COMP 101", item: "Problem Set 4", due: "Tomorrow", color: "#ff3b30" }, { course: "BIOL 201", item: "Lab Report", due: "May 28", color: "#ff9500" }, { course: "MATH 150", item: "Midterm Review", due: "Jun 2", color: "#30d158" }].map((a, i) => (
        <div key={i} style={{ ...row }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: a.color, flexShrink: 0 }} />
          <div style={{ flex: 1 }}><div style={{ fontSize: 13, color: "#f5f5f7", fontWeight: 500 }}>{a.item}</div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{a.course}</div></div>
          <div style={{ fontSize: 12, color: a.color }}>{a.due}</div>
        </div>
      ))}
    </div>
  );
  if (type === "nfc") return (
    <div style={{ ...s, textAlign: "center", padding: "32px 20px" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>📲</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "#f5f5f7", marginBottom: 6 }}>Tap to share</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>Brain Card · LinkMe Profile · NeuroAGI ID</div>
    </div>
  );
  if (type === "leaderboard") return (
    <div style={s}>
      <div style={lbl}>Global Leaderboard</div>
      {[{ rank: 1, name: "You", score: "847h", founding: "#0042" }, { rank: 2, name: "Pratik S.", score: "812h", founding: "#0089" }, { rank: 3, name: "Shreya M.", score: "798h", founding: "#0156" }].map((u) => (
        <div key={u.rank} style={{ ...row, borderBottom: u.rank < 3 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", width: 18 }}>#{u.rank}</div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 13, color: u.rank === 1 ? "#f5f5f7" : "rgba(255,255,255,0.6)", fontWeight: u.rank === 1 ? 600 : 400 }}>{u.name}</div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>Founding {u.founding}</div></div>
          <div style={{ fontSize: 13, color: u.rank === 1 ? "#a78bfa" : "rgba(255,255,255,0.35)" }}>{u.score}</div>
        </div>
      ))}
    </div>
  );
  if (type === "wallet") return (
    <div style={s}>
      <div style={lbl}>FST Wallet</div>
      <div style={{ fontSize: 32, fontWeight: 700, color: "#f5f5f7", letterSpacing: "-1px", marginBottom: 4 }}>1,247 <span style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", fontWeight: 400 }}>FST</span></div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>+84 FST this week</div>
      {[{ label: "Study session · 2h", amount: "+12 FST" }, { label: "Assignment completed", amount: "+25 FST" }, { label: "Streak bonus · 7 days", amount: "+50 FST" }].map((tx, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13 }}>
          <span style={{ color: "rgba(255,255,255,0.5)" }}>{tx.label}</span><span style={{ color: "#30d158", fontWeight: 600 }}>{tx.amount}</span>
        </div>
      ))}
    </div>
  );
  if (type === "pro") return (
    <div style={s}>
      <div style={lbl}>FschoolAI Pro · Lifetime</div>
      {["AI Tutor — Priority", "In-class Recording", "Smart Study Planner", "Study Rooms", "Leaderboard Badge", "FST Token Wallet"].map((f, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
          <span style={{ color: "#30d158" }}>✓</span> {f}
        </div>
      ))}
      <div style={{ marginTop: 12, fontSize: 12, color: "rgba(255,255,255,0.25)" }}>No subscription. No renewal. Forever.</div>
    </div>
  );
  return null;
}

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function Card() {
  const [selected, setSelected]   = useState(0);
  const [engraving, setEngraving] = useState("");
  const [isFounder, setFounder]   = useState(false);
  const [scrolled, setScrolled]   = useState(false);
  const [formData, setFormData]   = useState({ name: "", university: "", email: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSub]      = useState(false);
  const countdown = useCountdown("2026-06-30T23:59:59");

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.name || !formData.email) return;
    setSub(true);
    await new Promise(r => setTimeout(r, 1400));
    setSubmitted(true); setSub(false);
  }

  const cw = COLORWAYS[selected];
  const inp = { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "12px", padding: "14px 16px", color: "#f5f5f7", fontSize: "15px", outline: "none", fontFamily: "inherit", transition: "border-color 0.15s" };

  return (
    <div style={{ background: "#000", minHeight: "100dvh", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif", color: "#f5f5f7", overflowX: "hidden" }}>

      {/* ── HEADER — Apple product nav, taller, frosted glass on scroll ── */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
        height: "52px",
        background: scrolled ? "rgba(0,0,0,0.88)" : "transparent",
        backdropFilter: scrolled ? "blur(24px) saturate(180%)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(24px) saturate(180%)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.07)" : "none",
        transition: "background 0.35s, border-color 0.35s",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px",
      }}>
        <a href="/" style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", textDecoration: "none", display: "flex", alignItems: "center", gap: "3px", minWidth: 90 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          FschoolAI
        </a>
        <span style={{ fontSize: "14px", fontWeight: "600", letterSpacing: "-0.3px", color: scrolled ? "rgba(255,255,255,0.88)" : "transparent", transition: "color 0.35s", position: "absolute", left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap" }}>
          Founding Card
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "18px", minWidth: 90, justifyContent: "flex-end" }}>
          <a href="#features" style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", textDecoration: "none" }}>Explore</a>
          <a href="#apply" style={{ fontSize: "13px", fontWeight: "600", color: "#000", background: "#f5f5f7", borderRadius: "980px", padding: "6px 16px", textDecoration: "none" }}>Apply</a>
        </div>
      </header>

      {/* ── HERO ── */}
      <section style={{ position: "relative", height: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", overflow: "hidden" }}>
        <img src={HERO_IMG} alt="FschoolAI Founding Card" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 45%" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, transparent 30%, transparent 45%, rgba(0,0,0,0.65) 72%, rgba(0,0,0,0.98) 100%)" }} />
        <div style={{ position: "relative", zIndex: 2, textAlign: "center", padding: "0 24px 72px", maxWidth: 520 }}>
          <p style={{ fontSize: "12px", fontWeight: "600", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.42)", marginBottom: "12px" }}>Founding Edition · Only 500</p>
          <h1 style={{ fontSize: "clamp(40px, 10vw, 64px)", fontWeight: "700", letterSpacing: "-2px", lineHeight: 1.02, marginBottom: "12px" }}>FschoolAI<br />Founding Card</h1>
          <p style={{ fontSize: "17px", color: "rgba(255,255,255,0.48)", marginBottom: "32px", letterSpacing: "-0.3px" }}>Free for founding members. Ships Q4 2026.</p>
          <a href="#colorway" style={{ display: "inline-block", background: "#f5f5f7", color: "#000", fontSize: "16px", fontWeight: "650", letterSpacing: "-0.3px", padding: "15px 42px", borderRadius: "980px", textDecoration: "none" }}>Apply for your card</a>
        </div>
        <div style={{ position: "absolute", bottom: "24px", left: "50%", transform: "translateX(-50%)", opacity: 0.28, zIndex: 2, animation: "bounceY 2s ease-in-out infinite" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
        </div>
      </section>

      {/* ── COLORWAY PICKER — Apple iPhone style, selected card lights up, others black out ── */}
      <section id="colorway" data-colorway-section style={{ padding: "72px 24px 0", textAlign: "center" }}>
        <p style={{ fontSize: "11px", fontWeight: "600", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.32)", marginBottom: "10px" }}>Colorway</p>
        <h2 style={{ fontSize: "clamp(28px, 6vw, 38px)", fontWeight: "700", letterSpacing: "-1px", marginBottom: "4px" }}>
          {isFounder ? "Titanium Black" : cw.name}
        </h2>
        <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.36)", marginBottom: "32px", letterSpacing: "-0.2px" }}>
          {isFounder ? "Exclusive to Founder Delivery. Not available separately." : cw.tagline}
        </p>

        {/* Swatches */}
        <div style={{ display: "flex", justifyContent: "center", gap: "14px", marginBottom: "44px" }}>
          {COLORWAYS.map((c, i) => (
            <button key={c.id} onClick={() => { setSelected(i); setFounder(false); }} title={c.name} style={{
              width: "28px", height: "28px", borderRadius: "50%", background: c.hex,
              border: "none", padding: 0, cursor: "pointer",
              outline: (!isFounder && selected === i) ? "2px solid rgba(255,255,255,0.55)" : "2px solid transparent",
              outlineOffset: "3px",
              transform: (!isFounder && selected === i) ? "scale(1.18)" : "scale(1)",
              boxShadow: (!isFounder && selected === i) ? `0 0 16px ${c.hex}80` : "none",
              transition: "all 0.2s ease",
            }} />
          ))}
        </div>

        {/* Card group photo — dark overlay on all, selected colorway glows through */}
        <div style={{ position: "relative", width: "100%", maxWidth: 520, margin: "0 auto" }}>
          <img src={isFounder ? TITANIUM_IMG : HERO_IMG} alt="FschoolAI Cards" style={{ width: "100%", display: "block" }} />
          {!isFounder && (
            <>
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.58)", pointerEvents: "none", transition: "opacity 0.4s" }} />
              <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 38% 72% at ${18 + selected * 16}% 62%, ${cw.hex}95 0%, transparent 60%)`, mixBlendMode: "screen", pointerEvents: "none", transition: "background 0.5s ease" }} />
            </>
          )}
        </div>
      </section>

      {/* ── ENGRAVING — Apple side-by-side layout ── */}
      <EngravingSection engraving={engraving} setEngraving={setEngraving} cw={cw} isFounder={isFounder} />

      {/* ── COUNTDOWN ── */}
      <CountdownSection countdown={countdown} />

      {/* ── MANIFESTO ── */}
      <ManifestoSection />

      {/* ── FEATURES ── */}
      <div id="features">
        {FEATURES.map((f, i) => <FeatureSection key={i} feature={f} />)}
      </div>

      {/* ── SPECS ── */}
      <SpecSection />

      {/* ── COUNTER ── */}
      <CounterSection />

      {/* ── STEVE JOBS "ONE MORE THING" ── */}
      <OneMoreThingSection isFounder={isFounder} setFounder={setFounder} />

      {/* ── SPECIALIST ── */}
      <SpecialistSection />

      {/* ── APPLY — Apple checkout flow ── */}
      <ApplySection
        cw={cw} isFounder={isFounder} engraving={engraving}
        setFounder={setFounder} formData={formData} setFormData={setFormData}
        submitted={submitted} submitting={submitting} handleSubmit={handleSubmit}
        selected={selected} setSelected={setSelected} inp={inp}
      />

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "40px 24px", textAlign: "center" }}>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.18)", lineHeight: 2 }}>
          © 2026 FschoolAI. All rights reserved.<br />
          The FschoolAI Founding Card is a physical NFC card. Not a financial product.
        </p>
      </footer>

      <style>{`
        @keyframes bounceY { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(8px)} }
        @keyframes slowZoom { from{transform:scale(1)} to{transform:scale(1.05)} }
        * { box-sizing:border-box; margin:0; padding:0; }
        html { scroll-behavior:smooth; }
        input::placeholder { color:rgba(255,255,255,0.22); }
        input:-webkit-autofill { -webkit-box-shadow:0 0 0 1000px rgba(255,255,255,0.05) inset !important; -webkit-text-fill-color:#f5f5f7 !important; }
        ::-webkit-scrollbar { width:0; }
      `}</style>
    </div>
  );
}

/* ─── Engraving — Apple side-by-side ────────────────────────────────────── */
function EngravingSection({ engraving, setEngraving, cw, isFounder }) {
  const [ref, visible] = useReveal(0.1);
  return (
    <section ref={ref} style={{ padding: "80px 24px", borderTop: "1px solid rgba(255,255,255,0.06)", opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)", transition: "opacity 0.8s, transform 0.8s" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "52px" }}>
          <p style={{ fontSize: "11px", fontWeight: "600", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.32)", marginBottom: "10px" }}>Engraving</p>
          <h2 style={{ fontSize: "clamp(28px, 6vw, 42px)", fontWeight: "700", letterSpacing: "-1px", marginBottom: "8px" }}>Make it yours.</h2>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.36)", letterSpacing: "-0.2px" }}>Laser-engraved on the back. Up to 30 characters.</p>
        </div>

        {/* Side-by-side: card LEFT, input RIGHT */}
        <div style={{ display: "flex", gap: "clamp(32px, 6vw, 72px)", alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
          {/* Card preview */}
          <div style={{ position: "relative", width: "clamp(180px, 38vw, 260px)", flexShrink: 0 }}>
            <img
              src={isFounder ? "/card-titanium.jpg" : cw.img}
              alt={isFounder ? "Titanium Black" : cw.name}
              style={{ width: "100%", display: "block", borderRadius: "16px", boxShadow: "0 28px 56px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.06)" }}
            />
            {/* Engraving overlay */}
            <div style={{
              position: "absolute", bottom: "15%", left: 0, right: 0, textAlign: "center",
              fontSize: "clamp(9px, 2.2vw, 12px)",
              color: isFounder ? "rgba(210,210,210,0.65)" : (cw.id === "white" ? "rgba(30,30,30,0.55)" : `${cw.accent}bb`),
              letterSpacing: "0.06em", fontWeight: 300, padding: "0 14px", transition: "color 0.3s",
            }}>
              {engraving || <span style={{ opacity: 0.25, fontStyle: "italic" }}>Your engraving</span>}
            </div>
          </div>

          {/* Input */}
          <div style={{ flex: 1, minWidth: 240, maxWidth: 360 }}>
            <div style={{ position: "relative", marginBottom: "14px" }}>
              <input
                id="engraving-input"
                type="text" maxLength={30} value={engraving}
                onChange={e => setEngraving(e.target.value)}
                placeholder="Your name, quote, or student ID"
                style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "14px", padding: "16px 52px 16px 18px", color: "#f5f5f7", fontSize: "16px", outline: "none", fontFamily: "inherit", transition: "border-color 0.15s" }}
                onFocus={e => e.target.style.borderColor = "rgba(255,255,255,0.3)"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
              />
              <span style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "rgba(255,255,255,0.22)", fontVariantNumeric: "tabular-nums" }}>{engraving.length}/30</span>
            </div>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.26)", lineHeight: 1.6 }}>
              Your text will be laser-engraved on the back of your card. Preview updates as you type.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Countdown ──────────────────────────────────────────────────────────── */
function CountdownSection({ countdown }) {
  return (
    <section style={{ background: "#111", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "36px 24px", textAlign: "center" }}>
      <p style={{ fontSize: "11px", fontWeight: "600", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", marginBottom: "20px" }}>Applications close</p>
      <div style={{ display: "flex", justifyContent: "center", gap: "clamp(20px, 5vw, 48px)" }}>
        {[["DAYS", countdown.days], ["HOURS", countdown.hours], ["MIN", countdown.minutes], ["SEC", countdown.seconds]].map(([unit, val]) => (
          <div key={unit} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "clamp(40px, 10vw, 64px)", fontWeight: "700", letterSpacing: "-3px", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{String(val).padStart(2, "0")}</div>
            <div style={{ fontSize: "11px", fontWeight: "600", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginTop: "6px" }}>{unit}</div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.2)", marginTop: "20px" }}>June 30, 2026 · Midnight</p>
    </section>
  );
}

/* ─── Manifesto ──────────────────────────────────────────────────────────── */
function ManifestoSection() {
  const [ref, visible] = useReveal(0.2);
  return (
    <section ref={ref} style={{ padding: "104px 24px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.06)", opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(28px)", transition: "opacity 0.9s, transform 0.9s" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <p style={{ fontSize: "11px", fontWeight: "600", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.26)", marginBottom: "22px" }}>What is FschoolAI</p>
        <h2 style={{ fontSize: "clamp(32px, 8vw, 56px)", fontWeight: "700", letterSpacing: "-2px", lineHeight: 1.08, marginBottom: "28px" }}>
          The AI that actually<br />knows your courses.
        </h2>
        <p style={{ fontSize: "clamp(15px, 2.5vw, 18px)", color: "rgba(255,255,255,0.42)", lineHeight: 1.75, letterSpacing: "-0.2px" }}>
          Canvas sync. In-class recording. AI tutor grounded in your actual lecture notes — not just the internet. FschoolAI is the academic intelligence layer every student needs. The Founding Card is your key to all of it — forever.
        </p>
      </div>
    </section>
  );
}

/* ─── Feature Section ────────────────────────────────────────────────────── */
function FeatureSection({ feature: f }) {
  const [ref, visible] = useReveal(0.1);
  return (
    <section ref={ref} style={{ background: f.bg, borderTop: "1px solid rgba(255,255,255,0.05)", padding: "clamp(80px, 14vw, 128px) 24px", minHeight: "72vh", display: "flex", alignItems: "center", opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(32px)", transition: "opacity 0.9s, transform 0.9s" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "clamp(40px, 6vw, 64px)" }}>
        <div style={{ textAlign: "center", maxWidth: 560 }}>
          <p style={{ fontSize: "11px", fontWeight: "600", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.26)", marginBottom: "18px" }}>{f.eyebrow}</p>
          <h2 style={{ fontSize: "clamp(38px, 9vw, 68px)", fontWeight: "700", letterSpacing: "-2.5px", lineHeight: 1.03, whiteSpace: "pre-line", marginBottom: "22px" }}>{f.headline}</h2>
          <p style={{ fontSize: "clamp(15px, 2vw, 17px)", color: "rgba(255,255,255,0.4)", lineHeight: 1.72, letterSpacing: "-0.2px" }}>{f.body}</p>
        </div>
        <FeatureVisual type={f.visual} />
      </div>
    </section>
  );
}

/* ─── Spec Section ───────────────────────────────────────────────────────── */
function SpecSection() {
  const [ref, visible] = useReveal(0.1);
  return (
    <section ref={ref} style={{ padding: "88px 24px 96px", maxWidth: 680, margin: "0 auto", borderTop: "1px solid rgba(255,255,255,0.06)", opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)", transition: "opacity 0.8s, transform 0.8s" }}>
      <p style={{ fontSize: "11px", fontWeight: "600", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.32)", marginBottom: "12px", textAlign: "center" }}>What's inside</p>
      <h2 style={{ fontSize: "clamp(28px, 6vw, 42px)", fontWeight: "700", letterSpacing: "-1px", marginBottom: "52px", textAlign: "center" }}>Everything a founder gets.</h2>
      {SPECS.map((f, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "18px", padding: "22px 0", borderBottom: i < SPECS.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
          <span style={{ fontSize: "22px", flexShrink: 0, marginTop: "1px" }}>{f.icon}</span>
          <div>
            <div style={{ fontSize: "15px", fontWeight: "600", letterSpacing: "-0.3px", marginBottom: "4px" }}>{f.label}</div>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.34)", lineHeight: 1.6 }}>{f.desc}</div>
          </div>
        </div>
      ))}
    </section>
  );
}

/* ─── Counter ────────────────────────────────────────────────────────────── */
function CounterSection() {
  const [ref, visible] = useReveal(0.2);
  const remaining = 247;
  return (
    <section ref={ref} style={{ padding: "80px 24px", background: "#0a0a0a", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)", transition: "opacity 0.8s, transform 0.8s" }}>
      <div style={{ fontSize: "clamp(56px, 16vw, 96px)", fontWeight: "700", letterSpacing: "-5px", lineHeight: 1 }}>{remaining}</div>
      <div style={{ fontSize: "15px", color: "rgba(255,255,255,0.36)", marginTop: "12px" }}>of 500 founding spots remaining</div>
      <div style={{ width: "280px", height: "3px", background: "rgba(255,255,255,0.07)", borderRadius: "2px", margin: "24px auto 0", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${((500 - remaining) / 500) * 100}%`, background: "linear-gradient(90deg, #888, #f5f5f7)", borderRadius: "2px" }} />
      </div>
      <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.2)", marginTop: "10px" }}>{500 - remaining} members have already applied</div>
    </section>
  );
}

/* ─── "One More Thing" — Steve Jobs stage photo ─────────────────────────── */
function OneMoreThingSection({ isFounder, setFounder }) {
  const [ref, visible] = useReveal(0.08);
  const perks = [
    "Titanium Black card — exclusive, never sold separately",
    "Guaranteed founding number #0001–#0005 (top 5 only)",
    "White-glove premium packaging + express delivery",
    "1-on-1 onboarding session with Vincent",
    "Lifetime Pro + priority support forever",
  ];
  return (
    <section ref={ref} style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", overflow: "hidden", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      {/* Stage photo — full bleed */}
      <img
        src={STAGE_IMG}
        alt="FschoolAI Founder Delivery"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", animation: visible ? "slowZoom 14s ease-in-out forwards" : "none" }}
      />
      {/* Gradient: dark on left for text, fades to photo on right */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.78) 40%, rgba(0,0,0,0.2) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, transparent 15%, transparent 85%, rgba(0,0,0,0.4) 100%)" }} />

      {/* Text content — left side */}
      <div style={{ position: "relative", zIndex: 2, padding: "80px 32px", maxWidth: 500, opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(32px)", transition: "opacity 1s ease 0.2s, transform 1s ease 0.2s" }}>
        <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.4)", marginBottom: "20px", fontStyle: "italic", letterSpacing: "-0.1px" }}>One more thing.</p>
        <h2 style={{ fontSize: "clamp(36px, 8vw, 60px)", fontWeight: "700", letterSpacing: "-2px", lineHeight: 1.04, marginBottom: "16px" }}>
          The rarest card<br />in the world.
        </h2>
        <p style={{ fontSize: "clamp(18px, 3vw, 22px)", color: "rgba(255,255,255,0.45)", marginBottom: "40px", letterSpacing: "-0.3px" }}>
          Only 5 exist. Ever.
        </p>

        {/* Perks */}
        <div style={{ marginBottom: "36px" }}>
          {perks.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "10px 0", borderBottom: i < perks.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
              <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "14px", flexShrink: 0, marginTop: "1px" }}>—</span>
              <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.62)", lineHeight: 1.5 }}>{p}</span>
            </div>
          ))}
        </div>

        {/* AppleCare-style toggle */}
        <div onClick={() => setFounder(f => !f)} style={{ border: isFounder ? "1px solid rgba(255,255,255,0.35)" : "1px solid rgba(255,255,255,0.12)", borderRadius: "16px", padding: "18px 20px", background: isFounder ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)", cursor: "pointer", transition: "all 0.3s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "22px", height: "22px", borderRadius: "50%", border: isFounder ? "none" : "2px solid rgba(255,255,255,0.3)", background: isFounder ? "#f5f5f7" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
              {isFounder && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round"><path d="M5 12l5 5L20 7"/></svg>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "15px", fontWeight: "600", letterSpacing: "-0.3px" }}>Add Founder Delivery</div>
              <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.36)", marginTop: "2px" }}>Titanium Black · Top 5 · White-glove · 1-on-1</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: "18px", fontWeight: "700", letterSpacing: "-0.5px" }}>$3,000</div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", marginTop: "1px" }}>One time</div>
            </div>
          </div>
        </div>
        {isFounder && <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.42)", marginTop: "12px" }}>Titanium Black selected · Founding #0001–#0005 guaranteed</p>}
      </div>
    </section>
  );
}

/* ─── Specialist — Apple "Set up with a Specialist" ─────────────────────── */
function SpecialistSection() {
  const [ref, visible] = useReveal(0.2);
  return (
    <section ref={ref} style={{ padding: "72px 24px", background: "#f5f5f7", opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)", transition: "opacity 0.8s, transform 0.8s" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
        <p style={{ fontSize: "17px", color: "#1d1d1f", lineHeight: 1.65, letterSpacing: "-0.3px" }}>
          Set up your identity card with a one-on-one session with a Specialist.{" "}
          <a href="mailto:hello@fschoolai.com" style={{ color: "#0066cc", textDecoration: "none" }}>Book a free Personal Setup session.</a>
        </p>
      </div>
    </section>
  );
}

/* ─── Apply — Apple checkout flow ────────────────────────────────────────── */
function ApplySection({ cw, isFounder, engraving, setFounder, formData, setFormData, submitted, submitting, handleSubmit, selected, setSelected, inp }) {
  const [ref, visible] = useReveal(0.1);
  return (
    <section id="apply" ref={ref} style={{ padding: "88px 24px 100px", borderTop: "1px solid rgba(255,255,255,0.06)", opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)", transition: "opacity 0.8s, transform 0.8s" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <p style={{ fontSize: "11px", fontWeight: "600", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.32)", marginBottom: "12px", textAlign: "center" }}>Founding Edition</p>
        <h2 style={{ fontSize: "clamp(28px, 6vw, 42px)", fontWeight: "700", letterSpacing: "-1px", marginBottom: "8px", textAlign: "center" }}>Apply for your card.</h2>
        <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.36)", marginBottom: "44px", textAlign: "center", letterSpacing: "-0.2px", lineHeight: 1.6 }}>
          {isFounder ? "Founder Delivery — $3,000. We'll reach out to complete your order." : "Free for founding members. We'll reach out when your card is ready to ship."}
        </p>

        {submitted ? (
          <div style={{ background: "rgba(48,209,88,0.06)", border: "1px solid rgba(48,209,88,0.15)", borderRadius: "20px", padding: "52px 24px", textAlign: "center" }}>
            <div style={{ fontSize: "48px", marginBottom: "18px" }}>🎉</div>
            <div style={{ fontSize: "24px", fontWeight: "700", color: "#30d158", marginBottom: "10px", letterSpacing: "-0.6px" }}>You're on the list.</div>
            <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.42)", lineHeight: 1.75 }}>We'll email you when your founding card is ready to ship.<br />Welcome to the founding 500.</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0" }}>

            {/* Order summary */}
            <div style={{ marginBottom: "8px" }}>
              <div style={{ fontSize: "12px", fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.24)", marginBottom: "12px", paddingLeft: "4px" }}>Your selection</div>

              {/* Colorway row */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px 14px 0 0", padding: "14px 16px", borderBottom: "none" }}>
                <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: isFounder ? "linear-gradient(135deg,#3a3a3a,#1a1a1a)" : cw.hex, border: isFounder ? "1px solid #555" : "none", flexShrink: 0 }} />
                <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.62)", flex: 1 }}>{isFounder ? "Titanium Black — Founder Delivery" : cw.name}</span>
                <a href="#colorway" onClick={e => { e.preventDefault(); document.querySelector('[data-colorway-section]')?.scrollIntoView({ behavior: "smooth" }); }} style={{ fontSize: "13px", color: "rgba(255,255,255,0.28)", textDecoration: "none" }}>Change</a>
              </div>

              {/* Engraving row */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderTop: "1px solid rgba(255,255,255,0.05)", borderRadius: "0", padding: "14px 16px", borderBottom: "none" }}>
                <span style={{ fontSize: "14px", color: engraving ? "rgba(255,255,255,0.62)" : "rgba(255,255,255,0.22)", flex: 1 }}>{engraving ? `✍️  "${engraving}"` : "No engraving"}</span>
                <a href="#engraving-input" onClick={e => { e.preventDefault(); document.getElementById("engraving-input")?.focus(); }} style={{ fontSize: "13px", color: "rgba(255,255,255,0.28)", textDecoration: "none" }}>Edit</a>
              </div>

              {/* Delivery toggle */}
              <div onClick={() => setFounder(f => !f)} style={{ display: "flex", alignItems: "center", gap: "12px", background: isFounder ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.04)", border: isFounder ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(255,255,255,0.07)", borderTop: "1px solid rgba(255,255,255,0.05)", borderRadius: "0 0 14px 14px", padding: "14px 16px", cursor: "pointer", transition: "all 0.2s" }}>
                <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: isFounder ? "none" : "2px solid rgba(255,255,255,0.2)", background: isFounder ? "#f5f5f7" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                  {isFounder && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round"><path d="M5 12l5 5L20 7"/></svg>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", color: isFounder ? "#f5f5f7" : "rgba(255,255,255,0.48)", fontWeight: isFounder ? 600 : 400 }}>{isFounder ? "Founder Delivery — $3,000" : "Standard — Free"}</div>
                  <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.26)", marginTop: "2px" }}>{isFounder ? "Titanium Black · Top 5 · White-glove · 1-on-1 with Vincent" : "Ships Q4 2026"}</div>
                </div>
                {!isFounder && <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.28)" }}>Upgrade</span>}
              </div>
            </div>

            {/* Details */}
            <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ fontSize: "12px", fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.24)", marginBottom: "4px", paddingLeft: "4px" }}>Your details</div>
              <input type="text" placeholder="Full name" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} required style={inp} onFocus={e => e.target.style.borderColor = "rgba(255,255,255,0.25)"} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.09)"} />
              <input type="text" placeholder="University or school" value={formData.university} onChange={e => setFormData(p => ({ ...p, university: e.target.value }))} style={inp} onFocus={e => e.target.style.borderColor = "rgba(255,255,255,0.25)"} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.09)"} />
              <input type="email" placeholder="Email address" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} required style={inp} onFocus={e => e.target.style.borderColor = "rgba(255,255,255,0.25)"} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.09)"} />
            </div>

            {/* Submit */}
            <button type="submit" disabled={submitting || !formData.name || !formData.email} style={{ marginTop: "20px", background: submitting ? "rgba(245,245,247,0.5)" : "#f5f5f7", color: "#000", border: "none", borderRadius: "980px", padding: "17px", fontSize: "16px", fontWeight: "650", letterSpacing: "-0.3px", cursor: submitting ? "default" : "pointer", fontFamily: "inherit", opacity: (!formData.name || !formData.email) ? 0.45 : 1, transition: "opacity 0.2s" }}>
              {submitting ? "Submitting…" : isFounder ? "Apply for Founder Delivery →" : "Apply for my card →"}
            </button>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.18)", marginTop: "10px", textAlign: "center" }}>
              {isFounder ? "$3,000 · Titanium Black · Top 5 · Ships Q4 2026." : "Free. No credit card required. Ships Q4 2026."}
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
