// api/summarize.ts — generates an AI summary + key highlight passages from document text.
// Uses Claude Haiku (fast, cheap). Returns { summary, highlights: string[] }.
// Called after /api/extract; stores result in files.summary + files.highlights.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST")   return res.status(405).end();

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });

  const { text, title } = req.body ?? {};
  if (!text?.trim()) return res.status(400).json({ error: "text required" });

  // Sample the first ~6 000 chars — enough for a representative summary without
  // burning tokens on very long documents.
  const sample = text.slice(0, 6000).trim();
  const truncated = text.length > 6000;

  const prompt = `You are an AI study assistant. A student has uploaded a document and you need to help them study it.

Document title: "${title || "Untitled"}"
${truncated ? "(Note: showing first portion of a longer document)\n" : ""}
Content:
${sample}

Return ONLY valid JSON (no markdown, no explanation) with this exact shape:
{
  "summary": "2-4 sentence overview of the main ideas and what a student should know",
  "highlights": [
    "exact verbatim quote from the text worth highlighting (1-2 sentences each)",
    "another key passage..."
  ]
}

Rules:
- summary: concise, what matters most for studying
- highlights: 5-8 items, exact text as it appears in the document, prioritise definitions, key arguments, important facts`;

  try {
    const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method:  "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 900,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: `Claude ${response.status}`, detail: errText.slice(0, 200) });
    }

    const data     = await response.json();
    const raw      = data.content?.[0]?.text?.trim() ?? "{}";

    let parsed: { summary?: string; highlights?: string[] } = {};
    try {
      // Strip possible markdown fences from the model response
      const clean = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      // If JSON parse fails, return the raw text as a plain summary
      parsed = { summary: raw.slice(0, 500), highlights: [] };
    }

    return res.status(200).json({
      summary:    parsed.summary    ?? "",
      highlights: parsed.highlights ?? [],
    });
  } catch (err) {
    console.error("[summarize]", err);
    return res.status(502).json({ error: (err as any)?.message || "Summarization failed" });
  }
}
