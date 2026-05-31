// api/tts.js — Vercel serverless ElevenLabs TTS proxy
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).set(CORS).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ELEVENLABS_API_KEY not configured" });

  const { text, voiceId } = req.body || {};
  if (!text || typeof text !== "string") return res.status(400).json({ error: "text is required" });

  const voice = voiceId || DEFAULT_VOICE_ID;
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text.substring(0, 500),
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.42,
          similarity_boost: 0.82,
          style: 0.18,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      // Log full error so it shows in Vercel function logs
      console.error(`ElevenLabs ${response.status}:`, errText);
      // Return the actual ElevenLabs error to the client for debugging
      return res.status(502).set(CORS).json({
        error: `ElevenLabs ${response.status}`,
        detail: errText,
        voice_used: voice,
        key_prefix: apiKey.substring(0, 8) + "...", // confirm key is reaching proxy
      });
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    return res.status(200).set(CORS).json({
      audio: base64,
      mimeType: "audio/mpeg",
    });

  } catch (err) {
    console.error("TTS proxy error:", err.message);
    return res.status(502).set(CORS).json({ error: err.message });
  }
}
