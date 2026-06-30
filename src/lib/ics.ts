// ics.ts — pure iCalendar (RFC 5545) generator for the Weekly Plan agent.
//
// One-way export: turns study blocks into a .ics file the student can import into ANY
// calendar app (Google, Apple, Outlook), no OAuth required. Gets the fiddly bits right:
// CRLF line endings, 75-octet line folding, text escaping, and UTC timestamps.

export interface IcsEvent {
  uid?: string;
  start: number;        // ms UTC
  end: number;          // ms UTC
  summary: string;
  description?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

// UTC basic format: YYYYMMDDTHHMMSSZ
export function formatUTC(ms: number): string {
  const d = new Date(ms);
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

// Escape per RFC 5545 3.3.11: backslash first, then ; , and newlines.
export function escapeText(s: string): string {
  return String(s ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\n|\r/g, "\\n");
}

// Fold a content line to ≤75 octets; continuation lines begin with a single space.
export function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let i = 0;
  parts.push(line.slice(0, 75));
  i = 75;
  while (i < line.length) {
    parts.push(" " + line.slice(i, i + 74)); // 74 + leading space = 75
    i += 74;
  }
  return parts.join("\r\n");
}

function line(name: string, value: string): string {
  return foldLine(`${name}:${value}`);
}

export function buildICS(events: IcsEvent[], opts?: { calName?: string; nowMs?: number; prodId?: string }): string {
  const stamp = formatUTC(opts?.nowMs ?? events[0]?.start ?? 0);
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    line("PRODID", opts?.prodId ?? "-//FschoolAI//Weekly Planner//EN"),
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  if (opts?.calName) lines.push(line("X-WR-CALNAME", escapeText(opts.calName)));

  events.forEach((e, idx) => {
    const uid = e.uid ?? `${e.start}-${idx}@fschoolai`;
    lines.push(
      "BEGIN:VEVENT",
      line("UID", uid),
      line("DTSTAMP", stamp),
      line("DTSTART", formatUTC(e.start)),
      line("DTEND", formatUTC(e.end)),
      line("SUMMARY", escapeText(e.summary)),
    );
    if (e.description) lines.push(line("DESCRIPTION", escapeText(e.description)));
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
