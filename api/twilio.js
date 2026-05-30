// api/twilio.js — Vercel serverless function for SMS reminders via Twilio
// Required env vars: TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const sid   = process.env.TWILIO_SID;
  const token = process.env.TWILIO_TOKEN;
  const from  = process.env.TWILIO_FROM;

  if (!sid || !token || !from) {
    return res.status(500).json({ error: "Twilio env vars not configured (TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM)" });
  }

  const { to, body } = req.body;
  if (!to || !body) return res.status(400).json({ error: "to and body are required" });

  const credentials = Buffer.from(`${sid}:${token}`).toString("base64");

  const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
  });

  const data = await twilioRes.json();

  if (!twilioRes.ok) {
    return res.status(twilioRes.status).json({ error: data.message ?? "Twilio error" });
  }

  return res.status(200).json({ sid: data.sid, status: data.status });
}
