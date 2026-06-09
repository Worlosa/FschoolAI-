// api/discord.js — unified Discord handler (single Vercel function)
// Routes:
//   GET  /api/discord?action=login&uid=<fschool_uid>  — start OAuth, redirect user to Discord
//   GET  /api/discord?action=callback&code=&state=    — exchange code, store discord id, auto-join server
//   POST /api/discord?action=interactions             — Discord slash-command webhook (/feedback)
//
// Env vars required (set in Vercel):
//   DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_BOT_TOKEN,
//   DISCORD_PUBLIC_KEY        (Developer Portal → General Information → Public Key)
//   DISCORD_GUILD_ID          (right-click your server → Copy Server ID, with Dev Mode on)
//   DISCORD_REDIRECT_URI      (EXACTLY: https://neuro-agi-topaz.vercel.app/api/discord?action=callback)
//   APP_BASE_URL              (https://neuro-agi-topaz.vercel.app — where to send users after connecting)
//   SUPABASE_URL, SUPABASE_SERVICE_KEY
//
// IMPORTANT: this file uses tweetnacl for interaction signature verification.
// Run `npm install tweetnacl` and commit the lockfile before deploying.

import { createClient } from "@supabase/supabase-js";
import nacl from "tweetnacl";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const DISCORD_API = "https://discord.com/api/v10";

// Vercel: we need the raw body for signature verification, so disable automatic parsing.
export const config = { api: { bodyParser: false } };

// ── Inline token-award helper ─────────────────────────────────────────────────
// Routes awards through token_events + users.points + leaderboard so they are
// leaderboard-visible. Token amounts match api/token-engine.js — keep in sync.
const DISCORD_AWARD_CFG = {
  discord_connected: { tokens: 5,  lifetimeMax: 1    }, // once per account
  feedback_given:    { tokens: 1,  lifetimeMax: null }, // every /feedback submission
};

async function awardPoints(userId, action) {
  const cfg = DISCORD_AWARD_CFG[action];
  if (!cfg) return { awarded: false, reason: "unknown_action" };

  // Lifetime-limit check (discord_connected is once-only)
  if (cfg.lifetimeMax) {
    const { count, error: ltErr } = await supabase
      .from("token_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("action", action);
    if (ltErr) console.error(`[discord/awardPoints] token_events lifetime-check error (${action}):`, ltErr.message);
    if ((count ?? 0) >= cfg.lifetimeMax) return { awarded: false, reason: "lifetime_limit" };
  }

  const dt = new Date().toISOString().slice(0, 10);

  // 1. Write token event
  const { error: evtErr } = await supabase.from("token_events").insert({
    user_id:   userId,
    action,
    tokens:    cfg.tokens,
    awarded_on: dt,
  });
  if (evtErr) console.error(`[discord/awardPoints] token_events.insert error (${action}):`, evtErr.message, "| user_id:", userId);

  // 2. Read + increment users.points
  const { data: userRow, error: userReadErr } = await supabase
    .from("users").select("points").eq("id", userId).maybeSingle();
  if (userReadErr) console.error(`[discord/awardPoints] users.select error (${action}):`, userReadErr.message, "| user_id:", userId);

  const newPoints = (userRow?.points ?? 0) + cfg.tokens;
  const { error: userUpdErr } = await supabase
    .from("users").update({ points: newPoints }).eq("id", userId);
  if (userUpdErr) console.error(`[discord/awardPoints] users.update (points) error (${action}):`, userUpdErr.message, "| user_id:", userId);

  // 3. Sync leaderboard
  const { error: lbErr } = await supabase.from("leaderboard").upsert(
    { user_id: userId, points: newPoints, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  if (lbErr) console.error(`[discord/awardPoints] leaderboard.upsert error (${action}):`, lbErr.message, "| user_id:", userId);

  return { awarded: true, tokens: cfg.tokens, newPoints };
}

function readRawBody(req) {
  // Event-based read — more reliable than for-await-of on Vercel's Node 18+ ESM runtime.
  // for-await-of on IncomingMessage can yield zero chunks when bodyParser:false is active
  // in certain Vercel configurations, producing an empty buffer that breaks Ed25519 verify.
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end",  () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  const action = req.query.action;

  // ── GET ?action=login ─────────────────────────────────────────────
  // Sends the user to Discord's consent screen. `uid` is the fschool_uid
  // we round-trip via the OAuth `state` param so the callback knows who connected.
  if (action === "login") {
    const uid = req.query.uid;
    if (!uid) return res.status(400).send("Missing uid");

    const params = new URLSearchParams({
      client_id:     process.env.DISCORD_CLIENT_ID,
      redirect_uri:  process.env.DISCORD_REDIRECT_URI,
      response_type: "code",
      scope:         "identify guilds.join",
      state:         uid,
      prompt:        "consent",
    });
    res.writeHead(302, { Location: `https://discord.com/oauth2/authorize?${params}` });
    return res.end();
  }

  // ── GET ?action=callback ──────────────────────────────────────────
  if (action === "callback") {
    const { code, state: uid } = req.query;
    const appBase = process.env.APP_BASE_URL || "https://neuro-agi-topaz.vercel.app";
    if (!code || !uid) return res.writeHead(302, { Location: `${appBase}/?discord=error` }).end();

    try {
      // 1. Exchange the code for an access token
      const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id:     process.env.DISCORD_CLIENT_ID,
          client_secret: process.env.DISCORD_CLIENT_SECRET,
          grant_type:    "authorization_code",
          code,
          redirect_uri:  process.env.DISCORD_REDIRECT_URI,
        }),
      });
      if (!tokenRes.ok) throw new Error(`token exchange ${tokenRes.status}`);
      const token = await tokenRes.json();

      // 2. Identify the Discord user
      const meRes = await fetch(`${DISCORD_API}/users/@me`, {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
      if (!meRes.ok) throw new Error(`users/@me ${meRes.status}`);
      const me = await meRes.json();

      // 3. Auto-join them to the beta server (requires guilds.join scope + bot in the server)
      //    PUT returns 201 (added) or 204 (already a member) — both are success.
      const joinRes = await fetch(
        `${DISCORD_API}/guilds/${process.env.DISCORD_GUILD_ID}/members/${me.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ access_token: token.access_token }),
        }
      );
      const joined = joinRes.status === 201 || joinRes.status === 204;

      // 4. Check if this account already had Discord linked (for idempotency)
      const { data: existing, error: lookupErr } = await supabase
        .from("users").select("discord_user_id").eq("id", uid).maybeSingle();
      if (lookupErr) console.error("[discord/callback] users.select error:", lookupErr.message, "| uid:", uid);

      // 5. Write discord_user_id to users table
      const { error: linkErr } = await supabase
        .from("users").update({ discord_user_id: me.id }).eq("id", uid);
      if (linkErr) console.error("[discord/callback] users.update (discord_user_id) error:", linkErr.message, "| uid:", uid);

      // 6. Award connection tokens through engine — once per account (lifetimeMax:1),
      //    hits leaderboard.points + token_events (leaderboard-visible).
      //    Only fires on first link; awardPoints handles the lifetime check internally.
      if (!existing?.discord_user_id) {
        const award = await awardPoints(uid, "discord_connected");
        console.log("[discord/callback] discord_connected award result:", award);
      }

      const status = joined ? "connected" : "connected_nojoin";
      return res.writeHead(302, { Location: `${appBase}/?discord=${status}` }).end();
    } catch (err) {
      console.error("[discord/callback] unhandled error:", err.message);
      return res.writeHead(302, { Location: `${appBase}/?discord=error` }).end();
    }
  }

  // ── POST ?action=interactions ─────────────────────────────────────
  // Discord posts here for the PING verification handshake and for slash commands.
  if (action === "interactions") {
    const signature = req.headers["x-signature-ed25519"];
    const timestamp = req.headers["x-signature-timestamp"];
    const raw = await readRawBody(req);

    // Diagnostic: empty raw body means bodyParser:false is not working
    if (!raw.length) {
      console.error("[discord/interactions] raw body is EMPTY — bodyParser:false may be ineffective in this runtime");
    }

    // Verify the request really came from Discord (Ed25519).
    // .trim() guards against Vercel env var editor adding trailing newlines to the key.
    const verified = signature && timestamp && raw.length > 0 && nacl.sign.detached.verify(
      Buffer.concat([Buffer.from(timestamp.trim()), raw]),
      Buffer.from(signature.trim(), "hex"),
      Buffer.from((process.env.DISCORD_PUBLIC_KEY || "").trim(), "hex")
    );
    if (!verified) return res.status(401).send("invalid request signature");

    const body = JSON.parse(raw.toString("utf8"));

    // PING → PONG (Discord's endpoint verification)
    if (body.type === 1) return res.status(200).json({ type: 1 });

    // APPLICATION_COMMAND
    if (body.type === 2 && body.data?.name === "feedback") {
      const discordId = body.member?.user?.id || body.user?.id;
      const content   = body.data.options?.find(o => o.name === "message")?.value || "";

      try {
        // Look up the fschool user by their Discord ID
        const { data: user, error: userLookupErr } = await supabase
          .from("users").select("id, feedback_points")
          .eq("discord_user_id", discordId).maybeSingle();
        if (userLookupErr) console.error("[discord/interactions] users.select error:", userLookupErr.message, "| discordId:", discordId);

        if (!user) {
          return res.status(200).json({
            type: 4,
            data: {
              flags: 64, // ephemeral
              content: "I couldn't find your FSchoolAI account linked to this Discord. Connect it in the app first (Onboarding → Join the community), then try again.",
            },
          });
        }

        // Write to feedback table (tracks submission history)
        const { error: fbErr } = await supabase.from("feedback").insert({
          user_id:         user.id,
          discord_user_id: discordId,
          content,
          points_awarded:  1,
        });
        if (fbErr) console.error("[discord/interactions] feedback.insert error:", fbErr.message, "| user_id:", user.id);

        // Increment feedback_points counter (separate tracking field, not leaderboard-visible)
        const { error: fpErr } = await supabase
          .from("users")
          .update({ feedback_points: (user.feedback_points || 0) + 1 })
          .eq("id", user.id);
        if (fpErr) console.error("[discord/interactions] users.update (feedback_points) error:", fpErr.message, "| user_id:", user.id);

        // Award leaderboard-visible token through engine (hits token_events + leaderboard)
        const award = await awardPoints(user.id, "feedback_given");
        console.log("[discord/interactions] feedback_given award result:", award);

        const newFeedbackCount = (user.feedback_points || 0) + 1;
        return res.status(200).json({
          type: 4,
          data: { flags: 64, content: `Thanks — feedback logged (${newFeedbackCount} submitted). +1 token added to your leaderboard. 🙌` },
        });
      } catch (err) {
        console.error("[discord/interactions] unhandled error:", err.message);
        return res.status(200).json({ type: 4, data: { flags: 64, content: "Something went wrong saving that. Try again in a sec." } });
      }
    }

    return res.status(200).json({ type: 4, data: { flags: 64, content: "Unknown command." } });
  }

  return res.status(400).json({ error: "Unknown action. Use ?action=login, callback, or interactions" });
}
