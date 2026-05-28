// api/groq.js — Vercel serverless function (Node.js, CJS runtime).
// Proxies Groq chat completions server-side so the API key is never in the browser bundle.
// Receives POST { messages: [...], system: "..." }

const GROQ_KEY = process.env.GROQ_KEY;
const MODEL    = "llama-3.1-8b-instant";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST")   { return res.status(405).json({ error: "Method not allowed" }); }

  if (!GROQ_KEY) {
    return res.status(500).json({ error: "GROQ_KEY not configured on server" });
  }

  const { messages, system } = req.body ?? {};
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array required" });
  }

  const msgs = system
    ? [{ role: "system", content: system }, ...messages]
    : messages;

  try {
    const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method:  "POST",
      headers: { Authorization: `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ model: MODEL, messages: msgs, max_tokens: 1500 }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: data.error?.message ?? `Groq error ${upstream.status}` });
    }
    res.status(200).json({ content: data.choices?.[0]?.message?.content ?? "" });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
};
