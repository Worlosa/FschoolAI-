// Toolkit.jsx — 4-tab data browser + interactive SVG knowledge graph.
// Tabs: Class Notes | Recordings | Previous Work | Saved Drafts
// Knowledge graph shows concept connections across courses with hover highlighting.

import { useState, useEffect, useRef } from "react";

import { useApp } from "../context/AppContext";
import { groq }   from "../api/groq";

// ── Static fallback graph (used when no Canvas data) ─────────────────────────
const FALLBACK_NODES = [
  { id: "wm",   label: "Working Memory",  course: "PSYC 302", x: 90,  y: 62,  desc: "Short-term system that holds and manipulates information for reasoning and learning — capacity is ~4 chunks." },
  { id: "cl",   label: "Cognitive Load",  course: "PSYC 302", x: 200, y: 106, desc: "Total mental effort in working memory, split across intrinsic, extraneous, and germane load." },
  { id: "dp",   label: "Dynamic Prog.",   course: "CS 355",   x: 318, y: 55,  desc: "Optimization technique that solves overlapping subproblems once and stores results in a table." },
  { id: "memo", label: "Memoization",     course: "CS 355",   x: 372, y: 118, desc: "Top-down DP strategy: cache return values so repeated calls are O(1) lookups." },
  { id: "pff",  label: "Five Forces",     course: "BUS 410",  x: 48,  y: 185, desc: "Porter's framework measuring industry attractiveness via five competitive pressures." },
  { id: "ca",   label: "Comp. Advantage", course: "BUS 410",  x: 165, y: 218, desc: "Sustainable edge over rivals through cost leadership, differentiation, or niche focus." },
  { id: "ode",  label: "Linear ODEs",     course: "MATH 241", x: 290, y: 192, desc: "Differential equations where the unknown appears linearly, solved via integrating factors or characteristic equations." },
  { id: "if",   label: "Int. Factor",     course: "MATH 241", x: 358, y: 228, desc: "Multiplier μ(x) that converts a non-exact first-order ODE into exact form." },
];
const FALLBACK_EDGES = [
  { from: "wm", to: "cl" }, { from: "dp", to: "memo" }, { from: "pff", to: "ca" }, { from: "ode", to: "if" },
  { from: "wm", to: "dp" }, { from: "cl", to: "pff" }, { from: "memo", to: "ode" },
];
const FALLBACK_COLORS = { "PSYC 302": "#64b4ff", "CS 355": "#64dc9b", "BUS 410": "#ffc364", "MATH 241": "#be82ff" };

// Positions pool for up to 12 nodes spread across the SVG viewBox
const NODE_POSITIONS = [
  { x: 90,  y: 62  }, { x: 200, y: 106 }, { x: 318, y: 55  }, { x: 372, y: 118 },
  { x: 48,  y: 185 }, { x: 165, y: 218 }, { x: 290, y: 192 }, { x: 358, y: 228 },
  { x: 130, y: 140 }, { x: 255, y: 150 }, { x: 395, y: 168 }, { x: 220, y: 38  },
];

const COLOR_PALETTE = ["#64b4ff", "#64dc9b", "#ffc364", "#be82ff", "#ff8080", "#4ecdc4", "#ffe66d", "#a8e6cf"];

async function buildGraphFromCanvas(courses, assignments) {
  const courseSummary = courses.slice(0, 6).map(c => {
    const names = assignments
      .filter(a => a.courseId === c.id || a.courseCode === c.courseCode)
      .slice(0, 5)
      .map(a => a.name || a.title)
      .filter(Boolean);
    return `${c.courseCode || c.name}: ${names.join(", ") || "(no assignments)"}`;
  }).join("\n");

  const prompt = `You are a university professor. Given these courses and their assignment names, infer the underlying academic topics being taught and build a knowledge graph of those concepts.

Courses and assignments:
${courseSummary}

From the assignment names, identify the core academic topics (e.g. "Dijkstra's Algorithm", "Supply & Demand", "Neurotransmission") — not the assignment titles themselves.

Return ONLY a JSON object — no markdown, no explanation — with this exact shape:
{
  "nodes": [
    { "id": "short_id", "label": "2-3 word topic name", "course": "course code", "desc": "One precise sentence explaining the core mechanism or principle of this topic, specific enough to be educational." }
  ],
  "edges": [{ "from": "id1", "to": "id2" }]
}

Rules:
- 6-10 nodes, each a distinct academic concept inferred from the assignments
- Labels must be the topic name (e.g. "Gradient Descent", "Market Equilibrium"), NOT assignment names
- desc is exactly one sentence, deep and specific — explain the mechanism, not just a definition
- 4-8 edges: include same-course concept chains AND cross-course conceptual links
- course field must exactly match one of the course codes listed above`;

  const raw = await groq([{ role: "user", content: prompt }], "");

  let json = raw.trim();
  if (json.startsWith("```")) json = json.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim();

  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) throw new Error("bad shape");

  const uniqueCourses = [...new Set(parsed.nodes.map(n => n.course))];
  const courseColors = {};
  uniqueCourses.forEach((c, i) => { courseColors[c] = COLOR_PALETTE[i % COLOR_PALETTE.length]; });

  const nodes = parsed.nodes.map((n, i) => ({
    ...n,
    x: NODE_POSITIONS[i % NODE_POSITIONS.length].x,
    y: NODE_POSITIONS[i % NODE_POSITIONS.length].y,
  }));

  const nodeIds = new Set(nodes.map(n => n.id));
  const edges = parsed.edges.filter(e => nodeIds.has(e.from) && nodeIds.has(e.to));

  return { nodes, edges, courseColors };
}

function KnowledgeGraph({ courses, assignments }) {
  const [graphData, setGraphData] = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [hovered,   setHovered]   = useState(null);

  useEffect(() => {
    if (!courses || courses.length === 0) {
      setGraphData({ nodes: FALLBACK_NODES, edges: FALLBACK_EDGES, courseColors: FALLBACK_COLORS });
      return;
    }

    const cacheKey = `kg_v2_${courses.map(c => c.id || c.name).sort().join("_")}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try { setGraphData(JSON.parse(cached)); return; } catch {}
    }

    setLoading(true);
    buildGraphFromCanvas(courses, assignments)
      .then(data => {
        localStorage.setItem(cacheKey, JSON.stringify(data));
        setGraphData(data);
      })
      .catch(() => {
        setGraphData({ nodes: FALLBACK_NODES, edges: FALLBACK_EDGES, courseColors: FALLBACK_COLORS });
      })
      .finally(() => setLoading(false));
  }, [courses, assignments]);

  const handleNodeTouch = (id, e) => {
    e.stopPropagation(); e.preventDefault();
    setHovered(h => h === id ? null : id);
  };
  const handleSvgTouch = (e) => {
    if (e.target === e.currentTarget || e.target.tagName === "svg") setHovered(null);
  };

  const { nodes = [], edges = [], courseColors = {} } = graphData ?? {};

  const adjacentIds = hovered
    ? new Set(edges.filter(e => e.from === hovered || e.to === hovered).flatMap(e => [e.from, e.to]))
    : null;
  const isNodeActive = (id) => !hovered || adjacentIds.has(id);
  const isEdgeActive = (e)  => !hovered || e.from === hovered || e.to === hovered;

  return (
    <div
      style={{
        background:   "rgba(255,255,255,0.02)",
        border:       "1px solid rgba(255,255,255,0.06)",
        borderRadius: "var(--radius-card)",
        padding:      "16px",
        marginBottom: "24px",
        overflow:     "hidden",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <p style={{ fontSize: "11px", color: "var(--text-dim)", letterSpacing: "2px", textTransform: "uppercase" }}>
          Knowledge Graph
        </p>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {Object.entries(courseColors).map(([course, color]) => (
            <span key={course} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block" }} />
              <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>{course.split(" ")[0]}</span>
            </span>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ height: "200px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)", letterSpacing: "1px" }}>Generating graph…</p>
        </div>
      ) : (
        <svg
          viewBox="0 0 420 260"
          width="100%"
          height="200"
          style={{ overflow: "visible" }}
          onTouchStart={handleSvgTouch}
        >
          {edges.map((e, i) => {
            const from = nodes.find(n => n.id === e.from);
            const to   = nodes.find(n => n.id === e.to);
            if (!from || !to) return null;
            const active  = isEdgeActive(e);
            const isCross = from.course !== to.course;
            return (
              <line
                key={i}
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={isCross ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.10)"}
                strokeWidth={isCross ? 1 : 0.8}
                strokeDasharray={isCross ? "3 4" : "none"}
                opacity={active ? 1 : 0.08}
                style={{ transition: "opacity 0.2s" }}
              />
            );
          })}

          {nodes.map((node) => {
            const active  = isNodeActive(node.id);
            const isHover = hovered === node.id;
            const color   = courseColors[node.course] ?? "#ffffff";
            return (
              <g
                key={node.id}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                onTouchStart={e => handleNodeTouch(node.id, e)}
                style={{ cursor: "pointer" }}
              >
                {isHover && <circle cx={node.x} cy={node.y} r={14} fill={color} opacity={0.12} />}
                <circle
                  cx={node.x} cy={node.y} r={isHover ? 7 : 5}
                  fill={color}
                  opacity={active ? (isHover ? 1 : 0.75) : 0.12}
                  style={{ transition: "r 0.18s, opacity 0.2s" }}
                />
                <text
                  x={node.x} y={node.y - 12}
                  textAnchor="middle"
                  fontSize={isHover ? "9" : "8"}
                  fill={color}
                  opacity={active ? (isHover ? 1 : 0.65) : 0.1}
                  style={{ transition: "opacity 0.2s, font-size 0.15s", pointerEvents: "none", fontFamily: "var(--font-sans)" }}
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      )}

      <div style={{ minHeight: "44px", marginTop: "8px", padding: "0 2px" }}>
        {hovered ? (() => {
          const n = nodes.find(nd => nd.id === hovered);
          if (!n) return null;
          return (
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "4px" }}>
                <span style={{ color: courseColors[n.course] ?? "#fff", fontSize: "11px", fontWeight: "600" }}>{n.label}</span>
                <span style={{ color: "var(--text-dim)", fontSize: "10px", letterSpacing: "0.5px" }}>{n.course}</span>
              </div>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "11px", lineHeight: "1.55", margin: 0 }}>{n.desc}</p>
            </div>
          );
        })() : (
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)", textAlign: "center", marginTop: "14px" }}>
            Tap or hover a concept to trace connections
          </p>
        )}
      </div>
    </div>
  );
}

// ── Tab content components ────────────────────────────────────────────────────
function ClassNotesTab() {
  const { courses } = useApp();
  const [expanded,    setExpanded]    = useState(null);
  const [courseFiles, setCourseFiles] = useState(() => {
    try { return JSON.parse(localStorage.getItem("toolkit_notes") || "{}"); } catch { return {}; }
  });
  const fileInputRef = useRef(null);
  const [uploadingFor, setUploadingFor] = useState(null);

  function saveFiles(next) {
    setCourseFiles(next);
    localStorage.setItem("toolkit_notes", JSON.stringify(next));
  }

  function handleUploadClick(courseId, e) {
    e.stopPropagation();
    setUploadingFor(courseId);
    fileInputRef.current.click();
  }

  function handleFileChange(e) {
    const files = Array.from(e.target.files);
    if (!files.length || !uploadingFor) return;
    const added = files.map(f => ({ name: f.name, size: f.size, date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }) }));
    const next = { ...courseFiles, [uploadingFor]: [...(courseFiles[uploadingFor] || []), ...added] };
    saveFiles(next);
    e.target.value = "";
    setUploadingFor(null);
  }

  function removeFile(courseId, idx, e) {
    e.stopPropagation();
    const next = { ...courseFiles, [courseId]: courseFiles[courseId].filter((_, i) => i !== idx) };
    saveFiles(next);
  }

  if (!courses || courses.length === 0) {
    return (
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", padding: "24px", textAlign: "center" }}>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "4px" }}>No courses yet</p>
        <p style={{ color: "var(--text-dim)", fontSize: "12px" }}>Connect Canvas to see your courses here</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg" style={{ display: "none" }} onChange={handleFileChange} />
      {courses.map((course) => {
        const cid   = String(course.id);
        const files = courseFiles[cid] || [];
        const color = COLOR_PALETTE[courses.indexOf(course) % COLOR_PALETTE.length];
        const open  = expanded === cid;
        return (
          <div key={cid} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", overflow: "hidden", transition: "background var(--dur-base) var(--ease-apple)" }}>
            <div
              style={{ padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
              onClick={() => setExpanded(open ? null : cid)}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "")}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                  <span style={{ fontSize: "10px", color, fontWeight: "600", letterSpacing: "0.5px" }}>{course.courseCode ?? course.name}</span>
                  <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>{files.length} file{files.length !== 1 ? "s" : ""}</span>
                </div>
                <p style={{ color: "var(--text-primary)", fontSize: "14px", fontWeight: "500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{course.name}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0, marginLeft: "12px" }}>
                <button
                  onClick={(e) => handleUploadClick(cid, e)}
                  style={{ background: "rgba(0,210,190,0.12)", border: "1px solid rgba(0,210,190,0.25)", borderRadius: "8px", color: "rgba(0,210,190,0.8)", fontSize: "11px", padding: "5px 10px", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
                >
                  + Upload
                </button>
                <span style={{ color: "var(--text-dim)", fontSize: "16px" }}>{open ? "↑" : "↓"}</span>
              </div>
            </div>
            {open && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "12px 18px 16px" }}>
                {files.length === 0 ? (
                  <p style={{ color: "var(--text-dim)", fontSize: "12px" }}>No notes uploaded yet — tap Upload to add PDF, doc, or slides</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {files.map((f, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "10px 12px" }}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ color: "var(--text-primary)", fontSize: "13px", fontWeight: "500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</p>
                          <p style={{ color: "var(--text-dim)", fontSize: "11px", marginTop: "2px" }}>{f.date} · {(f.size / 1024).toFixed(0)} KB</p>
                        </div>
                        <button onClick={(e) => removeFile(cid, i, e)} style={{ background: "none", border: "none", color: "rgba(255,100,90,0.6)", fontSize: "16px", cursor: "pointer", padding: "0 4px", flexShrink: 0 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RecordingsTab() {
  return (
    <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", padding: "32px 24px", textAlign: "center" }}>
      <p style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: "500", marginBottom: "6px" }}>Lecture recordings coming soon</p>
      <p style={{ color: "var(--text-dim)", fontSize: "12px", lineHeight: "1.6" }}>
        Go to your Canvas page → tap a course → Record Lecture.<br />
        Transcripts and audio will appear here once Wisprflow is connected.
      </p>
    </div>
  );
}

function PreviousWorkTab() {
  return (
    <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", padding: "32px 24px", textAlign: "center" }}>
      <p style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: "500", marginBottom: "6px" }}>No previous work yet</p>
      <p style={{ color: "var(--text-dim)", fontSize: "12px" }}>Submitted assignments will appear here once Canvas is synced</p>
    </div>
  );
}

function SavedDraftsTab() {
  return (
    <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", padding: "32px 24px", textAlign: "center" }}>
      <p style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: "500", marginBottom: "6px" }}>No saved drafts</p>
      <p style={{ color: "var(--text-dim)", fontSize: "12px" }}>Drafts you save from the Assignment page will appear here</p>
    </div>
  );
}

// ── Main Toolkit component ────────────────────────────────────────────────────
const TABS = [
  { id: "notes",      label: "Class Notes"  },
  { id: "recordings", label: "Recordings"   },
  { id: "previous",   label: "Previous Work"},
  { id: "drafts",     label: "Saved Drafts" },
];

export default function Toolkit() {
  const [activeTab, setActiveTab] = useState("notes");
  const { courses, assignments } = useApp();

  return (
    <div>
      <h1 style={{ fontSize: "26px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px", letterSpacing: "-0.3px" }}>
        Toolkit
      </h1>
      <p style={{ color: "var(--text-dim)", fontSize: "14px", marginBottom: "24px" }}>
        Your AI's knowledge base
      </p>

      <KnowledgeGraph courses={courses} assignments={assignments} />

      {/* Tab strip */}
      <div
        style={{
          display:      "flex",
          gap:          "2px",
          marginBottom: "18px",
          background:   "rgba(255,255,255,0.04)",
          border:       "1px solid var(--color-border)",
          borderRadius: "var(--radius-btn)",
          padding:      "3px",
          overflowX:    "auto",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex:        1,
              background:  activeTab === tab.id ? "rgba(255,255,255,0.09)" : "transparent",
              border:      activeTab === tab.id ? "1px solid rgba(255,255,255,0.12)" : "1px solid transparent",
              borderRadius: "9px",
              padding:     "8px 6px",
              color:       activeTab === tab.id ? "var(--text-primary)" : "var(--text-secondary)",
              fontSize:    "12px",
              fontWeight:  activeTab === tab.id ? "600" : "400",
              cursor:      "pointer",
              fontFamily:  "inherit",
              whiteSpace:  "nowrap",
              transition:  "all var(--dur-fast) var(--ease-apple)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "notes"      && <ClassNotesTab   />}
      {activeTab === "recordings" && <RecordingsTab   />}
      {activeTab === "previous"   && <PreviousWorkTab />}
      {activeTab === "drafts"     && <SavedDraftsTab  />}
    </div>
  );
}
