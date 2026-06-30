import { describe, it, expect } from "vitest";
import {
  dayWindows, subtractBusy, splitIntoSessions, defaultEstMinutes, priorityScore, buildPlan, tzOffsetMinutes,
} from "../src/lib/weeklyPlanner";

const MIN = 60_000, HOUR = 3_600_000, DAY = 86_400_000;
const NOW = Date.UTC(2026, 5, 29, 0, 0, 0); // a fixed UTC midnight anchor

describe("dayWindows", () => {
  it("makes one 9–21 window per day (offset 0), no clipping when now is midnight", () => {
    const w = dayWindows(NOW, { days: 3, tzOffsetMin: 0 });
    expect(w).toHaveLength(3);
    for (const x of w) {
      expect(x.start % DAY).toBe(9 * HOUR);
      expect(x.end % DAY).toBe(21 * HOUR);
      expect(x.end - x.start).toBe(12 * HOUR);
    }
  });

  it("clips the first window to `now` (never schedules in the past)", () => {
    const noon = NOW + 12 * HOUR;
    const w = dayWindows(noon, { days: 1, tzOffsetMin: 0 });
    expect(w[0].start).toBe(noon);        // 9:00 window start clipped up to 12:00
    expect(w[0].end).toBe(NOW + 21 * HOUR);
  });

  it("drops a day whose window is entirely in the past", () => {
    const evening = NOW + 22 * HOUR; // past 21:00, so today's window is gone
    const w = dayWindows(evening, { days: 1, tzOffsetMin: 0 });
    expect(w).toHaveLength(0);
  });

  it("respects a non-zero tz offset: a full window's LOCAL start hour is dayStartHour", () => {
    const w = dayWindows(NOW, { days: 3, tzOffsetMin: -240 }); // EDT
    const full = w[w.length - 1]; // a mid-horizon window is never clipped
    const localStartHour = (((full.start + -240 * MIN) % DAY) + DAY) % DAY / HOUR;
    const localEndHour = (((full.end + -240 * MIN) % DAY) + DAY) % DAY / HOUR;
    expect(localStartHour).toBe(9);
    expect(localEndHour).toBe(21);
  });
});

describe("subtractBusy", () => {
  it("carves busy out of a window", () => {
    expect(subtractBusy([{ start: 0, end: 100 }], [{ start: 20, end: 40 }]))
      .toEqual([{ start: 0, end: 20 }, { start: 40, end: 100 }]);
  });
  it("ignores busy outside the window", () => {
    expect(subtractBusy([{ start: 0, end: 100 }], [{ start: 200, end: 300 }]))
      .toEqual([{ start: 0, end: 100 }]);
  });
  it("returns nothing when busy covers the whole window", () => {
    expect(subtractBusy([{ start: 0, end: 100 }], [{ start: 0, end: 100 }])).toEqual([]);
  });
  it("handles overlapping/adjacent busy blocks", () => {
    expect(subtractBusy([{ start: 0, end: 100 }], [{ start: 0, end: 30 }, { start: 25, end: 60 }]))
      .toEqual([{ start: 60, end: 100 }]);
  });
});

describe("splitIntoSessions", () => {
  it("chops a window into session-sized slots with breaks", () => {
    const slots = splitIntoSessions([{ start: 0, end: 110 * MIN }], { sessionMins: 50, breakMins: 10, minSessionMins: 25 });
    expect(slots).toEqual([{ start: 0, end: 50 * MIN }, { start: 60 * MIN, end: 110 * MIN }]);
  });
  it("keeps a short-but-usable final slot, drops one below the minimum", () => {
    expect(splitIntoSessions([{ start: 0, end: 30 * MIN }], { sessionMins: 50, minSessionMins: 25 }))
      .toEqual([{ start: 0, end: 30 * MIN }]);
    expect(splitIntoSessions([{ start: 0, end: 20 * MIN }], { sessionMins: 50, minSessionMins: 25 }))
      .toEqual([]);
  });
});

describe("priorityScore / defaultEstMinutes", () => {
  it("ranks sooner deadlines and harder tasks higher", () => {
    const soon = { id: "a", title: "a", dueAt: NOW + 1 * DAY, difficulty: 0.5 };
    const later = { id: "b", title: "b", dueAt: NOW + 5 * DAY, difficulty: 0.5 };
    const hard = { id: "c", title: "c", dueAt: NOW + 5 * DAY, difficulty: 1 };
    expect(priorityScore(soon, NOW)).toBeGreaterThan(priorityScore(later, NOW));
    expect(priorityScore(hard, NOW)).toBeGreaterThan(priorityScore(later, NOW));
  });
  it("defaults estimate from difficulty (60–180 min)", () => {
    expect(defaultEstMinutes({ id: "x", title: "x", dueAt: NOW, difficulty: 0 })).toBe(60);
    expect(defaultEstMinutes({ id: "x", title: "x", dueAt: NOW, difficulty: 1 })).toBe(180);
    expect(defaultEstMinutes({ id: "x", title: "x", dueAt: NOW, estMinutes: 45 })).toBe(45);
  });
});

describe("tzOffsetMinutes", () => {
  it("returns 0 for UTC and for unknown/empty zones", () => {
    expect(tzOffsetMinutes("UTC", NOW)).toBe(0);
    expect(tzOffsetMinutes(null, NOW)).toBe(0);
    expect(tzOffsetMinutes("Not/AZone", NOW)).toBe(0);
  });
  it("resolves a real zone (Toronto in June = EDT, UTC-4 → -240)", () => {
    expect(tzOffsetMinutes("America/Toronto", NOW)).toBe(-240);
  });
});

describe("buildPlan", () => {
  const tasks = [
    { id: "t1", title: "Essay", course: "ENG", dueAt: NOW + 3 * DAY, difficulty: 0.7 },
    { id: "t2", title: "Pset", course: "MATH", dueAt: NOW + 5 * DAY, difficulty: 0.4 },
  ];

  it("schedules blocks inside working windows and never past a deadline", () => {
    const p = buildPlan(tasks, [], NOW, { tzOffsetMin: 0 });
    expect(p.blocks.length).toBeGreaterThan(0);
    expect(p.overCommitted).toBe(false);
    for (const b of p.blocks) {
      expect(b.start).toBeGreaterThanOrEqual(NOW);            // never in the past
      expect(b.start % DAY).toBeGreaterThanOrEqual(9 * HOUR); // inside 9–21 local (offset 0)
      expect(b.end % DAY).toBeLessThanOrEqual(21 * HOUR);
      const due = tasks.find(t => t.id === b.taskId)!.dueAt;
      expect(b.end).toBeLessThanOrEqual(due);                 // not scheduled after it's due
    }
    expect(p.totalStudyMinutes).toBeGreaterThan(0);
  });

  it("says you're caught up when nothing is due", () => {
    const p = buildPlan([], [], NOW);
    expect(p.blocks).toEqual([]);
    expect(p.note).toMatch(/caught up/i);
  });

  it("excludes past-due tasks", () => {
    const p = buildPlan([{ id: "old", title: "old", dueAt: NOW - DAY, difficulty: 0.5 }], [], NOW);
    expect(p.blocks).toEqual([]);
    expect(p.note).toMatch(/caught up/i);
  });

  it("only schedules a due-today task before its due time", () => {
    const dueAt = NOW + 10 * HOUR; // today 10:00
    const p = buildPlan([{ id: "due", title: "Due today", dueAt, difficulty: 0.5 }], [], NOW, { tzOffsetMin: 0 });
    for (const b of p.blocks) expect(b.end).toBeLessThanOrEqual(dueAt);
  });

  it("reports over-commitment instead of dropping work silently", () => {
    // tiny 1-hour window, three needy tasks → only one fits, the rest are reported
    const many = [
      { id: "a", title: "A", dueAt: NOW + 2 * DAY, difficulty: 1 },
      { id: "b", title: "B", dueAt: NOW + 2 * DAY, difficulty: 1 },
      { id: "c", title: "C", dueAt: NOW + 2 * DAY, difficulty: 1 },
    ];
    const p = buildPlan(many, [], NOW, { days: 1, dayStartHour: 9, dayEndHour: 10, tzOffsetMin: 0 });
    expect(p.overCommitted).toBe(true);
    expect(p.unscheduled.length).toBeGreaterThan(0);
    expect(p.blocks.length).toBeGreaterThan(0); // it still schedules what it can
  });

  it("respects the daily study cap", () => {
    const p = buildPlan(
      [{ id: "big", title: "Big", dueAt: NOW + 2 * DAY, estMinutes: 600, difficulty: 1 }],
      [], NOW, { days: 1, dailyCapMins: 60, tzOffsetMin: 0 },
    );
    expect(p.totalStudyMinutes).toBeLessThanOrEqual(60);
  });

  it("yields no blocks when the calendar is fully busy", () => {
    const busy = [{ start: NOW, end: NOW + 7 * DAY }]; // every minute booked
    const p = buildPlan(tasks, busy, NOW);
    expect(p.blocks).toEqual([]);
    expect(p.note).toMatch(/no open time/i);
  });

  it("is deterministic", () => {
    const a = buildPlan(tasks, [], NOW);
    const b = buildPlan(tasks, [], NOW);
    expect(a.blocks).toEqual(b.blocks);
  });
});
