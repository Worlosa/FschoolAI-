// api/transcribe.ts — large audio/video → transcript → RAG, via direct-to-Storage
// upload + AssemblyAI. Action-routed (one function to respect the Vercel limit):
//   POST /api/transcribe?action=sign    { userId, filename }            → signed upload URL
//   POST /api/transcribe?action=start   { userId, storagePath, title,
//                                         courseId?, kind? }            → { jobId }
//   POST /api/transcribe?action=status  { jobId }                       → { job }
//
// We POLL the provider (no public webhook needed → works in dev and prod). The browser
// uploads the file straight to Storage, so the file never hits the 4.5MB function body
// limit. On completion the transcript is ingested into RAG (chunked + embedded).

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { ingest, embedBatch } from "./rag.js";

const BUCKET = "media-uploads";
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_ANON_KEY,
);

const aai = () => process.env.ASSEMBLYAI_API_KEY;

// ── sign: short-lived signed upload URL so the browser uploads directly to Storage ─
async function sign(body) {
  const { userId, filename } = body ?? {};
  if (!userId) return { status: 400, json: { error: "userId required" } };
  const safe = String(filename || "media").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const path = `${userId}/${Date.now()}-${safe}`;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error) return { status: 500, json: { error: `sign: ${error.message}` } };
  return { status: 200, json: { path: data.path, token: data.token } };
}

// ── start: submit the uploaded file to AssemblyAI via a signed READ url ─────────
async function start(body) {
  const { userId, storagePath, title = "Recording", courseId = null, kind = "audio" } = body ?? {};
  if (!userId || !storagePath) return { status: 400, json: { error: "userId and storagePath required" } };
  if (!aai()) return { status: 500, json: { error: "ASSEMBLYAI_API_KEY not configured" } };

  const { data: signed, error: sErr } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 60 * 60 * 6);
  if (sErr || !signed?.signedUrl) return { status: 500, json: { error: `signed read url: ${sErr?.message}` } };

  const jobId = randomUUID();
  await supabase.from("media_jobs").insert({
    id: jobId, user_id: userId, course_id: courseId, title, kind, storage_path: storagePath, status: "transcribing",
  });

  const res = await fetch("https://api.assemblyai.com/v2/transcript", {
    method:  "POST",
    headers: { Authorization: aai(), "Content-Type": "application/json" },
    body:    JSON.stringify({ audio_url: signed.signedUrl }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.id) {
    await supabase.from("media_jobs").update({ status: "error", error: data?.error || `assemblyai ${res.status}` }).eq("id", jobId);
    return { status: 502, json: { error: data?.error || "transcription submit failed" } };
  }
  await supabase.from("media_jobs").update({ provider_id: data.id }).eq("id", jobId);
  return { status: 200, json: { jobId } };
}

// ── status: poll the provider; on completion, ingest the transcript into RAG ─────
async function status(body) {
  const { jobId } = body ?? {};
  if (!jobId) return { status: 400, json: { error: "jobId required" } };
  const { data: job } = await supabase.from("media_jobs").select("*").eq("id", jobId).maybeSingle();
  if (!job) return { status: 404, json: { error: "job not found" } };

  // Terminal states — nothing to do.
  if (job.status === "done" || job.status === "error" || !job.provider_id) {
    return { status: 200, json: { job: pick(job) } };
  }

  // Check the provider.
  const tr = await fetch(`https://api.assemblyai.com/v2/transcript/${job.provider_id}`, { headers: { Authorization: aai() } });
  const tj = await tr.json().catch(() => ({}));

  if (tj.status === "error") {
    await supabase.from("media_jobs").update({ status: "error", error: tj.error || "transcription failed" }).eq("id", jobId);
    return { status: 200, json: { job: { ...pick(job), status: "error", error: tj.error } } };
  }
  if (tj.status !== "completed") {
    return { status: 200, json: { job: { ...pick(job), status: "transcribing" } } };
  }

  // Completed → ingest the transcript, then embed in bounded batches.
  const text = String(tj.text || "").trim();
  if (!text) {
    await supabase.from("media_jobs").update({ status: "error", error: "empty transcript" }).eq("id", jobId);
    return { status: 200, json: { job: { ...pick(job), status: "error", error: "empty transcript" } } };
  }
  await supabase.from("media_jobs").update({ status: "indexing" }).eq("id", jobId);

  const ing = await ingest({ userId: job.user_id, courseId: job.course_id, title: job.title, kind: job.kind, text });
  const documentId = ing.json?.documentId;
  if (!documentId) {
    await supabase.from("media_jobs").update({ status: "error", error: ing.json?.error || "ingest failed" }).eq("id", jobId);
    return { status: 200, json: { job: { ...pick(job), status: "error", error: ing.json?.error } } };
  }
  for (let i = 0; i < 1000; i++) {
    const e = await embedBatch({ userId: job.user_id, documentId });
    if (e.status !== 200 || e.json?.done) break;
  }
  await supabase.from("media_jobs").update({ status: "done", document_id: documentId }).eq("id", jobId);
  return { status: 200, json: { job: { ...pick(job), status: "done", document_id: documentId } } };
}

function pick(j) {
  return { id: j.id, status: j.status, error: j.error, document_id: j.document_id, title: j.title };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!process.env.SUPABASE_URL || !(process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_ANON_KEY))
    return res.status(500).json({ error: "Supabase env not configured" });

  const action = req.query?.action;
  try {
    const result = action === "sign"   ? await sign(req.body)
                 : action === "start"  ? await start(req.body)
                 : action === "status" ? await status(req.body)
                 : { status: 400, json: { error: "Unknown action. Use ?action=sign|start|status" } };
    return res.status(result.status).json(result.json);
  } catch (err) {
    console.error("[transcribe] error:", err?.message ?? err);
    return res.status(502).json({ error: err?.message ?? "transcription error" });
  }
}
