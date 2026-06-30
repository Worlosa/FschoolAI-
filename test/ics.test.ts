import { describe, it, expect } from "vitest";
import { formatUTC, escapeText, foldLine, buildICS } from "../src/lib/ics";

const T = (y: number, mo: number, d: number, h: number, mi: number) => Date.UTC(y, mo, d, h, mi, 0);

describe("formatUTC", () => {
  it("emits RFC5545 UTC basic format", () => {
    expect(formatUTC(T(2026, 5, 29, 9, 5))).toBe("20260629T090500Z");
  });
});

describe("escapeText", () => {
  it("escapes backslash, semicolon, comma, and newlines (backslash first)", () => {
    expect(escapeText("a, b; c\\d\ne")).toBe("a\\, b\\; c\\\\d\\ne");
  });
});

describe("foldLine", () => {
  it("leaves short lines alone", () => {
    expect(foldLine("SUMMARY:hi")).toBe("SUMMARY:hi");
  });
  it("folds long lines at 75 with a leading-space continuation", () => {
    const long = "SUMMARY:" + "x".repeat(200);
    const folded = foldLine(long);
    const physical = folded.split("\r\n");
    expect(physical.length).toBeGreaterThan(1);
    expect(physical[0].length).toBe(75);
    for (const p of physical.slice(1)) {
      expect(p.startsWith(" ")).toBe(true);
      expect(p.length).toBeLessThanOrEqual(75);
    }
    // unfolding (drop CRLF + leading space) restores the original
    expect(folded.replace(/\r\n /g, "")).toBe(long);
  });
});

describe("buildICS", () => {
  const ics = buildICS(
    [
      { start: T(2026, 5, 29, 9, 0), end: T(2026, 5, 29, 9, 50), summary: "Study: Essay", description: "ENG; ch 3" },
      { start: T(2026, 5, 29, 11, 0), end: T(2026, 5, 29, 11, 50), summary: "Study: Pset" },
    ],
    { calName: "FschoolAI Plan", nowMs: T(2026, 5, 28, 0, 0) },
  );

  it("wraps a valid VCALENDAR with one VEVENT per event", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect((ics.match(/BEGIN:VEVENT/g) || []).length).toBe(2);
    expect((ics.match(/END:VEVENT/g) || []).length).toBe(2);
    expect(ics).toContain("VERSION:2.0");
  });

  it("uses CRLF line endings everywhere", () => {
    const lines = ics.split("\r\n");
    expect(lines.length).toBeGreaterThan(5);
    expect(ics.includes("\n\n")).toBe(false); // no bare LFs splitting records
  });

  it("includes DTSTART/DTEND/UID/DTSTAMP and escapes the description", () => {
    expect(ics).toContain("DTSTART:20260629T090000Z");
    expect(ics).toContain("DTEND:20260629T095000Z");
    expect(ics).toContain("DTSTAMP:20260628T000000Z");
    expect(ics).toMatch(/UID:.+@fschoolai/);
    expect(ics).toContain("DESCRIPTION:ENG\\; ch 3"); // semicolon escaped
  });
});
