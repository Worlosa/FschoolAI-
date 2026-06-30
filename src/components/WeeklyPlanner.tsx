// WeeklyPlanner.tsx — generates a personalized weekly study plan from the student's
// deadlines, schedules it around their Google Calendar (if connected), and lets them
// export it (.ics) or push it to Google Calendar. Calls /api/weekly-plan.

import { useState, useEffect, useMemo } from "react";
import { useApp } from "../context/AppContext";
import { CalendarDays, Clock, Download, CalendarPlus, Link2, Sparkles, Loader2, AlertTriangle } from "lucide-react";

interface Block { taskId: string; title: string; course?: string; start: number; end: number }
interface Plan { blocks: Block[]; totalStudyMinutes: number; unscheduled: { title: string; minutes: number }[]; overCommitted: boolean; note: string }
interface PlanResponse { plan: Plan; calendarConnected: boolean; saved: boolean; ics: string }

const ACCENT = "#C49A3C";
const tzName = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "UTC"; } };
const fmtTime = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const fmtDay = (ms: number) => new Date(ms).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });

export default function WeeklyPlanner() {
  const { userId, assignments } = useApp() as any;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resp, setResp] = useState<PlanResponse | null>(null);
  const [adding, setAdding] = useState(false);
  const [banner, setBanner] = useState("");

  // Surface the OAuth callback result (?calendar=connected|error).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("calendar");
    if (p === "connected") setBanner("Google Calendar connected — regenerate to plan around your schedule.");
    else if (p === "error") setBanner("Couldn't connect Google Calendar. Try again.");
  }, []);

  const upcoming = useMemo(() => (Array.isArray(assignments) ? assignments : [])
    .filter((a: any) => (a.dueAt || a.due_at) && +new Date(a.dueAt || a.due_at) > Date.now() && !a.submission?.submittedAt)
    .map((a: any) => ({ id: a.id, title: a.name ?? a.title, course: a.courseCode ?? a.courseName, dueAt: a.dueAt ?? a.due_at })),
    [assignments]);

  // Group blocks by local day for display.
  const byDay = useMemo(() => {
    const m: Record<string, Block[]> = {};
    for (const b of resp?.plan.blocks ?? []) { const k = fmtDay(b.start); (m[k] ||= []).push(b); }
    return Object.entries(m);
  }, [resp]);

  async function generate() {
    if (!userId || loading) return;
    setLoading(true); setError(""); setResp(null);
    try {
      const r = await fetch("/api/weekly-plan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, assignments: upcoming, tz: tzName() }),
      });
      const data = r.ok ? await r.json() : null;
      if (!data?.plan) setError("Couldn't build a plan. Try again.");
      else setResp(data);
    } catch { setError("Something went wrong. Try again."); }
    setLoading(false);
  }

  async function connectCalendar() {
    try {
      const r = await fetch(`/api/calendar-auth?action=start&userId=${encodeURIComponent(userId)}`);
      const data = r.ok ? await r.json() : null;
      if (data?.url) window.location.href = data.url;
      else setBanner(data?.error || "Google Calendar isn't configured yet.");
    } catch { setBanner("Couldn't start Google Calendar connect."); }
  }

  async function addToCalendar() {
    if (!resp?.plan.blocks.length || adding) return;
    setAdding(true);
    try {
      const r = await fetch("/api/calendar?action=create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, blocks: resp.plan.blocks, tz: tzName() }),
      });
      const data = r.ok ? await r.json() : null;
      setBanner(data?.created?.length ? `Added ${data.created.length} blocks to Google Calendar.` : "Couldn't add to Google Calendar.");
    } catch { setBanner("Couldn't add to Google Calendar."); }
    setAdding(false);
  }

  function downloadIcs() {
    if (!resp?.ics) return;
    const blob = new Blob([resp.ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "fschool-weekly-plan.ics"; a.click();
    URL.revokeObjectURL(url);
  }

  const btn = (active: boolean) => ({
    padding: "9px 14px", borderRadius: "var(--radius-btn)", fontSize: 13, fontWeight: 600,
    fontFamily: "inherit", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
    background: active ? "rgba(196,154,60,0.14)" : "rgba(255,255,255,0.05)",
    border: `1px solid ${active ? "rgba(196,154,60,0.3)" : "rgba(255,255,255,0.09)"}`,
    color: active ? ACCENT : "var(--text-secondary)",
  });

  return (
    <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", boxShadow: "var(--depth-line)", padding: 20, marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
        <CalendarDays size={16} style={{ color: ACCENT }} />
        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Weekly study plan</p>
      </div>
      <p style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 14 }}>
        Builds a schedule from your {upcoming.length} upcoming deadline{upcoming.length !== 1 ? "s" : ""}{resp?.calendarConnected ? ", around your Google Calendar" : ""}.
      </p>

      {banner && <p style={{ fontSize: 12, color: ACCENT, marginBottom: 12 }}>{banner}</p>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: resp || error ? 16 : 0 }}>
        <button onClick={generate} disabled={loading || !userId} style={btn(true)}>
          {loading ? <><Loader2 size={14} />Planning…</> : <><Sparkles size={14} />Generate plan</>}
        </button>
        <button onClick={connectCalendar} style={btn(false)} title="Schedule around your real free time">
          <Link2 size={14} />{resp?.calendarConnected ? "Reconnect Calendar" : "Connect Google Calendar"}
        </button>
        {resp?.plan.blocks.length ? (
          <>
            <button onClick={downloadIcs} style={btn(false)}><Download size={14} />Download .ics</button>
            {resp.calendarConnected && (
              <button onClick={addToCalendar} disabled={adding} style={btn(false)}>
                {adding ? <><Loader2 size={14} />Adding…</> : <><CalendarPlus size={14} />Add to Google</>}
              </button>
            )}
          </>
        ) : null}
      </div>

      {error && <p style={{ fontSize: 12, color: "rgba(255,196,0,0.85)", margin: 0 }}>{error}</p>}

      {resp && (
        <div>
          <p style={{ fontSize: 12.5, color: "var(--text-secondary)", margin: "0 0 12px" }}>{resp.plan.note}</p>

          {resp.plan.overCommitted && resp.plan.unscheduled.length > 0 && (
            <div style={{ display: "flex", gap: 7, background: "rgba(255,196,0,0.06)", border: "1px solid rgba(255,196,0,0.2)", borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
              <AlertTriangle size={14} style={{ color: "rgba(255,196,0,0.85)", flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
                Not enough open time for everything. Still needs time: {resp.plan.unscheduled.map(u => `${u.title} (${u.minutes}m)`).join(", ")}.
              </p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {byDay.map(([day, blocks]) => (
              <div key={day}>
                <p style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 7 }}>{day}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {blocks.map((b, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(196,154,60,0.05)", border: "1px solid rgba(196,154,60,0.16)", borderRadius: 10, padding: "9px 12px" }}>
                      <Clock size={13} style={{ color: ACCENT, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: "var(--text-dim)", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                        {fmtTime(b.start)}–{fmtTime(b.end)}
                      </span>
                      <span style={{ fontSize: 13, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {b.title}{b.course ? ` · ${b.course}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
