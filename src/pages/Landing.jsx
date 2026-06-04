// Landing.jsx — Marketing landing page.
// LOGIC: All state variables, handlers, and auth flow are preserved exactly.
// VISUAL: Dark editorial theme — Fraunces display headings, gold accent (#C49A3C),
//         ink background (#111111), Cluely-structure feature cards with CSS mockups.

import { useState } from "react";

/* ─────────────────────────────────────────────────────────────────────────
   AUTH MODAL  (inputBase + component untouched)
   ──────────────────────────────────────────────────────────────────────── */

const inputBase = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "10px",
  padding: "12px 14px",
  color: "#F5F5F5",
  fontSize: "14px",
  outline: "none",
  fontFamily: "inherit",
  width: "100%",
  transition: "border-color 0.15s",
};

function AuthModal({ mode, onClose, onEnter, onSwitchMode, onForgotPassword }) {
  const [name,      setName]      = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(false);

  const isSignup = mode === "signup";

  const canSubmit = isSignup
    ? name.trim() && email.trim() && password.length >= 6
    : email.trim() && password.length >= 1;

  async function handleSubmit() {
    if (!canSubmit || loading) return;
    if (isSignup && password !== confirmPw) { setError("Passwords don't match."); return; }
    setError("");
    setLoading(true);
    try {
      await onEnter({ mode, name: name.trim(), email: email.trim(), password });
    } catch (err) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) { if (e.key === "Enter") handleSubmit(); }

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "flex-end",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <div style={{
        width: "100%",
        background: "rgba(16,16,18,0.97)",
        backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)",
        borderRadius: "22px 22px 0 0",
        border: "1px solid rgba(255,255,255,0.09)", borderBottom: "none",
        padding: "16px 28px 44px",
        fontFamily: "inherit",
        animation: "lSheetUp 0.28s cubic-bezier(0.25,0.46,0.45,0.94) forwards",
      }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "22px" }}>
          <div onClick={onClose} style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", cursor: "pointer" }} />
        </div>
        <h2 style={{ color: "#F5F5F5", fontSize: "22px", fontWeight: "600", letterSpacing: "-0.3px", marginBottom: "6px" }}>
          {isSignup ? "Create your account" : "Welcome back"}
        </h2>
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "14px", marginBottom: "26px", lineHeight: "1.6" }}>
          {isSignup ? "Takes 30 seconds. You'll connect Canvas on the next screen." : "Enter your email and password to continue."}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "18px" }}>
          {isSignup ? (
            <>
              <input placeholder="Your name"                   value={name}      onChange={e => setName(e.target.value)}      onKeyDown={handleKey} style={inputBase} />
              <input placeholder="Email"          type="email"  value={email}     onChange={e => setEmail(e.target.value)}     onKeyDown={handleKey} style={inputBase} />
              <input placeholder="Password (min 6 characters)" type="password"   value={password}  onChange={e => setPassword(e.target.value)}  onKeyDown={handleKey} style={inputBase} />
              <input placeholder="Confirm password"            type="password"   value={confirmPw} onChange={e => setConfirmPw(e.target.value)} onKeyDown={handleKey} style={inputBase} />
            </>
          ) : (
            <>
              <input placeholder="Email"    type="email"    value={email}    onChange={e => setEmail(e.target.value)}    onKeyDown={handleKey} style={inputBase} />
              <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={handleKey} style={inputBase} />
              <button type="button" onClick={() => onForgotPassword(email.trim())}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: "12px", cursor: "pointer", textAlign: "right", fontFamily: "inherit", padding: "0", textDecoration: "underline" }}>
                Forgot password?
              </button>
            </>
          )}
        </div>
        {error && <p style={{ color: "rgba(255,100,90,0.85)", fontSize: "12px", textAlign: "center", marginBottom: "10px" }}>{error}</p>}
        <button onClick={handleSubmit} disabled={!canSubmit || loading}
          style={{ width: "100%", background: canSubmit && !loading ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.25)", color: "#111", border: "none", borderRadius: "12px", padding: "14px", fontSize: "15px", fontWeight: "600", cursor: canSubmit && !loading ? "pointer" : "not-allowed", fontFamily: "inherit", transition: "background 0.15s, transform 0.15s" }}
          onMouseEnter={(e) => { if (canSubmit && !loading) { e.currentTarget.style.background = "#fff"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
          onMouseLeave={(e) => { e.currentTarget.style.background = canSubmit && !loading ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.25)"; e.currentTarget.style.transform = "none"; }}>
          {loading ? "…" : isSignup ? "Start for free →" : "Sign in →"}
        </button>
        <p style={{ color: "rgba(255,255,255,0.18)", fontSize: "12px", textAlign: "center", marginTop: "10px" }}>
          {isSignup ? "You'll set up Canvas in the next step."
            : <>Don't have an account?{" "}
                <span onClick={() => { onClose(); setTimeout(() => onSwitchMode("signup"), 50); }}
                  style={{ color: "rgba(255,255,255,0.45)", textDecoration: "underline", cursor: "pointer" }}>
                  Sign up free
                </span>
              </>}
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   CSS MOCKUP COMPONENTS  (all dark-palette)
   ──────────────────────────────────────────────────────────────────────── */

// Hero — three overlapping dark app cards showing real UI
function HeroPreview() {
  return (
    <div style={{ position: "relative", width: "100%", maxWidth: "520px", margin: "0 auto", height: "272px" }}>
      {/* Center: Work card */}
      <div style={{
        position: "absolute", left: "50%", top: "50%",
        transform: "translate(-50%,-50%)",
        width: "218px",
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "18px", padding: "18px",
        zIndex: 3,
        boxShadow: "0 28px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      }}>
        <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: "14px" }}>WORK</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "7px", marginBottom: "12px" }}>
          {[
            { label: "Research Paper", badge: "Tomorrow", urgent: true },
            { label: "Problem Set 4",  badge: "May 23",   urgent: false },
          ].map(a => (
            <div key={a.label} style={{ background: "rgba(255,255,255,0.06)", borderRadius: "8px", padding: "8px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: a.urgent ? "#F5F5F5" : "rgba(255,255,255,0.5)", fontSize: "11px", fontWeight: a.urgent ? "500" : "400" }}>{a.label}</span>
              <span style={{ fontSize: "9px", padding: "2px 7px", borderRadius: "10px", background: a.urgent ? "rgba(255,59,48,0.2)" : "transparent", color: a.urgent ? "rgba(255,100,90,0.9)" : "rgba(255,255,255,0.22)" }}>{a.badge}</span>
            </div>
          ))}
        </div>
        <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: "4px", height: "3px" }}>
          <div style={{ background: "rgba(255,255,255,0.45)", height: "100%", borderRadius: "4px", width: "65%" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
          <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.22)" }}>GPA 3.87</span>
          <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.22)" }}>12d streak</span>
          <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.22)" }}>34 done</span>
        </div>
      </div>

      {/* Right: Study card */}
      <div className="l-preview-r" style={{
        position: "absolute", right: "0", top: "16px",
        width: "158px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "14px", padding: "14px",
        transform: "rotate(4deg)", zIndex: 2,
        boxShadow: "0 12px 36px rgba(0,0,0,0.45)",
      }}>
        <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "10px" }}>STUDY</p>
        <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "8px", padding: "10px" }}>
          <p style={{ color: "rgba(255,255,255,0.22)", fontSize: "8px", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "5px" }}>Question</p>
          <p style={{ color: "#F5F5F5", fontSize: "10px", lineHeight: "1.5" }}>What is cognitive load theory?</p>
        </div>
        <p style={{ color: "rgba(255,255,255,0.16)", fontSize: "8px", marginTop: "8px", textAlign: "center" }}>Tap to flip</p>
      </div>

      {/* Left: AI Tutor card */}
      <div className="l-preview-l" style={{
        position: "absolute", left: "0", bottom: "14px",
        width: "168px",
        background: "rgba(14,14,18,0.94)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "14px", padding: "14px",
        transform: "rotate(-3deg)", zIndex: 2,
        boxShadow: "0 12px 36px rgba(0,0,0,0.45)",
      }}>
        <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "10px" }}>AI TUTOR</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ alignSelf: "flex-end", background: "rgba(196,154,60,0.22)", borderRadius: "8px 8px 2px 8px", padding: "6px 9px" }}>
            <p style={{ color: "#F5F5F5", fontSize: "9px" }}>Summarize my notes</p>
          </div>
          <div style={{ alignSelf: "flex-start", background: "rgba(255,255,255,0.05)", borderRadius: "8px 8px 8px 2px", padding: "6px 9px" }}>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "9px", lineHeight: "1.55" }}>Based on Lecture 7, working memory has four components…</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Recording mockup — timer, waveform, live transcript (dark palette)
function RecordingMockup() {
  const bars = [8,16,28,22,12,36,26,18,40,30,22,12,26,34,18,14,22,30,18,8];
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "20px", padding: "24px", maxWidth: "320px", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#FF453A" }} />
          <span style={{ color: "rgba(255,255,255,0.9)", fontSize: "13px", fontWeight: "600", letterSpacing: "0.5px" }}>REC</span>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", fontFamily: "ui-monospace,monospace" }}>00:03</span>
        </div>
        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.28)", background: "rgba(255,255,255,0.06)", padding: "3px 8px", borderRadius: "6px" }}>COMP 101</span>
      </div>
      {/* Waveform — played bars in gold, unplayed in dim */}
      <div style={{ display: "flex", alignItems: "center", gap: "3px", height: "44px", marginBottom: "20px" }}>
        {bars.map((h, i) => (
          <div key={i} style={{
            flex: 1, height: `${h}px`,
            background: i < 14 ? "#C49A3C" : "rgba(255,255,255,0.12)",
            borderRadius: "2px",
            opacity: i < 14 ? 0.85 : 0.5,
          }} />
        ))}
      </div>
      {/* Transcript */}
      <div style={{ borderLeft: "2px solid rgba(196,154,60,0.45)", paddingLeft: "12px" }}>
        <p style={{ color: "rgba(255,255,255,0.28)", fontSize: "9px", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "5px" }}>Live transcript</p>
        <p style={{ color: "rgba(255,255,255,0.68)", fontSize: "12px", lineHeight: "1.65" }}>
          "…cognitive load theory suggests working memory has limited capacity for processing new information…"
        </p>
      </div>
    </div>
  );
}

// AI Tutor mockup — chat bubbles with gold user bubble, source attribution
function TutorMockup() {
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "20px", padding: "20px", maxWidth: "300px", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <span style={{ fontSize: "13px", fontWeight: "600", color: "#F5F5F5" }}>AI Tutor</span>
        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.06)", padding: "3px 9px", borderRadius: "8px" }}>BIOL 201</span>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10px" }}>
        <div style={{ background: "rgba(196,154,60,0.22)", border: "1px solid rgba(196,154,60,0.25)", borderRadius: "14px 14px 4px 14px", padding: "9px 13px", maxWidth: "76%" }}>
          <p style={{ color: "#F5F5F5", fontSize: "12px" }}>Explain homeostasis</p>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "12px" }}>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px 14px 14px 4px", padding: "10px 13px", maxWidth: "88%" }}>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "12px", lineHeight: "1.65" }}>Homeostasis is the body's mechanism for maintaining stable internal conditions. Your professor covered this in Lecture 4…</p>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#C49A3C", opacity: 0.55, flexShrink: 0 }} />
        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.28)" }}>From your Lecture 4 notes</span>
      </div>
    </div>
  );
}

// Study room mockup — participant list with gold accent
function StudyRoomMockup() {
  const members = [
    { name: "Pratik",  i: "P", c: "rgba(196,154,60,0.75)" },
    { name: "Shreya",  i: "S", c: "rgba(123,97,214,0.75)" },
    { name: "Marcus",  i: "M", c: "rgba(200,119,58,0.75)" },
    { name: "Aiden",   i: "A", c: "rgba(59,168,123,0.75)" },
  ];
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "20px", padding: "20px", maxWidth: "268px", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div>
          <p style={{ fontSize: "14px", fontWeight: "700", color: "#F5F5F5", marginBottom: "2px" }}>Study Room</p>
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>{members.length} members active</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#34C759" }} />
          <span style={{ fontSize: "11px", color: "#34C759", fontWeight: "500" }}>Live</span>
        </div>
      </div>
      {members.map(m => (
        <div key={m.name} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: m.c, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ color: "#fff", fontSize: "11px", fontWeight: "600" }}>{m.i}</span>
          </div>
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px" }}>{m.name}</span>
        </div>
      ))}
      <button style={{ width: "100%", background: "none", border: "1px dashed rgba(196,154,60,0.3)", borderRadius: "10px", padding: "8px", color: "rgba(196,154,60,0.7)", fontSize: "13px", cursor: "default", fontFamily: "inherit", marginTop: "4px" }}>
        + Add friend
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   STATIC CONTENT
   ──────────────────────────────────────────────────────────────────────── */

const FAQ_DATA = [
  {
    q: "Who is Vincent?",
    a: "Vincent is the founder of FSchoolAI. He never attended a single lecture — learned everything using AI, found a massive gap in how students actually study, and coded the first version of FSchoolAI on his iPhone. That gap is why this exists.",
  },
  {
    q: "Does FSchoolAI support academic integrity?",
    a: "Yes. FSchoolAI is a study tool, not a shortcut — it helps you understand your material faster, not skip it. Think of it as a tutor that knows your exact courses.",
  },
  {
    q: "What is FSchoolAI?",
    a: "FSchoolAI is an AI-powered academic platform that syncs with your Canvas LMS, organizes your courses and assignments, and gives you a personal AI tutor that understands your actual class material — all in one mobile-first space.",
  },
  {
    q: "Is it free?",
    a: "Yes. Joining the beta gives you a full 1-month free subscription. After the beta period we'll offer a Pro tier — the core experience (Canvas sync, AI study guide, flashcards, assignment tracker) stays free.",
  },
  {
    q: "How does Canvas sync work?",
    a: "You paste your school's Canvas URL and a personal read-only API token (generated in Canvas Account Settings in under a minute). FSchoolAI reads your courses, assignments, and deadlines — it never writes to Canvas, and your token is stored only on your device.",
  },
  {
    q: "Does it work with my school?",
    a: "If your school uses Canvas LMS, yes. That covers thousands of universities, colleges, and high schools worldwide. Support for Blackboard and D2L is on the roadmap.",
  },
  {
    q: "When is the mobile app coming?",
    a: "The web app is fully mobile-responsive today — add it to your home screen for an app-like experience. A native iOS app is in development; sign up above to be notified at launch.",
  },
];

const FREE_FEATURES  = [
  "Canvas sync — courses, assignments, deadlines",
  "AI study guide and flashcards",
  "Assignment tracker and GPA view",
  "Basic AI tutor",
  "Mobile-ready web app",
];

const PRO_FEATURES = [
  "Everything in Free",
  "In-class recording and live transcription",
  "Priority AI (faster, smarter responses)",
  "Smart study planner",
  "Study rooms and group sessions",
  "Identity card and leaderboard",
];

/* ─────────────────────────────────────────────────────────────────────────
   LANDING PAGE
   ──────────────────────────────────────────────────────────────────────── */

export default function Landing({ onEnter }) {
  // ── State ─────────────────────────────────────────────────────────────
  const [authMode,      setAuthMode]      = useState(null);  // null | "signup" | "login"
  const [forgotSent,    setForgotSent]    = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError,   setForgotError]   = useState(false);
  const [faqOpen,       setFaqOpen]       = useState(null);

  // ── Handlers (untouched) ──────────────────────────────────────────────
  async function handleForgotPassword(email) {
    if (!email) {
      setForgotError(true);
      setTimeout(() => setForgotError(false), 4000);
      return;
    }
    setForgotLoading(true);
    try {
      await fetch("/api/email?action=reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setForgotSent(true);
      setTimeout(() => setForgotSent(false), 5000);
    } catch {}
    setForgotLoading(false);
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div style={{ background: "#111111", minHeight: "100dvh", fontFamily: "var(--font-sans)", overflowX: "clip", color: "#F5F5F5" }}>

      {/* ── Global styles ────────────────────────────────────────────────── */}
      <style>{`
        @keyframes lSheetUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes lFadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }

        .l-fade { opacity:0; animation: lFadeUp 0.65s cubic-bezier(0.25,0.46,0.45,0.94) forwards; }
        .l-d1 { animation-delay: 0.05s; }
        .l-d2 { animation-delay: 0.18s; }
        .l-d3 { animation-delay: 0.32s; }
        .l-d4 { animation-delay: 0.46s; }
        .l-d5 { animation-delay: 0.62s; }

        .l-btn-primary        { transition: opacity .15s, transform .15s; }
        .l-btn-primary:hover  { opacity: .84 !important; transform: translateY(-1px); }
        .l-btn-primary:active { transform: translateY(0); }

        .l-btn-ghost:hover { background: rgba(255,255,255,0.09) !important; }
        .l-nav-signin:hover { color: #F5F5F5 !important; }

        .l-feat-card { transition: transform .22s, box-shadow .22s; }
        .l-feat-card:hover { transform: translateY(-3px) !important; }

        .l-faq-row { border-bottom: 1px solid rgba(255,255,255,0.06); cursor: pointer; }
        .l-faq-row:hover .l-faq-q-text { color: #C49A3C; }

        @media (max-width: 640px) {
          .l-hero-h1  { font-size: 44px !important; letter-spacing: -1.8px !important; line-height: 1.08 !important; }
          .l-hero-sub { font-size: 16px !important; }
          .l-split     { flex-direction: column !important; }
          .l-split-rev { flex-direction: column   !important; }
          .l-stats     { grid-template-columns: 1fr !important; gap: 40px !important; }
          .l-pricing   { grid-template-columns: 1fr !important; }
          .l-sec       { padding: 64px 20px !important; }
          .l-hero-sec  { padding: 96px 20px 56px !important; }
          .l-card-pad  { padding: 36px 24px !important; }
          .l-preview-r, .l-preview-l { display: none !important; }
        }
      `}</style>

      {/* ── Nav ────────────────────────────────────────────────────────── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 28px",
        background: "rgba(17,17,17,0.9)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <img src="/logo.jpeg" alt="FSchoolAI" style={{ width: 28, height: 28, borderRadius: "7px", objectFit: "cover", flexShrink: 0 }} />
          <span style={{ fontWeight: "700", fontSize: "15px", letterSpacing: "-0.3px", color: "#F5F5F5" }}>FSchoolAI</span>
        </div>
        <button
          className="l-nav-signin"
          onClick={() => setAuthMode("login")}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: "14px", fontWeight: "500", cursor: "pointer", fontFamily: "inherit", transition: "color .15s" }}
        >
          Sign in
        </button>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="l-hero-sec" style={{
        padding: "120px 24px 80px",
        background: "#111111",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Subtle gold radial glow from top */}
        <div style={{ position: "absolute", top: "-120px", left: "50%", transform: "translateX(-50%)", width: "800px", height: "600px", background: "radial-gradient(ellipse at top, rgba(196,154,60,0.08) 0%, transparent 60%)", pointerEvents: "none" }} />

        <p className="l-fade l-d1" style={{
          display: "inline-block", fontSize: "11px", fontWeight: "600",
          color: "rgba(196,154,60,0.8)", letterSpacing: "2.5px", textTransform: "uppercase",
          background: "rgba(196,154,60,0.08)",
          border: "1px solid rgba(196,154,60,0.2)",
          borderRadius: "20px", padding: "5px 14px",
          marginBottom: "28px",
        }}>
          Beta — 1 month free
        </p>

        <h1 className="l-hero-h1 l-fade l-d2" style={{
          fontSize: "76px", fontWeight: "700",
          fontFamily: "'Fraunces',Georgia,serif",
          color: "#F5F5F5",
          letterSpacing: "-2.8px", lineHeight: "1.04",
          maxWidth: "760px", margin: "0 auto 22px",
        }}>
          #1 Student Academic Intelligence
        </h1>

        <p className="l-hero-sub l-fade l-d3" style={{
          fontSize: "18px", color: "rgba(255,255,255,0.42)",
          maxWidth: "480px", margin: "0 auto 40px", lineHeight: "1.7",
        }}>
          Canvas courses, class notes, and AI in one intelligent space — organized the way you actually study.
        </p>

        {/* CTAs */}
        <div className="l-fade l-d4" style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", marginBottom: "28px" }}>
          <button
            className="l-btn-primary"
            onClick={() => setAuthMode("signup")}
            style={{ background: "rgba(255,255,255,0.92)", color: "#111", border: "none", borderRadius: "12px", padding: "14px 30px", fontSize: "15px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" }}
          >
            Join the Beta →
          </button>
          <button
            className="l-btn-ghost"
            onClick={() => setAuthMode("login")}
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "rgba(255,255,255,0.65)", padding: "14px 24px", fontSize: "15px", cursor: "pointer", fontFamily: "inherit", transition: "background .15s" }}
          >
            Sign in
          </button>
        </div>

        {/* App Store badge — non-functional, coming soon */}
        <div className="l-fade l-d4" style={{ display: "flex", justifyContent: "center", marginBottom: "60px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "10px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "10px", padding: "9px 16px",
            cursor: "default",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" fill="rgba(255,255,255,0.6)"/>
            </svg>
            <div style={{ textAlign: "left" }}>
              <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", lineHeight: 1, marginBottom: "2px" }}>Available soon on the</p>
              <p style={{ fontSize: "13px", fontWeight: "700", color: "#F5F5F5", lineHeight: 1 }}>App Store</p>
            </div>
            <span style={{ fontSize: "9px", fontWeight: "600", color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.07)", borderRadius: "6px", padding: "2px 7px", letterSpacing: "0.5px", textTransform: "uppercase" }}>Soon</span>
          </div>
        </div>

        {/* Product preview */}
        <div className="l-fade l-d5">
          <HeroPreview />
        </div>
      </section>

      {/* ── Feature 1: In-class Recording ───────────────────────────────── */}
      <section className="l-sec" style={{ padding: "80px 24px", background: "#111111" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <div className="l-feat-card l-card-pad l-split" style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderTop: "2px solid rgba(196,154,60,0.4)",
            borderRadius: "28px",
            padding: "56px 52px",
            display: "flex", gap: "52px", alignItems: "center",
          }}>
            <div style={{ flex: "1 1 0", minWidth: 0 }}>
              <p style={{ fontSize: "11px", fontWeight: "600", letterSpacing: "2px", textTransform: "uppercase", color: "rgba(196,154,60,0.6)", marginBottom: "16px" }}>In-class recording</p>
              <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: "36px", fontWeight: "700", color: "#F5F5F5", letterSpacing: "-0.8px", lineHeight: "1.15", marginBottom: "18px" }}>
                Never miss what's said in class.
              </h2>
              <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.45)", lineHeight: "1.75" }}>
                FSchoolAI captures and transcribes your lectures in real time. Review exactly what was covered — searchable, always there, in your own notes.
              </p>
            </div>
            <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", justifyContent: "center" }}>
              <RecordingMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature 2: AI Tutor ─────────────────────────────────────────── */}
      <section className="l-sec" style={{ padding: "20px 24px 80px", background: "#111111" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <div className="l-feat-card l-card-pad l-split-rev" style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderTop: "2px solid rgba(196,154,60,0.4)",
            borderRadius: "28px",
            padding: "56px 52px",
            display: "flex", flexDirection: "row-reverse", gap: "52px", alignItems: "center",
          }}>
            <div style={{ flex: "1 1 0", minWidth: 0 }}>
              <p style={{ fontSize: "11px", fontWeight: "600", letterSpacing: "2px", textTransform: "uppercase", color: "rgba(196,154,60,0.6)", marginBottom: "16px" }}>AI Tutor</p>
              <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: "36px", fontWeight: "700", color: "#F5F5F5", letterSpacing: "-0.8px", lineHeight: "1.15", marginBottom: "18px" }}>
                Your own AI tutor who knows your courses.
              </h2>
              <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.45)", lineHeight: "1.75" }}>
                Answers grounded in your actual lecture notes — not just the internet. Ask anything about your courses and get answers that make sense for your class.
              </p>
            </div>
            <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", justifyContent: "center" }}>
              <TutorMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature 3: Study Rooms ──────────────────────────────────────── */}
      <section className="l-sec" style={{ padding: "20px 24px 80px", background: "#111111" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <div className="l-feat-card l-card-pad l-split" style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderTop: "2px solid rgba(196,154,60,0.4)",
            borderRadius: "28px",
            padding: "56px 52px",
            display: "flex", gap: "52px", alignItems: "center",
            position: "relative",
          }}>
            <span style={{ position: "absolute", top: "22px", right: "24px", fontSize: "10px", fontWeight: "600", letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.06)", borderRadius: "7px", padding: "4px 10px" }}>
              Coming soon
            </span>
            <div style={{ flex: "1 1 0", minWidth: 0 }}>
              <p style={{ fontSize: "11px", fontWeight: "600", letterSpacing: "2px", textTransform: "uppercase", color: "rgba(196,154,60,0.6)", marginBottom: "16px" }}>Study rooms</p>
              <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: "36px", fontWeight: "700", color: "#F5F5F5", letterSpacing: "-0.8px", lineHeight: "1.15", marginBottom: "18px" }}>
                Study together. Add friends, join a room.
              </h2>
              <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.45)", lineHeight: "1.75" }}>
                Create study rooms, invite friends from your school, and learn together in real time. Shared notes, shared focus.
              </p>
            </div>
            <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", justifyContent: "center" }}>
              <StudyRoomMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <section className="l-sec" style={{ padding: "96px 24px", background: "#0A0E18", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <p style={{ fontSize: "11px", fontWeight: "600", letterSpacing: "2.5px", textTransform: "uppercase", color: "rgba(196,154,60,0.55)", marginBottom: "64px" }}>By the numbers</p>
          <div className="l-stats" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "48px" }}>
            {[
              { val: "Real-time",  cap: "transcription, no delay" },
              { val: "50+",        cap: "languages supported" },
              { val: "1 month",    cap: "free on beta signup" },
            ].map(({ val, cap }) => (
              <div key={val}>
                <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: "48px", fontWeight: "700", color: "#F5F5F5", letterSpacing: "-1.5px", lineHeight: 1, marginBottom: "12px" }}>{val}</p>
                <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.35)", lineHeight: "1.5" }}>{cap}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section className="l-sec" style={{ padding: "96px 24px", background: "#111111" }}>
        <div style={{ maxWidth: "820px", margin: "0 auto" }}>
          <p style={{ fontSize: "11px", fontWeight: "600", letterSpacing: "2.5px", textTransform: "uppercase", color: "rgba(196,154,60,0.55)", textAlign: "center", marginBottom: "14px" }}>Pricing</p>
          <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: "44px", fontWeight: "700", color: "#F5F5F5", letterSpacing: "-1.4px", textAlign: "center", marginBottom: "10px" }}>Simple pricing.</h2>
          <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.38)", textAlign: "center", marginBottom: "56px" }}>Start free. Upgrade when you're ready.</p>

          <div className="l-pricing" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            {/* Free card */}
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "22px", padding: "36px 32px", display: "flex", flexDirection: "column" }}>
              <p style={{ fontSize: "13px", fontWeight: "700", color: "#F5F5F5", letterSpacing: "0.3px", marginBottom: "8px" }}>Free</p>
              <div style={{ marginBottom: "28px" }}>
                <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: "44px", fontWeight: "700", color: "#F5F5F5" }}>$0</span>
                <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.35)", marginLeft: "4px" }}>/month</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
                {FREE_FEATURES.map(f => (
                  <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: "1.5" }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: "2px" }}>
                      <circle cx="8" cy="8" r="7" stroke="rgba(196,154,60,0.5)" strokeWidth="1.2"/>
                      <path d="M5 8l2.5 2.5L11 5.5" stroke="#C49A3C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button className="l-btn-primary" onClick={() => setAuthMode("signup")}
                style={{ width: "100%", background: "rgba(255,255,255,0.92)", color: "#111", border: "none", borderRadius: "12px", padding: "13px", fontSize: "15px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" }}>
                Join the Beta →
              </button>
            </div>

            {/* Pro card */}
            <div style={{ background: "rgba(196,154,60,0.05)", border: "1px solid rgba(196,154,60,0.18)", borderRadius: "22px", padding: "36px 32px", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "200px", height: "200px", background: "radial-gradient(circle, rgba(196,154,60,0.08) 0%, transparent 65%)", pointerEvents: "none" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <p style={{ fontSize: "13px", fontWeight: "700", color: "#F5F5F5", letterSpacing: "0.3px" }}>Pro</p>
                <span style={{ fontSize: "10px", fontWeight: "600", letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(196,154,60,0.6)", background: "rgba(196,154,60,0.1)", border: "1px solid rgba(196,154,60,0.2)", borderRadius: "6px", padding: "3px 8px" }}>Coming soon</span>
              </div>
              <div style={{ marginBottom: "28px" }}>
                <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: "32px", fontWeight: "700", color: "rgba(255,255,255,0.4)" }}>Coming soon</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
                {PRO_FEATURES.map(f => (
                  <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "14px", color: "rgba(255,255,255,0.4)", lineHeight: "1.5" }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: "2px" }}>
                      <circle cx="8" cy="8" r="7" stroke="rgba(196,154,60,0.25)" strokeWidth="1.2"/>
                      <path d="M5 8l2.5 2.5L11 5.5" stroke="rgba(196,154,60,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button disabled style={{ width: "100%", background: "rgba(196,154,60,0.08)", color: "rgba(196,154,60,0.35)", border: "1px solid rgba(196,154,60,0.15)", borderRadius: "12px", padding: "13px", fontSize: "15px", fontWeight: "600", cursor: "default", fontFamily: "inherit" }}>
                Get notified
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section className="l-sec" style={{ padding: "96px 24px", background: "#0A0E18", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: "640px", margin: "0 auto" }}>
          <p style={{ fontSize: "11px", fontWeight: "600", letterSpacing: "2.5px", textTransform: "uppercase", color: "rgba(196,154,60,0.55)", textAlign: "center", marginBottom: "14px" }}>FAQ</p>
          <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: "42px", fontWeight: "700", color: "#F5F5F5", letterSpacing: "-1.2px", textAlign: "center", marginBottom: "52px" }}>Questions answered.</h2>

          {FAQ_DATA.map((item, i) => (
            <div key={i} className="l-faq-row" onClick={() => setFaqOpen(faqOpen === i ? null : i)}>
              <div className="l-faq-q-text" style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "20px 0",
                fontSize: "15px", fontWeight: "600",
                color: faqOpen === i ? "#C49A3C" : "#F5F5F5",
                transition: "color .15s",
              }}>
                {item.q}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginLeft: "16px", transform: faqOpen === i ? "rotate(180deg)" : "none", transition: "transform .22s" }}>
                  <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              {faqOpen === i && (
                <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.45)", lineHeight: "1.75", paddingBottom: "20px" }}>{item.a}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer style={{ padding: "32px 28px", borderTop: "1px solid rgba(255,255,255,0.05)", background: "#111111", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <img src="/logo.jpeg" alt="FSchoolAI" style={{ width: 22, height: 22, borderRadius: "5px", objectFit: "cover" }} />
          <span style={{ fontWeight: "700", fontSize: "14px", color: "#F5F5F5" }}>FSchoolAI</span>
        </div>
        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.2)" }}>© 2026 FSchoolAI. All rights reserved.</span>
        <div style={{ display: "flex", gap: "20px" }}>
          {[["Privacy", "#"], ["Terms", "#"], ["Contact", "#"]].map(([label, href]) => (
            <a key={label} href={href} style={{ fontSize: "12px", color: "rgba(255,255,255,0.28)", textDecoration: "none" }}>{label}</a>
          ))}
        </div>
      </footer>

      {/* ── Forgot-password banners (unchanged from confirmation redesign) ── */}
      <style>{`
        @keyframes bannerIn {
          from { opacity:0; transform:translateX(-50%) translateY(-10px); }
          to   { opacity:1; transform:translateX(-50%) translateY(0); }
        }
      `}</style>
      {forgotError && (
        <div style={{
          position:"fixed", top:"env(safe-area-inset-top, 0px)", left:"50%",
          transform:"translateX(-50%)", zIndex:1001, marginTop:"16px",
          width:"calc(100% - 40px)", maxWidth:"420px",
          padding:"14px 18px", borderRadius:"12px",
          display:"flex", alignItems:"center", gap:"14px",
          background:"#1a1814",
          border:"1px solid rgba(255,100,90,0.25)",
          boxShadow:"0 4px 28px rgba(0,0,0,0.28)",
          animation:"bannerIn 0.3s cubic-bezier(0.0,0.0,0.2,1.0) both",
        }}>
          <svg width="34" height="34" viewBox="0 0 34 34" fill="none" style={{flexShrink:0}}>
            <circle cx="17" cy="17" r="16" stroke="#ff6961" strokeWidth="1" opacity="0.55"/>
            <circle cx="17" cy="17" r="12" stroke="#ff6961" strokeWidth="1.4"/>
            <path d="M12 12l10 10M22 12l-10 10" stroke="#ff6961" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:"13px", fontWeight:"700", color:"#ff6961", letterSpacing:"-0.1px", marginBottom:"3px" }}>Enter your email first</div>
            <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.42)" }}>Type your email above, then tap Forgot password.</div>
          </div>
        </div>
      )}
      {forgotSent && (
        <div style={{
          position:"fixed", top:"env(safe-area-inset-top, 0px)", left:"50%",
          transform:"translateX(-50%)", zIndex:1001, marginTop:"16px",
          width:"calc(100% - 40px)", maxWidth:"420px",
          padding:"14px 18px", borderRadius:"12px",
          display:"flex", alignItems:"center", gap:"14px",
          background:"#F6F2E9",
          border:"1px solid rgba(196,154,60,0.28)",
          boxShadow:"0 4px 28px rgba(0,0,0,0.24)",
          animation:"bannerIn 0.3s cubic-bezier(0.0,0.0,0.2,1.0) both",
        }}>
          <svg width="34" height="34" viewBox="0 0 34 34" fill="none" style={{flexShrink:0}}>
            <circle cx="17" cy="17" r="16" stroke="#C49A3C" strokeWidth="1" strokeDasharray="4 2.5" opacity="0.5"/>
            <circle cx="17" cy="17" r="12" stroke="#C49A3C" strokeWidth="1.4"/>
            <path d="M11 17l4.5 4.5 7.5-8" stroke="#C49A3C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:"13px", fontWeight:"700", color:"#1a1814", letterSpacing:"-0.1px", marginBottom:"3px" }}>Reset email sent</div>
            <div style={{ fontSize:"12px", color:"rgba(26,24,20,0.5)" }}>Check your inbox — link expires in 1 hour.</div>
          </div>
        </div>
      )}

      {/* ── Auth modal ──────────────────────────────────────────────────── */}
      {authMode && (
        <AuthModal
          mode={authMode}
          onClose={() => setAuthMode(null)}
          onEnter={onEnter}
          onSwitchMode={setAuthMode}
          onForgotPassword={handleForgotPassword}
        />
      )}
    </div>
  );
}
