// api/lms-ingest.ts — Unified LMS file ingestion pipeline
// POST /api/lms-ingest
// Body: {
//   userId:   string,
//   courseId?: string,
//   file: {
//     name:      string,       // "lecture3.pdf"
//     mimeType:  string,
//     bytes:     string,       // base64-encoded raw file content
//     sourceUrl: string,       // original URL — used for dedup
//     provider:  string,       // "google" | "microsoft" | "extension"
//     metadata?: { courseId?, platform?, assignmentId?, originalFilename? }
//   }
// }
// Returns: { ok, documentId, skipped? }

import { createClient } from "@supabase/supabase-js";
import { ingest, embedBatch } from "./rag.js";

let _sb: any = null;
function sb() {
  if (_sb) return _sb;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env vars not configured");
  _sb = createClient(url, key);
  return _sb;
}

function selfBaseUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:5173";
}

// api/extract.ts routes on `file_type` (extension) + `name`, NOT a MIME string.
function deriveFileType(name: string, mimeType: string): string {
  const fromName = name.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5 && /^[a-z0-9]+$/.test(fromName)) return fromName;
  const sub = mimeType.split("/")[1]?.toLowerCase() ?? "";
  if (sub.includes("pdf")) return "pdf";
  if (sub.includes("wordprocessingml")) return "docx";
  if (sub.includes("presentationml")) return "pptx";
  if (sub.includes("spreadsheetml")) return "xlsx";
  return sub || "txt";
}

// Claude native PDF OCR — fallback for scanned documents where extract returns no text.
// Uses the document content type (GA on all current Claude models).
//
// OCR model selection (see lms-ingest.ts for performance/cost tradeoffs):
// - ANTHROPIC_MODEL_OCR env var (defaults to Haiku):
//   - "claude-haiku-4-5-20251001" (default) — fast & cheap, good for clean PDFs/typed docs
//   - "claude-sonnet-4-6" — better accuracy, good for handwriting/sketches/smudged scans (~3x cost)
//   - "claude-opus-4-8" — best accuracy, overkill for most use cases (~15x cost)
//
// To change: set ANTHROPIC_MODEL_OCR=claude-sonnet-4-6 in .env.local (dev) or Vercel env (prod)
async function claudePdfOcr(base64: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");

  // Default to Haiku (fast, cheap) — change via ANTHROPIC_MODEL_OCR env var
  const model = process.env.ANTHROPIC_MODEL_OCR ?? process.env.ANTHROPIC_MODEL_CHEAP ?? "claude-haiku-4-5-20251001";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:  "POST",
    headers: {
      "Content-Type":    "application/json",
      "x-api-key":       key,
      "anthropic-version": "2023-06-01",
      "anthropic-beta":  "pdfs-2024-09-25",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [{
        role: "user",
        content: [
          {
            type:   "document",
            source: { type: "base64", media_type: "application/pdf", data: base64 },
          },
          {
            type: "text",
            text: "Extract all text from this document verbatim. Preserve structure (headings, paragraphs, lists). Output only the extracted text, no commentary or formatting.",
          },
        ],
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Claude OCR ${res.status}: ${err.slice(0, 300)}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

function sanitize(raw: string): string {
  return raw.replace(/ /g, "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { userId, courseId, file } = req.body ?? {};

  if (!userId || !file?.name || !file?.mimeType || !file?.bytes || !file?.sourceUrl || !file?.provider) {
    return res.status(400).json({
      error: "Required: userId, file.name, file.mimeType, file.bytes (base64), file.sourceUrl, file.provider",
    });
  }

  const supabase = sb();
  const base = selfBaseUrl();

  // ── 1. Dedup check ────────────────────────────────────────────────────────
  try {
    const { data: existing } = await supabase
      .from("files")
      .select("id, document_id")
      .eq("user_id", userId)
      .eq("source_url", file.sourceUrl)
      .maybeSingle();

    if (existing) {
      return res.status(200).json({ ok: true, documentId: existing.document_id, skipped: true });
    }
  } catch (_) {
    // files table may not have source_url column yet (migration not run) — skip dedup
  }

  // ── 2. Extract text ───────────────────────────────────────────────────────
  const extractRes = await fetch(`${base}/api/extract`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      base64:    file.bytes,
      file_type: deriveFileType(file.name, file.mimeType),
      name:      file.name,
    }),
  });
  if (!extractRes.ok) {
    const detail = await extractRes.text().catch(() => "");
    console.error("[lms-ingest] extract failed", extractRes.status, detail.slice(0, 200));
    return res.status(502).json({ error: `extract failed (${extractRes.status})` });
  }
  const { text: rawText } = await extractRes.json();

  // ── 2b. Claude OCR fallback — scanned PDFs return < 40 chars of text ──────
  let text: string;
  const isPdf = deriveFileType(file.name, file.mimeType) === "pdf";

  if (!rawText?.trim() || rawText.trim().length < 40) {
    if (!isPdf) {
      return res.status(422).json({ error: "No text could be extracted from file" });
    }

    console.log("[lms-ingest] extract returned short/empty text — trying Claude OCR fallback");
    try {
      const ocrText = await claudePdfOcr(file.bytes);
      if (!ocrText?.trim()) {
        return res.status(422).json({ error: "No text could be extracted from file (OCR found nothing)" });
      }
      text = sanitize(ocrText);
      console.log(`[lms-ingest] Claude OCR extracted ${text.length} chars`);
    } catch (ocrErr: any) {
      console.error("[lms-ingest] Claude OCR failed:", ocrErr.message);
      return res.status(422).json({ error: "No text could be extracted from file" });
    }
  } else {
    // Strip null bytes and control chars that PostgreSQL rejects in text fields.
    text = sanitize(rawText);
  }

  // ── 3. RAG ingest — called directly (no HTTP hop) ─────────────────────────
  const ragResult = await ingest({
    userId,
    courseId:  courseId ?? null,
    title:     file.name,
    kind:      "lms",
    sourceUrl: file.sourceUrl,
    text,
  });

  if (ragResult.status !== 200) {
    const detail = ragResult.json?.error ?? `rag ingest failed (${ragResult.status})`;
    console.error("[lms-ingest] rag ingest failed:", detail);
    return res.status(502).json({ error: detail });
  }

  const { documentId } = ragResult.json;
  if (!documentId) return res.status(502).json({ error: "RAG ingest returned no documentId" });

  // ── 4. Embed (fire-and-forget) ────────────────────────────────────────────
  embedBatch({ userId, documentId }).catch((e: any) =>
    console.error("[lms-ingest] embed failed", e.message)
  );

  // ── 5. Record in files table ──────────────────────────────────────────────
  const fileRow: Record<string, any> = {
    user_id:     userId,
    course_id:   courseId ?? null,
    name:        file.metadata?.originalFilename ?? file.name,
    source_url:  file.sourceUrl,
    provider:    file.provider,
    document_id: documentId,
    status:      "indexed",
  };
  const { error: insertErr } = await supabase.from("files").insert(fileRow);
  if (insertErr) {
    console.error("[lms-ingest] files insert error (non-fatal):", insertErr.message);
  }

  return res.status(200).json({ ok: true, documentId });
}
