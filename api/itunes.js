// api/itunes.js — Vercel serverless iTunes Search API proxy
// Exists purely to avoid CORS — iTunes doesn't send CORS headers to browsers
// (affects iOS Safari, Android Chrome, and local dev equally).
// No API key needed. Just forwards the query to itunes.apple.com server-side.
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { term, media = "music", entity = "song", limit = "8", lang = "en_us" } = req.query;
  if (!term) return res.status(400).json({ error: "term is required" });

  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=${media}&entity=${entity}&limit=${limit}&lang=${lang}`;

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `iTunes returned ${upstream.status}` });
    }
    const data = await upstream.json();
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, s-maxage=300"); // cache 5 min on Vercel edge
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({ error: err.message ?? "iTunes fetch failed" });
  }
}
