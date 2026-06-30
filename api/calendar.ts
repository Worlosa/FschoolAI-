// api/calendar.js — Google Calendar read/write for the Weekly Planner.
//
//   POST ?action=freebusy { userId, timeMin, timeMax, calendarId? } → { connected, busy[] }
//   POST ?action=create   { userId, blocks[], tz? }                 → { connected, created[] }
//
// Reads the stored connection (calendar_connections), refreshes the access token if it's
// expired, then calls Google. Everything degrades to { connected:false } or { error } —
// never throws to the caller, so the planner can fall back to working-hours-only.

import { createClient } from "@supabase/supabase-js";
import { isExpired, freeBusyToBusy, freeBusyRequest, blockToEvent } from "../src/lib/googleCalendar.js";

function qp(req, k) {
  if (req.query && req.query[k] != null) return req.query[k];
  try { return new URL(req.url, "http://localhost").searchParams.get(k); } catch { return null; }
}

async function refreshIfNeeded(sb, conn) {
  if (!isExpired(Date.parse(conn.expires_at), Date.now())) return conn.access_token;
  if (!conn.refresh_token) throw new Error("no refresh token");
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      grant_type: "refresh_token", refresh_token: conn.refresh_token,
    }),
  });
  if (!r.ok) throw new Error("token refresh failed");
  const t = await r.json();
  const expires = new Date(Date.now() + (t.expires_in ?? 3600) * 1000).toISOString();
  await sb.from("calendar_connections").update({ access_token: t.access_token, expires_at: expires }).eq("user_id", conn.user_id);
  return t.access_token;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const action = qp(req, "action");
  const { userId, blocks, timeMin, timeMax, calendarId = "primary", tz = "UTC" } = req.body ?? {};
  if (!userId) return res.status(400).json({ error: "userId required" });

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !key) return res.status(200).json({ connected: false, busy: [], created: [] });
  const sb = createClient(supabaseUrl, key);

  const { data: conn } = await sb.from("calendar_connections").select("*").eq("user_id", userId).maybeSingle();
  if (!conn) return res.status(200).json({ connected: false, busy: [], created: [] });

  let token: string;
  try { token = await refreshIfNeeded(sb, conn); }
  catch { return res.status(200).json({ connected: true, error: "auth_expired", busy: [], created: [] }); }

  const cal = conn.calendar_id || calendarId;

  if (action === "freebusy") {
    try {
      const r = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(freeBusyRequest(Number(timeMin), Number(timeMax), cal)),
      });
      if (!r.ok) return res.status(200).json({ connected: true, busy: [], error: "freebusy_failed" });
      return res.status(200).json({ connected: true, busy: freeBusyToBusy(await r.json(), cal) });
    } catch {
      return res.status(200).json({ connected: true, busy: [], error: "freebusy_failed" });
    }
  }

  if (action === "create") {
    const created: string[] = [];
    for (const b of Array.isArray(blocks) ? blocks : []) {
      try {
        const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal)}/events`, {
          method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(blockToEvent(b, tz)),
        });
        if (r.ok) { const ev = await r.json(); if (ev?.id) created.push(ev.id); }
      } catch { /* skip this block, keep going (partial success) */ }
    }
    return res.status(200).json({ connected: true, created });
  }

  return res.status(400).json({ error: "unknown action" });
}
