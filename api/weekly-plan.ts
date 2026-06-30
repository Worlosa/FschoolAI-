// api/weekly-plan.js — Weekly Plan agent (G3.3 / Agent 4).
//
// Takes the student's upcoming deadlines, pulls their free/busy from Google Calendar if
// connected (else assumes default working hours), runs the pure planner, persists the
// plan, fires a brain signal, and returns the plan + a downloadable .ics. Degrades
// gracefully at every step: no calendar → plan over working hours; calendar/brain/DB
// down → still returns the plan.
//
// POST { userId, assignments:[{id,title,course?,dueAt,difficulty?}], tz?, config?, calendarId? }
//   → { plan, calendarConnected, saved, ics }

import { createClient } from "@supabase/supabase-js";
import { buildPlan, tzOffsetMinutes } from "../src/lib/weeklyPlanner.js";
import { buildICS } from "../src/lib/ics.js";

function baseUrl(req) {
  const host  = (req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost") as string;
  const proto = (req.headers["x-forwarded-proto"] as string) ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
const toMs = (v) => (typeof v === "number" ? v : Date.parse(v));

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { userId, assignments, tz, config, calendarId = "primary" } = req.body ?? {};
  if (!userId) return res.status(400).json({ error: "userId required" });

  const now = Date.now();
  const tasks = (Array.isArray(assignments) ? assignments : [])
    .map((a) => ({
      id: String(a.id ?? a.title ?? Math.random()),
      title: a.title ?? a.name ?? "Untitled",
      course: a.course ?? a.courseCode ?? a.courseName ?? undefined,
      dueAt: toMs(a.dueAt ?? a.due_at ?? a.dueDate),
      difficulty: typeof a.difficulty === "number" ? a.difficulty : undefined,
    }))
    .filter((t) => Number.isFinite(t.dueAt));

  const planConfig = { ...(config || {}), tzOffsetMin: tzOffsetMinutes(tz, now) };
  const horizonDays = planConfig.days ?? 7;

  // Free/busy from Google Calendar if the user connected it (best-effort).
  let busy: any[] = [], calendarConnected = false;
  try {
    const fb = await fetch(`${baseUrl(req)}/api/calendar?action=freebusy`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, timeMin: now, timeMax: now + horizonDays * 86_400_000, calendarId }),
    }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (fb?.connected) { calendarConnected = true; busy = Array.isArray(fb.busy) ? fb.busy : []; }
  } catch { /* no calendar → plan over working hours only */ }

  const plan = buildPlan(tasks, busy, now, planConfig);

  // Persist the plan (best-effort).
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  let saved = false;
  if (supabaseUrl && key && plan.blocks.length) {
    try {
      const sb = createClient(supabaseUrl, key);
      await sb.from("weekly_plans").insert({
        user_id: userId, week_start: new Date(now).toISOString(),
        blocks: plan.blocks, plan_note: plan.note,
      });
      saved = true;
    } catch { /* table may not exist yet — plan still returned */ }
  }

  // Brain signal (awaited, best-effort — post-response work is killed on serverless).
  if (plan.blocks.length) {
    try {
      const link = await fetch(`${baseUrl(req)}/api/brain-person-link`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (link?.brain_person_id) {
        await fetch(`${baseUrl(req)}/api/brain-signal`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brainPersonId: link.brain_person_id, signalType: "academic", source: "weekly_planner",
            payload: { type: "weekly_plan", blocks: plan.blocks.length, total_minutes: plan.totalStudyMinutes, over_committed: plan.overCommitted },
          }),
        }).catch(() => {});
      }
    } catch { /* best-effort */ }
  }

  const ics = buildICS(
    plan.blocks.map((b) => ({ start: b.start, end: b.end, summary: `Study: ${b.title}`, description: b.course || "" })),
    { calName: "FschoolAI Weekly Plan", nowMs: now },
  );

  return res.status(200).json({ plan, calendarConnected, saved, ics });
}
