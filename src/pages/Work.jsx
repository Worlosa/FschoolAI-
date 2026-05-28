// Work.jsx — Home page. Greeting, upcoming assignments with progress bars, bottom stats row.

import { useApp } from "../context/AppContext";

const ASSIGNMENTS = [
  {
    id: 1,
    title: "Research Paper: Cognitive Load Theory",
    course: "PSYC 302",
    due: "Tomorrow",
    urgent: true,
    progress: 65,
  },
  {
    id: 2,
    title: "Problem Set 4 — Differential Equations",
    course: "MATH 241",
    due: "Fri, May 23",
    urgent: false,
    progress: 30,
  },
  {
    id: 3,
    title: "Case Study Analysis: Market Entry Strategy",
    course: "BUS 410",
    due: "Sun, May 25",
    urgent: false,
    progress: 10,
  },
];


const card = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-card)",
  boxShadow: "var(--depth-line)",
};

export default function Work() {
  const { userData, assignments } = useApp();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const name = userData?.name || localStorage.getItem("fschool_name") || "";

  const completedCount = assignments.filter(a => a.submission?.submittedAt).length || 34;
  const STATS = [
    { label: "GPA",       value: userData?.gpa != null ? userData.gpa.toFixed(2) : "3.87" },
    { label: "Streak",    value: `${userData?.streak || 14}d` },
    { label: "Completed", value: completedCount },
  ];

  return (
    <div>
      <h1 style={{ fontSize: "26px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px", letterSpacing: "-0.3px" }}>
        {greeting}{name ? `, ${name}` : ""}
      </h1>
      <p style={{ color: "var(--text-dim)", fontSize: "14px", marginBottom: "28px" }}>
        {ASSIGNMENTS.length} assignments coming up
      </p>

      <p style={{ fontSize: "11px", color: "var(--text-dim)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "12px" }}>
        Upcoming
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px" }}>
        {ASSIGNMENTS.map((a) => (
          <div key={a.id} style={{ ...card, padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
              <div style={{ flex: 1, minWidth: 0, paddingRight: "12px" }}>
                <p style={{ color: "var(--text-primary)", fontSize: "15px", fontWeight: "500", marginBottom: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {a.title}
                </p>
                <p style={{ color: "var(--text-secondary)", fontSize: "12px" }}>{a.course}</p>
              </div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "600",
                  padding: "4px 10px",
                  borderRadius: "20px",
                  flexShrink: 0,
                  background: a.urgent ? "rgba(255,59,48,0.15)" : "var(--color-surface-hover)",
                  color: a.urgent ? "rgba(255,100,90,0.9)" : "var(--text-secondary)",
                  whiteSpace: "nowrap",
                }}
              >
                {a.due}
              </span>
            </div>

            <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "4px", height: "3px" }}>
              <div
                style={{
                  background: "rgba(255,255,255,0.6)",
                  height: "100%",
                  borderRadius: "4px",
                  width: `${a.progress}%`,
                  transition: "width 0.5s var(--ease-apple)",
                }}
              />
            </div>
            <p style={{ color: "var(--text-tertiary)", fontSize: "11px", marginTop: "6px" }}>
              {a.progress}% complete
            </p>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        {STATS.map((s) => (
          <div key={s.label} style={{ ...card, flex: 1, padding: "14px", textAlign: "center" }}>
            <p style={{ color: "var(--text-primary)", fontSize: "20px", fontWeight: "600", letterSpacing: "-0.3px", marginBottom: "2px" }}>
              {s.value}
            </p>
            <p style={{ color: "var(--text-secondary)", fontSize: "11px" }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
