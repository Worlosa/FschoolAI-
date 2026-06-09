# NeuroAGI Brain — Memory Architecture Spec

**Status:** approved · written 2026-06-08 · based on Aryan's draft + team review  
**Author:** Aryan (extension lead) + architecture review  
**Read alongside:** `LIBRARY_ARCHITECTURE.md` (shared course library), `EXTENSION_ARCHITECTURE.md` (extension build guide), `BACKEND_GAPS.md` (Johan's fix list)

---

## 0. The One Principle That Decides Everything

> **Memory = stored + retrieved. NOT trained into the model's weights.**

The brain (NeuroAGI) is a **persistent store**. Reggie (the FschoolAI agent) **recalls** the relevant slice into its context window at query time. We do **not** fine-tune Reggie on student files — LLMs don't learn at inference, and fine-tuning teaches *style*, not *facts*. The system gets smarter because **the brain remembers more over time**, not because weights change.

Two tiers, like human memory:

- **Long-term memory** = brain DB (unlimited, cheap to grow): file contents, summaries, signals, grades, trajectory.
- **Working memory** = Reggie's context window (small, temporary): what it's reasoning about right now.
- **Recall** = retrieval that moves the relevant items from long-term → working memory per query.

**Non-goals (do not build):** per-student model training; fine-tuning the tutor on files; any dependency on BriLLM for the tutor's reasoning. Claude handles tutoring today. BriLLM is a separate research track — retrieval is model-agnostic and feeds whatever model reasons. If BriLLM matures, it consumes the same recall output without any architecture change.

---

## 1. Recall Strategy: LLM-Routed Summary Index (Not Vector RAG)

One student's corpus is small (hundreds of files), so we don't need vector similarity. RAG ranks by cosine *similarity*, which misses *intent*. We let a reasoning model do the selection instead.

**At ingest (background, once per file):** extract text → cheap model (Claude Haiku) produces a **1–2 sentence summary + topic keywords** → store summary + keywords + full `content_text`.

**At query (two stages, exposed to Reggie as a tool):**

1. **Route** — give the model the student's file *index* (`{file, course, summary, keywords}`, ~30 tokens/file → ~7K tokens for 200 files, fits in context). It picks relevant files **by intent**. `Assignment_01` gets picked because its summary says "Haskell project," even though the filename is useless.
2. **Read** — load the chosen files' full `content_text` → Reggie answers grounded in real content.

Add embeddings/`pgvector` **only later**, if a single student's corpus grows too large for the index to fit context — then vectors become a *pre-filter*, never the final decider.

---

## 2. Phasing (Build Order)

| Phase | What | Why It's Ordered Here |
|---|---|---|
| **0 — Security & source of truth** | JWT auth; route all writes through backend API; one project + one schema; fix Vercel env | Prerequisite. Today: open RLS + public anon key + extension writing directly to Supabase = breach surface. Storing file contents makes this worse. Must close first. |
| **1 — Content storage** | Extend `files` with `summary`/`keywords`/`content_text`; ingest pipeline extracts + summarizes | The memory substrate. `content_text` column already exists. |
| **2 — Recall API** | `recall_memory` tool for Reggie (replaces the classify-then-name-match in `tutor-context`) | Makes Reggie actually use the files; fixes the current 5–6s name-match latency. |
| **3 — Signals** | `signals` table + `/api/signals`; extension emits page/time/action events | Vincent's "brain signal emitter." Another stream into long-term memory. |
| **4 — Cross-course graph** | `concepts` + `concept_links` derived from per-file keywords | The "regression in Psych ↔ Ch.4 in Stats" insight. Reuses Phase 1 summaries — built once, powers both recall and the graph. |

> ⚠️ **Before Phase 0:** resolve the source-of-truth mess — `.env`/Vercel pointed at the **wrong Supabase project** (`yjiqqattsefunpbuewlk` vs the live `wqgxpouhbwhwpzudrptp`). Pick **one project + one schema** and make every writer/reader agree, or the brain becomes a third place data silently fails to show up.

---

## 3. Storage Schema (Brain = `neuroagi` Schema)

> ⚠️ **Important distinction — two different tables, both needed:**
>
> - **`neuroagi.files`** (this section) = **personal student files** — essays, notes, uploaded PDFs, files a specific student synced from their LMS. Personal to one student. Stored in the NeuroAGI brain DB. Deleted when the student deletes their brain.
>
> - **`public.course_content`** (see `LIBRARY_ARCHITECTURE.md`) = **shared course library** — lecture slides, syllabi, rubrics captured from LMS pages. Shared across ALL students in the same course. Stored in the FschoolAI DB. Owned by FschoolAI. Never deleted by a student.
>
> Do not merge these. Both tables must exist. They serve different purposes.

### 3.1 `files` — Extend the Existing Table

Already has: `id, user_id, course_id, assignment_id, lms_file_id, name, file_type, size_bytes, source_url, folder, status, content_text, source, updated_at`. Add:

```sql
ALTER TABLE neuroagi.files ADD COLUMN IF NOT EXISTS summary        TEXT;
-- LLM 1–2 sentence summary of the file content

ALTER TABLE neuroagi.files ADD COLUMN IF NOT EXISTS keywords       TEXT[];
-- LLM topic tags: ["regression analysis", "p-value", "hypothesis testing"]

ALTER TABLE neuroagi.files ADD COLUMN IF NOT EXISTS extract_status TEXT DEFAULT 'pending';
-- pending | done | failed

ALTER TABLE neuroagi.files ADD COLUMN IF NOT EXISTS extracted_at  TIMESTAMPTZ;

-- Later only (if corpus outgrows context):
-- ALTER TABLE neuroagi.files ADD COLUMN IF NOT EXISTS embedding vector(1536);
-- via pgvector — add only if needed as a pre-filter
```

### 3.2 `signals` — Behavioral Stream (Phase 3)

```sql
CREATE TABLE IF NOT EXISTS neuroagi.signals (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     TEXT REFERENCES neuroagi.users(id) ON DELETE CASCADE,
  course_id   UUID REFERENCES neuroagi.courses(id) ON DELETE SET NULL,
  type        TEXT,
  -- page_view | time_on_page | action | submission | struggle | procrastination_loop | late_night_session
  payload     JSONB,
  -- { url, seconds, target, assignment_id, ... }
  occurred_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS signals_user_time_idx ON neuroagi.signals (user_id, occurred_at DESC);
```

### 3.3 `concepts` + `concept_links` — Cross-Course Graph (Phase 4)

```sql
CREATE TABLE IF NOT EXISTS neuroagi.concepts (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   TEXT REFERENCES neuroagi.users(id) ON DELETE CASCADE,
  name      TEXT,
  -- e.g. "linear regression", "integration by parts"
  course_id UUID REFERENCES neuroagi.courses(id) ON DELETE SET NULL,
  file_id   UUID REFERENCES neuroagi.files(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS neuroagi.concept_links (
  id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id  TEXT REFERENCES neuroagi.users(id) ON DELETE CASCADE,
  from_id  UUID REFERENCES neuroagi.concepts(id) ON DELETE CASCADE,
  to_id    UUID REFERENCES neuroagi.concepts(id) ON DELETE CASCADE,
  relation TEXT,
  -- "same_as" | "prereq_of" | "applied_in"
  weight   FLOAT
);
```

Performance trajectory derives from `courses`/`assignments` history first. Add `performance_snapshots(user_id, course_id, score, captured_at)` only if a true time series is needed.

---

## 4. Ingest Pipeline (Phase 1)

Replaces the extension's direct Supabase writes (the security problem) with a backend route.

```
Extension (has the LMS session)
  └─ downloads file bytes / page text
  └─ POST /api/brain/ingest   (JWT in Authorization header)
        { lms_file_id, course_ref, name, file_type, source_url, text? }

Backend /api/brain/ingest  (validates JWT → uses SERVICE key server-side)
  1. if no text provided, fetch via source_url
  2. extract plain text (pdf→text, docx→text)
  3. Haiku → { summary, keywords }   (one cheap call per file, runs in background)
  4. upsert neuroagi.files (content_text, summary, keywords, extract_status='done')
```

Key rules:
- Heavy work (extract + summarize) is **background, at sync** — never on Reggie's chat path.
- Idempotent on `(user_id, lms_file_id)` — safe to re-run.
- Raw bytes: store in a **private** Supabase Storage bucket with signed URLs only if needed. The `content_text` + summary usually suffice and avoid hoarding binaries.

---

## 5. Recall API (Phase 2) — The Tool Reggie Calls

Replace the current `api/tutor-context.js` classify-then-`name ilike` flow with a recall tool. Expose it via **tool-use** so it fires only when a question needs memory (eliminates the per-message classify cost).

```
Tool: recall_memory(query: string) → {
  files:       [{ name, course, summary, status, source_url, content_text? }],
  grades:      [...],
  assignments: [...],
  signals:     [...]
}

Server logic:
  1. Load student file INDEX (id, name, course, summary, keywords) — small, cacheable
  2. Route: model picks relevant file_ids by intent over the index
  3. Read: SELECT content_text for those ids
  4. Return structured memory slice
```

This is intent-aware (a model selects, not cosine similarity), fast (summaries precomputed; only chosen files' text is loaded), and replaces brittle filename matching.

---

## 6. Caching — Make It Feel Like "It's All in Memory"

- **Resident, prompt-cached each session:** student profile + course list + **file summary index** + recent signals. Small, and Claude **prompt caching** means you don't re-pay to reload it every turn. This is Reggie's "always-on awareness."
- **On-demand:** full `content_text` of only the files a question actually needs (via `recall_memory`).

Result: Reggie is *aware* of everything (resident index) and can *read* anything (recall) — functionally "it has it all in memory," done scalably. Expected cost reduction from prompt caching: 70–80% per multi-turn session.

---

## 7. Security (Phase 0 — Gates Everything That Stores Contents)

- **JWT auth:** extension authenticates → receives JWT token. All writes go through the backend API which validates the JWT and uses the service key server-side. No anon key writing directly from the client.
- **RLS:** move off `open_all using(true)` to user-scoped policies once identity is JWT-based.
- **Private storage** for any raw bytes; signed URLs only.
- **One project, one schema, correct Vercel env** — fix the `yjiqqattsefunpbuewlk` vs `wqgxpouhbwhwpzudrptp` mismatch before anything else.
- **Rotate** any service key that has been shared in chat or docs.

---

## 8. Model-Agnostic Boundary

Recall returns a **structured memory slice**. Whatever model reasons over it is swappable. Claude (Haiku for ingest summaries + routing, Sonnet for tutoring) today. BriLLM is research-stage — keep it out of the tutor path. If it ever matures, it consumes the same recall output without any architecture change. **Build the memory layer once; swap the model later.**

---

## 9. What Exists Today vs. What to Build

**Done (on `extension-aryan`, uncommitted):**
- `files` table (+ `content_text` seam) in both schemas + migration
- Extension harvests files (Canvas/D2L/Moodle) → structured `files` table
- Files page in app; recall-lite via `tutor-context` `file_lookup` (name/keyword match) working locally

**To build (this spec):**
- Phase 0: JWT auth + backend writes + env/schema source-of-truth fix
- Phase 1: `summary`/`keywords` columns + ingest summarization pipeline
- Phase 2: `recall_memory` tool (replaces name-match) + tool-use wiring in `NeuralRing.jsx`
- Phase 3: `signals` table + `/api/signals` route + extension signal emission
- Phase 4: `concepts`/`concept_links` tables + cross-course connector

See `BACKEND_GAPS.md` for Johan's parallel backend work that must be completed before Phase 1 is testable end-to-end.
