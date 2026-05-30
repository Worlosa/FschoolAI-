// api/groq.js — Vercel serverless function
// Proxies requests to Groq API. GROQ_KEY lives here only, never in the browser bundle.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const key = process.env.GROQ_KEY;
  if (!key) {
    return res.status(500).json({ error: "GROQ_KEY not configured" });
  }

  const { messages, system } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array required" });
  }

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          ...(system ? [{ role: "system", content: system }] : []),
          ...messages,
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    const data = await groqRes.json();

    if (!groqRes.ok) {
      return res.status(groqRes.status).json({ error: data.error?.message ?? "Groq API error" });
    }

    const content = data.choices?.[0]?.message?.content ?? "";
    return res.status(200).json({ content });

  } catch (err) {
    return res.status(500).json({ error: err.message ?? "Internal server error" });
  }
}
