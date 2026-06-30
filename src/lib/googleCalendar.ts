// googleCalendar.ts — pure helpers for the Google Calendar integration.
//
// The actual network calls (token exchange, freeBusy query, events.insert) live in the
// api/calendar* endpoints; everything testable is here: the OAuth URL, token-expiry math,
// parsing a freeBusy response into busy intervals, and building an event payload.

import type { Interval, Block } from "./weeklyPlanner";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
];

export function buildAuthUrl(clientId: string, redirectUri: string, state: string, scopes: string[] = GOOGLE_SCOPES): string {
  const p = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",   // we want a refresh token
    prompt: "consent",        // force refresh_token issuance on re-auth
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`;
}

// When a token expires, as ms-since-epoch, given the token response and the time it was issued.
export function tokenExpiryMs(tokenResp: { expires_in?: number }, issuedAtMs: number): number {
  const secs = typeof tokenResp?.expires_in === "number" ? tokenResp.expires_in : 3600;
  return issuedAtMs + secs * 1000;
}

// Treat a token as expired a minute early to avoid mid-request expiry.
export function isExpired(expiresAtMs: number | null | undefined, nowMs: number, skewMs = 60_000): boolean {
  if (!expiresAtMs) return true;
  return nowMs >= expiresAtMs - skewMs;
}

// Parse a Google freeBusy response into busy intervals (ms). Tolerant of missing fields.
export function freeBusyToBusy(resp: any, calendarId = "primary"): Interval[] {
  const cal = resp?.calendars?.[calendarId] ?? Object.values(resp?.calendars ?? {})[0];
  const busy = (cal as any)?.busy ?? [];
  return busy
    .map((b: any) => ({ start: Date.parse(b.start), end: Date.parse(b.end) }))
    .filter((b: Interval) => Number.isFinite(b.start) && Number.isFinite(b.end) && b.end > b.start);
}

// Build a Google Calendar event insert payload from a study block.
export function blockToEvent(block: Block, timeZone = "UTC"): any {
  return {
    summary: `Study: ${block.title}`,
    description: block.course ? `FschoolAI study block · ${block.course}` : "FschoolAI study block",
    start: { dateTime: new Date(block.start).toISOString(), timeZone },
    end: { dateTime: new Date(block.end).toISOString(), timeZone },
    source: { title: "FschoolAI", url: "https://fschoolai.com" },
    transparency: "opaque",
  };
}

// Body for a freeBusy query over a window.
export function freeBusyRequest(timeMinMs: number, timeMaxMs: number, calendarId = "primary"): any {
  return {
    timeMin: new Date(timeMinMs).toISOString(),
    timeMax: new Date(timeMaxMs).toISOString(),
    items: [{ id: calendarId }],
  };
}
