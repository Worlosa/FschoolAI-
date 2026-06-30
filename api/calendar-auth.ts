// api/calendar-auth.js — Google Calendar OAuth for the Weekly Planner.
//
//   GET/POST ?action=start&userId=…   → { url }  (frontend redirects the user there)
//   GET      ?action=callback&code&state=userId → exchanges code, stores tokens, redirects back
//
// Needs GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI. Tokens are stored
// server-side in calendar_connections (service key). `state` carries the userId.

import { createClient } from "@supabase/supabase-js";
import { buildAuthUrl, tokenExpiryMs } from "../src/lib/googleCalendar.js";

function qp(req, k) {
  if (req.query && req.query[k] != null) return req.query[k];
  try { return new URL(req.url, "http://localhost").searchParams.get(k); } catch { return null; }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(204).end();

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !secret || !redirectUri) {
    return res.status(500).json({ error: "Google Calendar not configured (missing GOOGLE_* env)" });
  }

  const action = qp(req, "action");

  if (action === "start") {
    const userId = qp(req, "userId") ?? req.body?.userId;
    if (!userId) return res.status(400).json({ error: "userId required" });
    return res.status(200).json({ url: buildAuthUrl(clientId, redirectUri, String(userId)) });
  }

  if (action === "callback") {
    const code = qp(req, "code");
    const state = qp(req, "state"); // the userId
    const err = qp(req, "error");
    const finish = (q: string) => { res.statusCode = 302; res.setHeader("Location", `/?calendar=${q}`); res.end(); };
    if (err || !code || !state) return finish("error");

    try {
      const tokRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ code, client_id: clientId, client_secret: secret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
      });
      if (!tokRes.ok) return finish("error");
      const t = await tokRes.json();

      const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
      if (supabaseUrl && key) {
        const sb = createClient(supabaseUrl, key);
        await sb.from("calendar_connections").upsert({
          user_id: String(state), provider: "google",
          access_token: t.access_token, refresh_token: t.refresh_token ?? null,
          expires_at: new Date(tokenExpiryMs(t, Date.now())).toISOString(),
          scope: t.scope ?? null, calendar_id: "primary", updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      }
      return finish("connected");
    } catch {
      return finish("error");
    }
  }

  return res.status(400).json({ error: "unknown action" });
}
