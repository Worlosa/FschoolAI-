// api/verify-email.js — user clicks link in email, this marks them verified
// PLACE IN: /api/verify-email.js (root api folder, same level as claude.js)

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  const { token, userId } = req.query;
  if (!token || !userId) return res.redirect("/?verify=error&reason=missing");

  const { data: user, error } = await supabase
    .from("users")
    .select("id, email_verify_token, email_verify_sent_at, email_verified")
    .eq("id", userId)
    .maybeSingle();

  if (error || !user) return res.redirect("/?verify=error&reason=not_found");
  if (user.email_verified) return res.redirect("/?verify=already_done");
  if (user.email_verify_token !== token) return res.redirect("/?verify=error&reason=invalid_token");

  // Check token not older than 24 hours
  const sentAt     = new Date(user.email_verify_sent_at);
  const hoursSince = (Date.now() - sentAt.getTime()) / (1000 * 60 * 60);
  if (hoursSince > 24) return res.redirect("/?verify=error&reason=expired");

  // Mark verified + clear token
  const { error: updateErr } = await supabase
    .from("users")
    .update({ email_verified: true, email_verify_token: null })
    .eq("id", userId);

  if (updateErr) {
    console.error("[verify-email] update failed:", updateErr);
    return res.redirect("/?verify=error&reason=db_failed");
  }

  return res.redirect("/?verify=success");
}
