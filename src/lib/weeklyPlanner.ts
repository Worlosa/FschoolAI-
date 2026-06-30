// weeklyPlanner.ts — pure scheduling logic for the Weekly Plan agent (G3.3 / Agent 4).
//
// Everything here is deterministic and works in absolute UTC milliseconds, so it's fully
// unit-testable and free of timezone/DST surprises. The ONE timezone-aware step
// (dayWindows) takes an explicit offset and is tested with fixed offsets. The endpoint
// supplies tasks (deadlines), busy intervals (from the calendar, or none), and `now`.
//
// Design choices that kill the usual planner bugs:
//   • Slot-major round-robin: walk free slots in time order, each slot goes to the most
//     urgent task that still needs time AND isn't past due. This spreads work across days
//     and subjects instead of cramming everything into day 1.
//   • Never schedule a task's block after its deadline.
//   • Per-day study cap so a heavy week doesn't dump 10h onto one day.
//   • Over-commit is reported (unscheduled minutes), never silently dropped.

export interface Interval { start: number; end: number } // ms UTC, half-open [start, end)
export interface Task {
  id: string;
  title: string;
  course?: string;
  dueAt: number;          // ms UTC
  difficulty?: number;    // 0..1, default 0.5
  estMinutes?: number;    // desired total study minutes; defaulted from difficulty if absent
}
export interface Block { taskId: string; title: string; course?: string; start: number; end: number }
export interface PlanConfig {
  days?: number;          // planning horizon in days (default 7)
  dayStartHour?: number;  // local working-day start hour (default 9)
  dayEndHour?: number;    // local working-day end hour (default 21)
  sessionMins?: number;   // max length of one study block (default 50)
  breakMins?: number;     // gap between sessions in the same free window (default 10)
  minSessionMins?: number;// shortest usable slot (default 25)
  dailyCapMins?: number;  // max scheduled study per local day (default 240)
  tzOffsetMin?: number;   // local = UTC + this many minutes (EDT = -240). Default 0.
}
export interface PlanResult {
  blocks: Block[];
  totalStudyMinutes: number;
  unscheduled: { taskId: string; title: string; minutes: number }[];
  overCommitted: boolean;
  note: string;
}

const MS_MIN = 60_000, MS_HOUR = 3_600_000, MS_DAY = 86_400_000;

export const PLAN_DEFAULTS: Required<PlanConfig> = {
  days: 7, dayStartHour: 9, dayEndHour: 21, sessionMins: 50, breakMins: 10,
  minSessionMins: 25, dailyCapMins: 240, tzOffsetMin: 0,
};

function cfg(c?: PlanConfig): Required<PlanConfig> {
  const m = { ...PLAN_DEFAULTS, ...(c || {}) };
  // guardrails against nonsense config that would otherwise produce garbage or loop
  m.days = Math.max(1, Math.min(31, Math.floor(m.days)));
  m.dayStartHour = Math.max(0, Math.min(23, m.dayStartHour));
  m.dayEndHour = Math.max(m.dayStartHour + 1, Math.min(24, m.dayEndHour));
  m.sessionMins = Math.max(10, m.sessionMins);
  m.breakMins = Math.max(0, m.breakMins);
  m.minSessionMins = Math.max(5, Math.min(m.minSessionMins, m.sessionMins));
  m.dailyCapMins = Math.max(m.sessionMins, m.dailyCapMins);
  return m;
}

// Local working-hour windows for each day in the horizon, returned as UTC ms intervals.
// The first window is clipped to `now` (we never schedule in the past). Uses a single tz
// offset for the whole horizon — DST shifts mid-week are not modeled (documented limitation).
export function dayWindows(nowMs: number, config?: PlanConfig): Interval[] {
  const c = cfg(config);
  const off = c.tzOffsetMin * MS_MIN;
  const localNow = nowMs + off;
  const localMidnight = Math.floor(localNow / MS_DAY) * MS_DAY; // midnight today, in local-shifted space
  const out: Interval[] = [];
  for (let d = 0; d < c.days; d++) {
    const base = localMidnight + d * MS_DAY;
    const startUTC = base + c.dayStartHour * MS_HOUR - off;
    const endUTC = base + c.dayEndHour * MS_HOUR - off;
    const clippedStart = Math.max(startUTC, nowMs);
    if (clippedStart < endUTC) out.push({ start: clippedStart, end: endUTC });
  }
  return out;
}

// Remove busy intervals from a set of windows → the free intervals that remain.
export function subtractBusy(windows: Interval[], busy: Interval[]): Interval[] {
  const sortedBusy = [...busy].filter(b => b.end > b.start).sort((a, b) => a.start - b.start);
  const free: Interval[] = [];
  for (const w of windows) {
    let cursor = w.start;
    for (const b of sortedBusy) {
      if (b.end <= cursor || b.start >= w.end) continue; // no overlap with the rest of this window
      if (b.start > cursor) free.push({ start: cursor, end: Math.min(b.start, w.end) });
      cursor = Math.max(cursor, Math.min(b.end, w.end));
      if (cursor >= w.end) break;
    }
    if (cursor < w.end) free.push({ start: cursor, end: w.end });
  }
  return free.filter(f => f.end > f.start);
}

// Chop free intervals into session-sized slots (with breaks between sessions in the same
// interval). Drops the trailing remainder if it's shorter than minSessionMins.
export function splitIntoSessions(free: Interval[], config?: PlanConfig): Interval[] {
  const c = cfg(config);
  const slots: Interval[] = [];
  for (const f of free) {
    let cursor = f.start;
    while (cursor < f.end) {
      const remain = f.end - cursor;
      if (remain < c.minSessionMins * MS_MIN) break;
      const len = Math.min(c.sessionMins * MS_MIN, remain);
      slots.push({ start: cursor, end: cursor + len });
      cursor += len + c.breakMins * MS_MIN;
    }
  }
  return slots;
}

export function defaultEstMinutes(task: Task): number {
  if (task.estMinutes != null && task.estMinutes > 0) return task.estMinutes;
  const diff = clamp01(task.difficulty ?? 0.5);
  return Math.round(60 + diff * 120); // 60 min (easy) … 180 min (hard)
}

// Urgency × difficulty. Higher score = schedule sooner. Sooner deadlines dominate.
export function priorityScore(task: Task, nowMs: number): number {
  const daysUntil = Math.max((task.dueAt - nowMs) / MS_DAY, 0.1);
  const diff = clamp01(task.difficulty ?? 0.5);
  return (0.5 + diff) / daysUntil;
}

function clamp01(n: number): number { return Math.max(0, Math.min(1, n)); }
function localDayKey(ms: number, offMin: number): number {
  return Math.floor((ms + offMin * MS_MIN) / MS_DAY);
}

// The full plan. Slot-major round-robin with due-date and per-day-cap constraints.
export function buildPlan(tasks: Task[], busy: Interval[], nowMs: number, config?: PlanConfig): PlanResult {
  const c = cfg(config);

  // Only future, non-past-due tasks are plannable. (Past-due → can't study for it anymore.)
  const live = tasks
    .filter(t => t && t.dueAt > nowMs && t.id)
    .map(t => ({ task: t, remaining: defaultEstMinutes(t) * MS_MIN }));

  const slots = splitIntoSessions(subtractBusy(dayWindows(nowMs, c), busy), c);

  const blocks: Block[] = [];
  const perDay: Record<number, number> = {}; // local-day → minutes scheduled

  for (const slot of slots) {
    const dayKey = localDayKey(slot.start, c.tzOffsetMin);
    const usedToday = perDay[dayKey] ?? 0;
    const capRemainMs = (c.dailyCapMins - usedToday) * MS_MIN;
    if (capRemainMs < c.minSessionMins * MS_MIN) continue; // this day is essentially full

    // pick the most-urgent task that still needs time and whose deadline is after this slot
    const candidates = live
      .filter(x => x.remaining >= c.minSessionMins * MS_MIN && x.task.dueAt > slot.start)
      .sort((a, b) => priorityScore(b.task, nowMs) - priorityScore(a.task, nowMs)
                   || a.task.dueAt - b.task.dueAt
                   || a.task.id.localeCompare(b.task.id)); // deterministic tiebreak
    if (!candidates.length) continue;

    const pick = candidates[0];
    const slotLen = slot.end - slot.start;
    // a block can't exceed the slot, the task's remaining need, the day cap, or run past the due date
    const maxByDue = pick.task.dueAt - slot.start;
    const len = Math.min(slotLen, pick.remaining, capRemainMs, maxByDue);
    if (len < c.minSessionMins * MS_MIN) continue;

    blocks.push({ taskId: pick.task.id, title: pick.task.title, course: pick.task.course, start: slot.start, end: slot.start + len });
    pick.remaining -= len;
    perDay[dayKey] = usedToday + len / MS_MIN;
  }

  const unscheduled = live
    .filter(x => x.remaining >= c.minSessionMins * MS_MIN)
    .map(x => ({ taskId: x.task.id, title: x.task.title, minutes: Math.round(x.remaining / MS_MIN) }));
  const totalStudyMinutes = Math.round(blocks.reduce((s, b) => s + (b.end - b.start), 0) / MS_MIN);
  const overCommitted = unscheduled.length > 0;

  let note: string;
  if (!live.length) note = "Nothing due in this window — you're caught up.";
  else if (!blocks.length) note = busy.length ? "No open time in your calendar this week to schedule study." : "No available time in the planning window.";
  else if (overCommitted) note = `Scheduled ${totalStudyMinutes} min; ${unscheduled.length} item(s) need more time than your week has — prioritized the most urgent.`;
  else note = `Planned ${blocks.length} study block(s), ${totalStudyMinutes} min total.`;

  return { blocks, totalStudyMinutes, unscheduled, overCommitted, note };
}

// Resolve an IANA timezone name to "local = UTC + N minutes" for a given instant, so the
// endpoint can feed dayWindows the right offset. Uses Intl; falls back to 0 (UTC) on any
// bad/unknown zone. (A single offset for the week; DST mid-week is not modeled.)
export function tzOffsetMinutes(tz: string | null | undefined, nowMs: number): number {
  if (!tz) return 0;
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    const m: Record<string, string> = {};
    for (const p of dtf.formatToParts(new Date(nowMs))) m[p.type] = p.value;
    const asUTC = Date.UTC(+m.year, +m.month - 1, +m.day, +m.hour, +m.minute, +m.second);
    return Math.round((asUTC - nowMs) / 60_000);
  } catch {
    return 0;
  }
}

// Move blocks whose start is already in the past (missed) forward into the remaining plan.
// Silent reschedule (PRD edge): rebuild the plan from now using the same tasks/config, so
// missed work is re-slotted rather than nagged about.
export function rescheduleFrom(
  tasks: Task[], busy: Interval[], nowMs: number, config?: PlanConfig,
): PlanResult {
  return buildPlan(tasks, busy, nowMs, config);
}
