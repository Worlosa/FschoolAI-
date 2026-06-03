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
//   DISCORD_REDIRECT_URI      (EXACTLY: https://neuro-agi.vercel.app/api/discord?action=callback)
//   APP_BASE_URL              (https://neuro-agi.vercel.app — where to send users after connecting)
//   SUPABASE_URL, SUPABASE_SERVICE_KEY
//
// IMPORTANT: this file uses tweetnacl for interaction signature verification.
// Run `npm install tweetnacl` and commit the lockfile before deploying.

import { createClient } from "@supabase/supabase-js";
import nacl from "tweetnacl";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const DISCORD_API = "https://discord.com/api/v10";
const WELCOME_POINTS = 5; // points granted for connecting Discord (beta-community reward)

// Vercel: we need the raw body for signature verification, so disable automatic parsing.
export const config = { api: { bodyParser: false } };

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
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
    const appBase = process.env.APP_BASE_URL || "https://neuro-agi.vercel.app";
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

      // 4. Link the Discord id to the fschool user (+ welcome points, once)
      const { data: existing } = await supabase
        .from("users").select("discord_user_id, feedback_points").eq("id", uid).maybeSingle();

      const patch = { discord_user_id: me.id };
      if (existing && !existing.discord_user_id) {
        patch.feedback_points = (existing.feedback_points || 0) + WELCOME_POINTS;
      }
      await supabase.from("users").update(patch).eq("id", uid);

      const status = joined ? "connected" : "connected_nojoin";
      return res.writeHead(302, { Location: `${appBase}/?discord=${status}` }).end();
    } catch (err) {
      console.error("[discord/callback]", err.message);
      return res.writeHead(302, { Location: `${appBase}/?discord=error` }).end();
    }
  }

  // ── POST ?action=interactions ─────────────────────────────────────
  // Discord posts here for the PING verification handshake and for slash commands.
  if (action === "interactions") {
    const signature = req.headers["x-signature-ed25519"];
    const timestamp = req.headers["x-signature-timestamp"];
    const raw = await readRawBody(req);

    // Verify the request really came from Discord (Ed25519)
    const verified = signature && timestamp && nacl.sign.detached.verify(
      Buffer.concat([Buffer.from(timestamp), raw]),
      Buffer.from(signature, "hex"),
      Buffer.from(process.env.DISCORD_PUBLIC_KEY, "hex")
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
        const { data: user } = await supabase
          .from("users").select("id, feedback_points")
          .eq("discord_user_id", discordId).maybeSingle();

        if (!user) {
          return res.status(200).json({
            type: 4,
            data: {
              flags: 64, // ephemeral
              content: "I couldn't find your FSchoolAI account linked to this Discord. Connect it in the app first (Onboarding → Join the community), then try again.",
            },
          });
        }

        await supabase.from("feedback").insert({
          user_id:         user.id,
          discord_user_id: discordId,
          content,
          points_awarded:  1,
        });
        await supabase.from("users")
          .update({ feedback_points: (user.feedback_points || 0) + 1 })
          .eq("id", user.id);

        return res.status(200).json({
          type: 4,
          data: { flags: 64, content: `Thanks — feedback logged. You're at ${(user.feedback_points || 0) + 1} points. 🙌` },
        });
      } catch (err) {
        console.error("[discord/interactions]", err.message);
        return res.status(200).json({ type: 4, data: { flags: 64, content: "Something went wrong saving that. Try again in a sec." } });
      }
    }

    return res.status(200).json({ type: 4, data: { flags: 64, content: "Unknown command." } });
  }

  return res.status(400).json({ error: "Unknown action. Use ?action=login, callback, or interactions" });
}
