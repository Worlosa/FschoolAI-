import { describe, it, expect } from "vitest";
import { buildAuthUrl, tokenExpiryMs, isExpired, freeBusyToBusy, blockToEvent, freeBusyRequest, GOOGLE_SCOPES } from "../src/lib/googleCalendar";

describe("buildAuthUrl", () => {
  it("requests offline access + consent and carries state", () => {
    const url = buildAuthUrl("CID", "https://app/cb", "user-123");
    const u = new URL(url);
    expect(u.origin + u.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(u.searchParams.get("client_id")).toBe("CID");
    expect(u.searchParams.get("redirect_uri")).toBe("https://app/cb");
    expect(u.searchParams.get("response_type")).toBe("code");
    expect(u.searchParams.get("access_type")).toBe("offline");
    expect(u.searchParams.get("prompt")).toBe("consent");
    expect(u.searchParams.get("state")).toBe("user-123");
    expect(u.searchParams.get("scope")).toBe(GOOGLE_SCOPES.join(" "));
  });
});

describe("token expiry", () => {
  it("computes expiry from expires_in (defaults to 1h)", () => {
    expect(tokenExpiryMs({ expires_in: 3600 }, 1000)).toBe(1000 + 3600_000);
    expect(tokenExpiryMs({}, 1000)).toBe(1000 + 3600_000);
  });
  it("treats tokens as expired a minute early, and null as expired", () => {
    expect(isExpired(null, 0)).toBe(true);
    expect(isExpired(100_000, 0)).toBe(false);
    expect(isExpired(100_000, 100_000 - 30_000)).toBe(true);  // within 60s skew
    expect(isExpired(100_000, 100_000 - 90_000)).toBe(false); // outside skew
  });
});

describe("freeBusyToBusy", () => {
  it("parses busy intervals to ms and drops malformed ones", () => {
    const resp = { calendars: { primary: { busy: [
      { start: "2026-06-29T09:00:00Z", end: "2026-06-29T10:00:00Z" },
      { start: "bad", end: "2026-06-29T11:00:00Z" }, // dropped (NaN)
      { start: "2026-06-29T12:00:00Z", end: "2026-06-29T12:00:00Z" }, // dropped (zero-length)
    ] } } };
    const busy = freeBusyToBusy(resp);
    expect(busy).toHaveLength(1);
    expect(busy[0]).toEqual({ start: Date.parse("2026-06-29T09:00:00Z"), end: Date.parse("2026-06-29T10:00:00Z") });
  });
  it("falls back to the first calendar when 'primary' is absent, and tolerates empty", () => {
    expect(freeBusyToBusy({ calendars: { abc: { busy: [{ start: "2026-06-29T09:00:00Z", end: "2026-06-29T10:00:00Z" }] } } })).toHaveLength(1);
    expect(freeBusyToBusy({})).toEqual([]);
    expect(freeBusyToBusy(null)).toEqual([]);
  });
});

describe("blockToEvent / freeBusyRequest", () => {
  it("builds an event payload with ISO times", () => {
    const ev = blockToEvent({ taskId: "t", title: "Essay", course: "ENG", start: Date.UTC(2026,5,29,9,0,0), end: Date.UTC(2026,5,29,9,50,0) }, "America/Toronto");
    expect(ev.summary).toBe("Study: Essay");
    expect(ev.start.dateTime).toBe("2026-06-29T09:00:00.000Z");
    expect(ev.start.timeZone).toBe("America/Toronto");
    expect(ev.description).toMatch(/ENG/);
  });
  it("builds a freeBusy request body", () => {
    const r = freeBusyRequest(Date.UTC(2026,5,29,0,0,0), Date.UTC(2026,6,6,0,0,0));
    expect(r.timeMin).toBe("2026-06-29T00:00:00.000Z");
    expect(r.items).toEqual([{ id: "primary" }]);
  });
});
