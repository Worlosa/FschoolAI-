import { useState, useEffect, useRef } from "react";

/* ─── School database ──────────────────────────────────────────────────────── */

const VERIFIED_SCHOOL_DB = [
  { name: "University of British Columbia", country: "Canada", status: "supported", loginUrl: "https://canvas.ubc.ca", tokenFlow: "selfServe", aliases: ["UBC"], domain: "ubc.ca" },
  { name: "Simon Fraser University", country: "Canada", status: "supported", loginUrl: "https://canvas.sfu.ca", tokenFlow: "selfServe", aliases: ["SFU"], domain: "sfu.ca" },
  { name: "University of Toronto", country: "Canada", status: "needsApplication", loginUrl: "https://q.utoronto.ca", tokenFlow: "needsApplication", aliases: ["UofT", "U of T", "UToronto"], domain: "utoronto.ca" },
  { name: "University of Sydney", country: "Australia", status: "needsApplication", loginUrl: "https://canvas.sydney.edu.au", tokenFlow: "needsApplication", aliases: ["USYD", "USyd"], domain: "sydney.edu.au" },
  { name: "University of Technology Sydney", country: "Australia", status: "supported", loginUrl: "https://canvas.uts.edu.au", tokenFlow: "selfServe", aliases: ["UTS"], domain: "uts.edu.au" },
  { name: "Texas A&M University", country: "USA", status: "comingSoon", loginUrl: "", tokenFlow: "restricted", aliases: ["TAMU", "Texas A&M"], domain: "tamu.edu" },
  { name: "Cornell University", country: "USA", status: "comingSoon", loginUrl: "", tokenFlow: "restricted", aliases: ["Cornell"], domain: "cornell.edu" },
  { name: "University of Melbourne", country: "Australia", status: "comingSoon", loginUrl: "", tokenFlow: "restricted", aliases: ["UniMelb", "Melbourne Uni"], domain: "unimelb.edu.au" },
  { name: "Australian National University", country: "Australia", status: "supported", loginUrl: "https://canvas.anu.edu.au", tokenFlow: "selfServe", aliases: ["ANU"], domain: "anu.edu.au" },
  { name: "University of Newcastle", country: "Australia", status: "supported", loginUrl: "https://canvas.newcastle.edu.au", tokenFlow: "selfServe", aliases: ["UON", "Newcastle Uni"], domain: "newcastle.edu.au" },
  { name: "University of Texas at Austin", country: "USA", status: "supported", loginUrl: "https://canvas.utexas.edu", tokenFlow: "selfServe", aliases: ["UT Austin", "UTX", "UT"], domain: "utexas.edu" },
  { name: "Rutgers University", country: "USA", status: "supported", loginUrl: "https://canvas.rutgers.edu", tokenFlow: "selfServe", aliases: ["Rutgers"], domain: "rutgers.edu" },
  { name: "University of Illinois Urbana-Champaign", country: "USA", status: "supported", loginUrl: "https://canvas.illinois.edu", tokenFlow: "selfServe", aliases: ["UIUC", "Illinois", "U of I"], domain: "illinois.edu" },
  { name: "University of Illinois Chicago", country: "USA", status: "supported", loginUrl: "https://uic.instructure.com", tokenFlow: "selfServe", aliases: ["UIC"], domain: "uic.edu" },
  { name: "Temple University", country: "USA", status: "supported", loginUrl: "https://templeu.instructure.com", tokenFlow: "selfServe", aliases: ["Temple"], domain: "temple.edu" },
  { name: "Ohio University", country: "USA", status: "supported", loginUrl: "https://canvas.ohio.edu", tokenFlow: "selfServe", aliases: ["OU", "Ohio U"], domain: "ohio.edu" },
  { name: "University of Oxford", country: "UK", status: "supported", loginUrl: "https://canvas.ox.ac.uk", tokenFlow: "selfServe", aliases: ["Oxford"], domain: "ox.ac.uk" },
  { name: "University of Liverpool", country: "UK", status: "supported", loginUrl: "https://canvas.liverpool.ac.uk", tokenFlow: "selfServe", aliases: ["Liverpool"], domain: "liverpool.ac.uk" },
  { name: "City University of Hong Kong", country: "Hong Kong", status: "supported", loginUrl: "https://canvas.cityu.edu.hk", tokenFlow: "selfServe", aliases: ["CityU", "CityUHK"], domain: "cityu.edu.hk" },
  { name: "University of the Witwatersrand", country: "South Africa", status: "supported", loginUrl: "https://ulwazi.wits.ac.za", tokenFlow: "selfServe", aliases: ["Wits", "Wits University"], domain: "wits.ac.za" },
];

/* ─── Search helpers ───────────────────────────────────────────────────────── */

function normalizeQuery(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

function getSearchTerms(school) {
  const terms = [
    school.name.toLowerCase(),
    ...(school.aliases || []).map(a => a.toLowerCase()),
  ];
  const base = school.name.replace(/^university of /i, "").replace(/^the /i, "").toLowerCase();
  if (!terms.includes(base)) terms.push(base);
  const initials = school.name
    .split(/\s+/)
    .filter(w => /[A-Za-z]/.test(w[0] || ""))
    .map(w => w[0])
    .join("")
    .toLowerCase();
  if (initials.length > 1 && !terms.includes(initials)) terms.push(initials);
  return terms;
}

function schoolMatches(school, query) {
  return getSearchTerms(school).some(t => t.includes(query));
}

const BLOCKED_KEYWORDS = new Set([
  "canvas", "lms", "moodle", "d2l", "portal", "learn",
  "acorn", "brightspace", "courses", "q",
]);

const DOMAIN_MAP = Object.fromEntries(
  VERIFIED_SCHOOL_DB.filter(s => s.domain).map(s => [s.domain, s])
);

function inferNameFromHost(host) {
  const main = host.replace(/^(canvas|learn|portal|courses|my)\./i, "").split(".")[0];
  return main.charAt(0).toUpperCase() + main.slice(1);
}

function inferFromHostname(text) {
  try {
    const raw = text.includes("://") ? text : "https://" + text;
    const hostname = new URL(raw).hostname.replace(/^www\./, "");
    for (const [domain, school] of Object.entries(DOMAIN_MAP)) {
      if (hostname === domain || hostname.endsWith("." + domain)) return school;
    }
    return { name: inferNameFromHost(hostname), isCustom: true, status: "needsVerification" };
  } catch {
    return null;
  }
}

function searchSchools(query) {
  const norm = normalizeQuery(query);
  if (!norm || BLOCKED_KEYWORDS.has(norm)) return [];
  let results = VERIFIED_SCHOOL_DB.filter(s => schoolMatches(s, norm));
  if (results.length === 0) {
    const inferred = inferFromHostname(query);
    if (inferred) results = [inferred];
  }
  if (results.length === 0) {
    results = [{ name: query, isCustom: true, status: "needsVerification" }];
  }
  return results.slice(0, 8);
}

/* ─── Canvas fetch ─────────────────────────────────────────────────────────── */

async function fetchCanvasCourses(baseUrl, token) {
  const clean = baseUrl.replace(/\/+$/, "");
  let courses = [];
  let path = "/api/v1/courses?enrollment_state=active&include[]=total_scores";
  let usedFallback = false;
  let pages = 0;

  while (path && pages < 20 && courses.length < 12) {
    const url = `/api/canvas?base=${encodeURIComponent(clean)}&path=${encodeURIComponent(path)}&token=${encodeURIComponent(token)}`;
    let res;
    try { res = await fetch(url); } catch { break; }
    if (!res.ok) {
      if (!usedFallback) {
        path = "/api/v1/courses?include[]=total_scores";
        usedFallback = true;
        continue;
      }
      break;
    }
    const data = await res.json().catch(() => []);
    if (Array.isArray(data)) courses = [...courses, ...data];
    const link = res.headers.get("Link");
    const m = link?.match(/<([^>]+)>;\s*rel="next"/);
    if (m) {
      try {
        const next = new URL(m[1]);
        path = next.pathname + next.search;
      } catch { path = null; }
    } else {
      path = null;
    }
    pages++;
  }
  return courses.slice(0, 12);
}

/* ─── Goals ────────────────────────────────────────────────────────────────── */

const GOALS = [
  { id: "next_steps",         label: "Know what to do next" },
  { id: "deadlines",          label: "Keep up with every deadline" },
  { id: "assignment_support", label: "Get assignment support" },
  { id: "study_effectively",  label: "Study more effectively" },
  { id: "improve_results",    label: "Improve my results" },
  { id: "graduate_track",     label: "Stay on track to graduate" },
];

/* ─── Status helpers ───────────────────────────────────────────────────────── */

function statusColor(s) {
  if (s === "supported") return "rgba(52,199,89,0.9)";
  if (s === "needsApplication") return "rgba(255,196,0,0.9)";
  return "rgba(255,255,255,0.28)";
}

function statusBg(s) {
  if (s === "supported") return "rgba(52,199,89,0.1)";
  if (s === "needsApplication") return "rgba(255,196,0,0.1)";
  return "rgba(255,255,255,0.06)";
}

function statusLabel(s) {
  if (s === "supported") return "Supported";
  if (s === "needsApplication") return "Apply first";
  if (s === "comingSoon") return "Coming soon";
  return "Custom";
}

function safeHostname(url) {
  try { return new URL(url).hostname; } catch { return url; }
}

/* ─── Default draft ────────────────────────────────────────────────────────── */

function defaultDraft(email, initName) {
  return {
    email: email || "",
    preferredName: initName || "",
    schoolName: "",
    schoolSearchQuery: "",
    schoolStatus: "",
    schoolLoginUrl: "",
    schoolTokenFlow: "",
    manualCanvasUrl: "",
    token: "",
    isCustomSchool: false,
    goals: [],
    onboardingComplete: false,
  };
}

/* ─── Shared input style ───────────────────────────────────────────────────── */

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "14px",
  padding: "16px 18px",
  color: "#F5F5F5",
  fontSize: "15px",
  outline: "none",
  fontFamily: "inherit",
};

/* ─── Main component ───────────────────────────────────────────────────────── */

export default function Onboarding({ email, preferredName: initName, onComplete }) {
  const [step, setStep] = useState(0); // 0 | 1 | 2 | "gen"
  const [draft, setDraft] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("sa_onboarding_draft") || "{}");
      if (saved.email === email) return { ...defaultDraft(email, initName), ...saved };
    } catch {}
    return defaultDraft(email, initName);
  });

  const [schoolResults, setSchoolResults] = useState([]);
  const [showDropdown, setShowDropdown]   = useState(false);
  const [toast, setToast]                 = useState("");
  const [genLines, setGenLines]           = useState([]);

  const toastTimer   = useRef(null);
  const searchTimer  = useRef(null);
  const dropdownRef  = useRef(null);

  // Persist draft
  useEffect(() => {
    try { localStorage.setItem("sa_onboarding_draft", JSON.stringify(draft)); } catch {}
  }, [draft]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* ── Toast ──────────────────────────────────────────────────────────────── */
  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3000);
  }

  /* ── School search ──────────────────────────────────────────────────────── */
  function handleSchoolQuery(q) {
    setDraft(d => ({
      ...d,
      schoolSearchQuery: q,
      schoolName: "",
      schoolStatus: "",
      schoolLoginUrl: "",
      schoolTokenFlow: "",
      isCustomSchool: false,
    }));
    setShowDropdown(true);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSchoolResults(q.trim() ? searchSchools(q) : []);
    }, 150);
  }

  function selectSchool(school) {
    setDraft(d => ({
      ...d,
      schoolName:        school.name,
      schoolSearchQuery: school.name,
      schoolStatus:      school.status || "needsVerification",
      schoolLoginUrl:    school.loginUrl || "",
      schoolTokenFlow:   school.tokenFlow || "",
      isCustomSchool:    !!school.isCustom,
    }));
    setShowDropdown(false);
  }

  /* ── Conditional field logic ────────────────────────────────────────────── */
  const needsManualUrl = () =>
    draft.isCustomSchool || ["needsVerification", "comingSoon"].includes(draft.schoolStatus);

  const needsToken = () =>
    ["selfServe", "needsApplication"].includes(draft.schoolTokenFlow);

  /* ── Navigation ─────────────────────────────────────────────────────────── */
  function handleNext() {
    if (step === 0) {
      if (!draft.preferredName.trim()) { showToast("Tell me your name first"); return; }
      setStep(1);
      return;
    }
    if (step === 1) {
      if (!draft.schoolName && !draft.manualCanvasUrl.trim()) {
        showToast("Select a school result or add a manual Canvas URL first");
        return;
      }
      if (needsManualUrl() && !draft.manualCanvasUrl.trim()) {
        showToast("Add your Canvas URL to continue");
        return;
      }
      if (needsToken() && !draft.token.trim()) {
        showToast("Add your Canvas token to continue");
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep("gen");
      runGeneration();
    }
  }

  function handleBack() {
    if (step === 1) setStep(0);
    else if (step === 2) setStep(1);
  }

  function skipToStep2() {
    setStep(2);
  }

  /* ── Generation ─────────────────────────────────────────────────────────── */
  async function runGeneration() {
    const base  = draft.manualCanvasUrl || draft.schoolLoginUrl;
    const token = draft.token;

    let courses = [];
    if (base && token) {
      try { courses = await fetchCanvasCourses(base, token); } catch {}
    }

    const schoolDisplay = draft.schoolName || draft.manualCanvasUrl || "";
    const seq = [
      "Connecting to Canvas...",
      ...(schoolDisplay ? [schoolDisplay] : []),
      ...(courses.length > 0
        ? [
            `${courses.length} course${courses.length !== 1 ? "s" : ""} synced`,
            ...courses.slice(0, 8).map(c => `  · ${c.name || c.course_code || "Course"}`),
          ]
        : []),
      `Welcome, ${draft.preferredName}!`,
    ];

    for (let i = 0; i < seq.length; i++) {
      await new Promise(r => setTimeout(r, i === 0 ? 300 : 420));
      setGenLines(prev => [...prev, seq[i]]);
    }

    await new Promise(r => setTimeout(r, 700));

    // Persist completion
    try {
      localStorage.setItem("sa_onboarding_draft", JSON.stringify({ ...draft, onboardingComplete: true }));
      if (draft.schoolName) localStorage.setItem("sa_school_name", draft.schoolName);
      if (base && token) {
        localStorage.setItem("sa_token", token);
        localStorage.setItem("sa_base", base);
      }
    } catch {}

    onComplete({
      preferredName: draft.preferredName,
      schoolName:    draft.schoolName,
      token,
      baseUrl:       base,
      goals:         draft.goals,
    });
  }

  /* ── Progress ───────────────────────────────────────────────────────────── */
  const progress = step === "gen" ? 100 : ((Number(step) + 1) / 3) * 100;

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "#111",
      display: "flex", flexDirection: "column",
      fontFamily: "var(--font-sans, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif)",
      overflowY: step === "gen" ? "hidden" : "auto",
    }}>
      <style>{`
        @keyframes obFadeIn  { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes obBlink   { 0%,100%{ opacity:0.25; } 50%{ opacity:0.65; } }
        @keyframes obToastUp { from { opacity:0; transform:translateX(-50%) translateY(6px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
        .ob-back:hover  { color: rgba(255,255,255,0.6) !important; }
        .ob-skip:hover  { color: rgba(255,255,255,0.35) !important; }
        .ob-pill:hover  { transform: translateY(-1px); }
        .ob-cont:hover  { background: #fff !important; transform: translateY(-1px); }
        .ob-cont:active { transform: translateY(0); }
        .ob-result:hover{ background: rgba(255,255,255,0.05) !important; }
      `}</style>

      {/* Progress bar */}
      {step !== "gen" && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "2px", background: "rgba(255,255,255,0.06)", zIndex: 20 }}>
          <div style={{
            height: "100%",
            background: "rgba(255,255,255,0.5)",
            width: `${progress}%`,
            transition: "width 0.4s cubic-bezier(0.25,0.46,0.45,0.94)",
          }} />
        </div>
      )}

      {/* Content area */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "72px 28px 36px",
        maxWidth: "540px",
        margin: "0 auto",
        width: "100%",
        boxSizing: "border-box",
      }}>

        {/* ── Generation screen ─────────────────────────────────────────── */}
        {step === "gen" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {genLines.map((line, i) => (
                <div key={i} style={{
                  color: line.startsWith("Welcome")
                    ? "#F5F5F5"
                    : line.startsWith("  ·")
                      ? "rgba(255,255,255,0.3)"
                      : "rgba(255,255,255,0.55)",
                  fontSize: line.startsWith("Welcome") ? "26px" : line.startsWith("  ·") ? "13px" : "15px",
                  fontWeight: line.startsWith("Welcome") ? "700" : "400",
                  fontFamily: line.startsWith("Welcome")
                    ? "var(--font-sans, sans-serif)"
                    : "'SF Mono', 'Fira Mono', monospace",
                  letterSpacing: line.startsWith("Welcome") ? "-0.6px" : "0",
                  lineHeight: "1.5",
                  animation: "obFadeIn 0.3s ease",
                }}>
                  {line}
                </div>
              ))}
              <span style={{
                width: "8px", height: "16px",
                background: "rgba(255,255,255,0.35)",
                display: "inline-block",
                marginTop: "4px",
                animation: "obBlink 1s ease-in-out infinite",
              }} />
            </div>
          </div>
        )}

        {/* ── Step screens ──────────────────────────────────────────────── */}
        {step !== "gen" && (
          <>
            {/* Back button */}
            {(step === 1 || step === 2) && (
              <button
                className="ob-back"
                onClick={handleBack}
                style={{
                  background: "none", border: "none",
                  color: "rgba(255,255,255,0.28)",
                  fontSize: "14px", cursor: "pointer",
                  fontFamily: "inherit", padding: "0",
                  marginBottom: "28px", alignSelf: "flex-start",
                  transition: "color 0.15s",
                }}
              >
                ← Back
              </button>
            )}

            {/* ── Step 0: Name ─────────────────────────────────────────── */}
            {step === 0 && (
              <div style={{ animation: "obFadeIn 0.3s ease", flex: 1 }}>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.22)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: "18px" }}>
                  1 of 3
                </p>
                <h1 style={{ color: "#F5F5F5", fontSize: "34px", fontWeight: "700", letterSpacing: "-1px", lineHeight: "1.1", marginBottom: "10px" }}>
                  What should I call you?
                </h1>
                <p style={{ color: "rgba(255,255,255,0.32)", fontSize: "15px", marginBottom: "36px", lineHeight: "1.65" }}>
                  Your agent will use this every day.
                </p>
                <input
                  id="preferredNameInput"
                  autoFocus
                  placeholder="Preferred name"
                  value={draft.preferredName}
                  onChange={e => setDraft(d => ({ ...d, preferredName: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && handleNext()}
                  style={inputStyle}
                />
              </div>
            )}

            {/* ── Step 1: University ───────────────────────────────────── */}
            {step === 1 && (
              <div style={{ animation: "obFadeIn 0.3s ease", flex: 1 }}>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.22)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: "18px" }}>
                  2 of 3
                </p>
                <h1 style={{ color: "#F5F5F5", fontSize: "34px", fontWeight: "700", letterSpacing: "-1px", lineHeight: "1.1", marginBottom: "10px" }}>
                  Where do you study?
                </h1>
                <p style={{ color: "rgba(255,255,255,0.32)", fontSize: "15px", marginBottom: "28px", lineHeight: "1.65" }}>
                  Search your university to link Canvas courses and deadlines.
                </p>

                {/* School search */}
                <div ref={dropdownRef} style={{ position: "relative", marginBottom: "12px" }}>
                  <input
                    autoFocus
                    placeholder="Search your university..."
                    value={draft.schoolSearchQuery}
                    onChange={e => handleSchoolQuery(e.target.value)}
                    onFocus={() => draft.schoolSearchQuery && setShowDropdown(true)}
                    style={{
                      ...inputStyle,
                      border: `1px solid ${draft.schoolName ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)"}`,
                    }}
                  />
                  {showDropdown && schoolResults.length > 0 && (
                    <div style={{
                      position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
                      background: "rgba(16,16,18,0.98)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "14px",
                      overflow: "hidden",
                      boxShadow: "0 20px 50px rgba(0,0,0,0.65)",
                      zIndex: 200,
                    }}>
                      {schoolResults.map((s, i) => (
                        <button
                          key={i}
                          className="ob-result"
                          onClick={() => selectSchool(s)}
                          style={{
                            display: "block", width: "100%", textAlign: "left",
                            padding: "13px 18px",
                            background: "none", border: "none",
                            borderBottom: i < schoolResults.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                            cursor: "pointer", fontFamily: "inherit",
                            transition: "background 0.1s",
                          }}
                        >
                          <div style={{ color: "#F5F5F5", fontSize: "14px", fontWeight: "500", marginBottom: "3px" }}>
                            {s.name}
                          </div>
                          <div style={{ fontSize: "11px", color: statusColor(s.status) }}>
                            {statusLabel(s.status)}{s.country ? ` · ${s.country}` : ""}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected school badge */}
                {draft.schoolName && !showDropdown && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", paddingLeft: "2px" }}>
                    <span style={{
                      fontSize: "11px", padding: "3px 10px", borderRadius: "20px",
                      background: statusBg(draft.schoolStatus),
                      color: statusColor(draft.schoolStatus),
                    }}>
                      {statusLabel(draft.schoolStatus)}
                    </span>
                    {draft.schoolLoginUrl && (
                      <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)" }}>
                        {safeHostname(draft.schoolLoginUrl)}
                      </span>
                    )}
                  </div>
                )}

                {/* Manual Canvas URL */}
                {needsManualUrl() && (
                  <input
                    placeholder="Canvas URL — e.g. canvas.youruni.edu"
                    value={draft.manualCanvasUrl}
                    onChange={e => setDraft(d => ({ ...d, manualCanvasUrl: e.target.value }))}
                    style={{ ...inputStyle, marginBottom: "12px" }}
                  />
                )}

                {/* Canvas token */}
                {(needsToken() || needsManualUrl()) && (
                  <div>
                    <input
                      placeholder="Canvas access token"
                      type="password"
                      value={draft.token}
                      onChange={e => setDraft(d => ({ ...d, token: e.target.value }))}
                      style={inputStyle}
                    />
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.18)", marginTop: "8px", paddingLeft: "2px" }}>
                      {draft.schoolLoginUrl
                        ? `${safeHostname(draft.schoolLoginUrl)}/profile/settings → New Access Token`
                        : "Canvas → Account → Settings → New Access Token"}
                    </p>
                  </div>
                )}

                <button
                  className="ob-skip"
                  onClick={skipToStep2}
                  style={{
                    background: "none", border: "none",
                    color: "rgba(255,255,255,0.18)",
                    fontSize: "13px", cursor: "pointer",
                    fontFamily: "inherit", marginTop: "22px",
                    display: "block", padding: "0",
                    transition: "color 0.15s",
                  }}
                >
                  Skip for now →
                </button>
              </div>
            )}

            {/* ── Step 2: Goals ────────────────────────────────────────── */}
            {step === 2 && (
              <div style={{ animation: "obFadeIn 0.3s ease", flex: 1 }}>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.22)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: "18px" }}>
                  3 of 3
                </p>
                <h1 style={{ color: "#F5F5F5", fontSize: "34px", fontWeight: "700", letterSpacing: "-1px", lineHeight: "1.1", marginBottom: "10px" }}>
                  What brings you here?
                </h1>
                <p style={{ color: "rgba(255,255,255,0.32)", fontSize: "15px", marginBottom: "28px", lineHeight: "1.65" }}>
                  Select everything that applies.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  {GOALS.map(g => {
                    const on = draft.goals.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        className="ob-pill"
                        onClick={() => setDraft(d => ({
                          ...d,
                          goals: on
                            ? d.goals.filter(x => x !== g.id)
                            : [...d.goals, g.id],
                        }))}
                        style={{
                          background: on ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                          border: `1px solid ${on ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)"}`,
                          borderRadius: "100px",
                          padding: "9px 16px",
                          color: on ? "#F5F5F5" : "rgba(255,255,255,0.42)",
                          fontSize: "14px",
                          cursor: "pointer",
                          fontFamily: "inherit",
                          transition: "all 0.15s",
                        }}
                      >
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Continue button */}
            <button
              className="ob-cont"
              onClick={handleNext}
              style={{
                width: "100%",
                marginTop: "32px",
                background: "rgba(255,255,255,0.92)",
                color: "#111",
                border: "none",
                borderRadius: "14px",
                padding: "16px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "background 0.15s, transform 0.15s",
              }}
            >
              {step === 2 ? "Finish →" : "Continue →"}
            </button>
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed",
          bottom: 48,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(22,22,26,0.97)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "12px",
          padding: "10px 18px",
          color: "#F5F5F5",
          fontSize: "14px",
          zIndex: 1000,
          whiteSpace: "nowrap",
          animation: "obToastUp 0.2s ease",
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
