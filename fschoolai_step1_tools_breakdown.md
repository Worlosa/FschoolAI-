# Step 1 (Point 2) — Tools / API / MCP Breakdown: the agent capability surface

**v1 draft for tech review.** Companion to `fschoolai_step1_scenario_plan.md` (Point 1 = scenarios: input/output/max-latency). This file answers the senior-eng's **Point 2: "break down the tools / API / MCP tools the agent can utilize."** Source material: the live `api/*` surface (audited file-by-file), `FschoolAI_PRD.md` §3/§7.1/§13/§15, `fschoolai_scenarios_and_tools.md`, and the merged NeuroAGI architecture.

> Scope discipline (same as Point 1): this is the **breakdown / inventory** of the capability surface — every tool's signature, side-effects, statefulness, latency budget, gate, transport, and build-status. It is **not** the final JSON tool schemas (that's the Step-2 implementation deliverable) and **not** a rewrite of the agent loop (Step 4). It is the contract the catalog trajectories in Point 1 reference by name.

---

## 0. The mental model (why this layer exists)

```
        ┌─────────────────────────  NeuroAGI brain (STATEFUL)  ─────────────────────────┐
        │  memory log · context_window · signals · decay · arbiter policy · identity     │
        └───────────────▲───────────────────────────────────────────────▲───────────────┘
                         │ bus / HTTP / MCP (recall · remember · propose)  │
        ┌────────────────┴───────────────────────────────────────────────┴───────────────┐
        │  FschoolAI MAIN AGENT (Reggie)  — router + tool-use loop, runs CLOSED-LOOP       │
        │  picks a capability, calls it, observes, repeats; only hops the brain to         │
        │  read context / write a signal / propose a nudge — NOT per step.                 │
        └───────────────▲─────────────────────────────────────────────────────────────────┘
                         │ tool calls (HTTP to api/* · provider SDKs · MCP)
        ┌────────────────┴────────────────────────────────────────────────────────────────┐
        │  CAPABILITY LAYER (STATELESS tools) — api/*.ts serverless fns + external providers │
        │  canvas · rag · extract · transcribe · tts · stt · summarize · flashcards · …      │
        └─────────────────────────────────────────────────────────────────────────────────┘
```

Three load-bearing rules this whole breakdown enforces:

1. **State lives in the brain, never in a tool.** Every capability tool is a pure-ish function of `(args, brain-context)`. If a tool needs memory, it *reads* `recall` and *writes* `remember`; it never holds session state itself. This is what makes tools horizontally scalable and replayable as eval fixtures.
2. **Gates are not tools the model may skip.** Integrity (Socratic / feedback-only / non-submittable), tier/quota, k-anonymity, and cold-start are **hard pre-steps in code**, not optional functions the LLM chooses to call. (See §6 T2 — the single most important tool-layer invariant.)
3. **Anything slower than its latency ceiling becomes async.** A tool that can exceed its Vercel `maxDuration` (e.g. multi-hour transcription) MUST run as a C3 "notify-when-ready" job, never a synchronous hang. (§6 T4.)

---

## 1. Tool-contract schema (every tool is one row of this)

Each tool in §3 is specified against these columns. Every column has a reason tied to an edge case or an SLO.

| # | Field | Domain | Why it exists |
|---|-------|--------|---------------|
| 1 | `tool_id` | stable slug (`recall`, `rag.query`, `canvas.sync`) | Stable name the Point-1 `expected_tool_TRAJECTORY` references permanently. |
| 2 | `transport` | `brain-bus / MCP / http(api/*) / provider-SDK / client-pure` | How the agent reaches it. Determines auth, latency floor, and whether it's MCP-exposed. |
| 3 | `signature → returns` | typed | The call contract the trajectory asserts against. |
| 4 | `statefulness` | `stateless-read / brain-write / product-write / pure` | The §0 rule-1 classification. Drives idempotency + replay design. |
| 5 | `side_effects` | enum list | What it mutates (brain.signals, context_window, product table, external send, billing). Anything here needs an idempotency story (§6 T3). |
| 6 | `latency_budget` + `class` | ms + C0–C4 | The per-tool ceiling that rolls up into the scenario's stage budget (Point 1 §3.2). |
| 7 | `model_hop` | `none / Haiku-mini / Sonnet-4o` | If it calls an LLM, which tier (gateway routing, §5). Justifies the tool/LLM stage cost. |
| 8 | `gates` | `integrity / tier / k-anon / coldstart / none` | Mandatory pre-steps that fire **before** the tool body (§6 T2). |
| 9 | `idempotency` | key / lock / none-needed | Prevents double-award, double-deliver, dup-signal (§6 T3). |
| 10 | `auth / secret` | anon-key / service-key / sensitive-env / provider-key | Which credential, and the client/server split. |
| 11 | `failure_mode` | degraded branch | What the tool returns when it/its dependency fails — never an unhandled throw (§6 T6/T17). |
| 12 | `callers` | agents that invoke it | Reggie + which sub-agents (Point-1 agent column). |
| 13 | `status` | `live / partial / spec` | From the code audit. |
| 14 | `code_ref` | `api/<file>.ts` or "spec" | Provenance; keeps the breakdown honest. |

---

## 2. Transport classes (how the agent actually calls a tool)

| Class | What | Examples | Notes / edges |
|---|---|---|---|
| **brain-bus** | call into NeuroAGI over the bus (local in-proc, HTTP, or MCP depending on deploy) | `recall`, `remember`, `propose_proactive`, `forget`, `reinforce` | Cross-project hop ≈ **600 ms** (brain Supabase ≠ product Supabase). Needs the person identity resolved first (`brain-person-link`). Brain unreachable → **flat-mock degrade**, never block (§6 T7). |
| **MCP** | the same brain tools (and select product tools) exposed as **MCP tools** so any NeuroAGI product agent can call them with a shared schema | brain read/write set; future product tools for cross-product reuse | MCP server may be **absent in headless/cron** runs → tool must degrade. Schema/version skew between brain-MCP and agent is a real edge (§6 T15). |
| **http (api/*)** | the agent's own serverless functions on Vercel | `rag`, `extract`, `transcribe`, `canvas`, `summarize`, `flashcards`, `library-agent`, `token-engine`, … | ESM `.js` import discipline is load-bearing — a missing `.js` extension took down **all** `/api` once (`ERR_MODULE_NOT_FOUND`, §6 T6). Bounded by Vercel `maxDuration` (§6 T4). |
| **provider-SDK** | external API behind one of our endpoints (never called from the client directly) | Anthropic/Groq (LLM), OpenAI (embeddings/OCR), ElevenLabs (TTS/Scribe), Deepgram/Tencent/Whisper (STT), Daily.co/LiveKit (voice rooms), Canvas, Google/Apple Calendar, Discord, Resend, Twilio | Each has its own **429 / rate-limit** behavior → backoff + gateway fallback (§6 T5). Provider keys are server-only. |
| **client-pure** | deterministic computation, **no server, no LLM** | `what_if` grade calculator, leaderboard render, offline cached briefing | C0. MUST NOT be modeled as an LLM tool — determinism + 0-latency + works offline (§6 T10). |

**Tool-use vs prompt-routing (code_reality):** `api/claude.ts` already accepts an Anthropic `tools` array (`body.tools`), so a real **tool-use loop is supported by the proxy**. But today Reggie routes by prompt, not a tool-use loop, and `recall` is a parallel keyword fetch rather than a model-selected tool (Point-1 G1.2 `code_reality`). The breakdown below is written to the **tool-use target**; Step 4 makes the loop real.

---

## 3. The inventory (grouped by capability domain)

Latency/class per Point-1 §3. `status`: **live** = shipped & wired, **partial** = endpoint exists but doesn't meet the catalog contract, **spec** = not built.

### A. Brain / NeuroAGI — stateful, via bus / MCP

| tool_id | signature → returns | statefulness | latency | gates | idempotency | status | code_ref |
|---|---|---|---|---|---|---|---|
| `recall` | `(person, subject, query?)` → context slice `{learning_style, knowledge_gaps[], stress_level, momentum_state, active_deadline, recent_summary, what_to_focus_on, what_not_to_mention, preferred_language, session_count}` | stateless-read | **≤300 ms warm** (`context_window`); cold rebuild 3–8 s → **forbidden on hot path** | coldstart | n/a | **partial** | `api/tutor-context.ts` (reads `brain.context_window`, `Accept-Profile: brain`); returns `{context:null}` if no link/env |
| `remember` | `(person, {signalType, source, payload})` → ack | **brain-write (append-only)** | async, off-path (fire-and-forget) | none | dedup key on `(person, kind, hash)` | **live** | `api/brain-signal.ts` |
| `session_summary_write` | `(person, recentMessages)` → living-mind rewrite + signal | brain-write | async (queue) | none | **must append/merge, not overwrite** (known overwrite bug fights the scheduler) | **partial** | `api/session-close.ts`, `api/self-write.ts` |
| `impression_write` | `(userId, userMessage, tutorResponse)` → non-blocking impression | brain-write | async | none | n/a | **live** | `api/tutor-impression.ts` |
| `link_identity` | `(userId)` → `brainPersonId` (one brain per person) | product+brain-write | ≤1 s, once | none | upsert on userId | **live** | `api/brain-person-link.ts` |
| `forget` / `reinforce` | `(person, filter)` → ack | brain-write | async | none | idempotent by filter | **spec** | RTBF + decay (nightly) |
| `verify_skill` | `(person, skill)` → `{mastery, evidence[]}` | stateless-read (derived) | ≤1 s | coldstart (data-gated) | n/a | **spec** | v2 derived layer |
| `brain_health` | `(person)` → metrics for dashboard | stateless-read (derived) | ≤1 s | coldstart | n/a | **spec** | v2 derived layer |
| `context_window.warm` | `(person)` → pre-computed snapshot (the thing `recall` reads) | brain-write | C4 (~30 min cron + on-demand-if-stale) | none | optimistic lock; staggered | **partial** | `api/brain-scheduler.ts` (hourly), `api/brain-scheduler-fast.ts` (5-min `stress_score`) |

> **The #1 brain-layer dependency:** `recall`'s ≤300 ms budget is only real if `context_window.warm` has actually populated the snapshot. This is the warm-cache resolution baked into Point-1 §8.1.1; until it lands, every C1 reactive scenario silently falls back to a cold 3–8 s rebuild.

### B. Routing & orchestration — main-agent internal

| tool_id | signature → returns | statefulness | latency | model | status | code_ref |
|---|---|---|---|---|---|---|
| `route_intent` | `(message, modalities)` → `{agent, intent, gates_to_apply[]}` | pure | **≤100 ms** | Haiku/4o-mini | **partial** (prompt-routed today, not a tool-use loop) | `api/claude.ts` (supports `tools`) |
| `tutor_llm` | `(messages, system, tools?)` → answer (stream) | stateless | ≤1.8 s perceived **via streaming** | Sonnet-4o | **partial** (non-streaming today) | `api/claude.ts`, `api/groq.ts` |
| `detect_voice_change_intent` | `(message)` → bool | pure | ≤50 ms | Haiku/mini | live but **runs on every message** (move off hot path) | (pre-routing hop) |
| `sanitize_messages` | `(history)` → cleaned array | pure | ~0 | none | **live** (mandatory wrapper) | `src/lib/chatMessages.ts` |

### C. Canvas / academic data

| tool_id | signature → returns | statefulness | latency | idempotency | status | code_ref |
|---|---|---|---|---|---|---|
| `canvas.sync` | `(user)` → upserts courses/assignments/grades/syllabus | product-write | C4 (6 h cron + on-demand) | **idempotent upsert; manual/past-course must survive** (known overwrite bug) | **partial** (client-side, serial, no cron, PAT not OAuth) | `src/api/canvasSync.ts`, `api/extension-sync.ts` (`upsert_*`) |
| `canvas.proxy` | `(base, path, token)` → raw Canvas REST passthrough | stateless-read | ≤1 s | n/a | **live** | `api/canvas.ts` |
| `canvas.reads` (`grades`/`assignments`/`upcoming`) | `(user, course?)` → typed reads | stateless-read | ≤1 s | n/a | **partial** (sync exists; typed read endpoints thin) | `api/extension-sync.ts` (`get_courses/get_assignments/get_stats`) |
| `grade_weights` | `(course)` → weight schema (feeds `what_if`) | stateless-read | ≤1 s | n/a | **spec** (syllabus weights not synced) | — |
| `course_resolve` | `(hint)` → canonical course | stateless-read | ≤500 ms | n/a | **live** | `api/course-resolver.ts` |

### D. RAG / content / retrieval

| tool_id | signature → returns | statefulness | latency | model | status | code_ref |
|---|---|---|---|---|---|---|
| `rag.ingest` | `(userId, courseId, doc)` → chunked+embedded rows | product-write | seconds (batched) | OpenAI embed | **live** | `api/rag.ts?action=ingest` |
| `rag.embed` | `(texts[])` → vectors (1536-d) | pure | ≤1 s/batch | OpenAI `text-embedding-3-small` | **live** | `api/rag.ts?action=embed` |
| `rag.query` | `(user, q)` → grounded chunks (pgvector cosine + FTS, fused by **RRF**, rerank gpt-4o-mini) | stateless-read | ≤2 s target (today 1.5–4 s behind a fixed 3000 ms race tax) | mini rerank | **live** | `api/rag.ts?action=query` |
| `extract` | `(base64\|storagePath, file_type, youtubeUrl?)` → structure-preserving text (pdf/docx/pptx/img/yt + OCR fallback) | pure | seconds | OpenAI OCR (scanned) | **live** | `api/extract.ts` |
| `file_url` | `(path, expiresIn)` → short-lived signed URL | stateless-read | ≤300 ms | none | **live** | `api/file-url.ts` |
| `library.lookup` | `(university, course, type)` → shared `course_content` matched to gaps/level | stateless-read | ≤1 s | mini | **partial** | `api/library-agent.ts`, `api/extension-content.ts` |
| `recall_memory` | `(user, query)` → student files by **summary-index intent routing** (not vector) | stateless-read | ≤2 s | mini | **spec** (v2 MEMORY_ARCH) | — |

### E. Generation (LLM artifacts) — tier-gated

| tool_id | signature → returns | latency / class | model | tier | gates | status | code_ref |
|---|---|---|---|---|---|---|---|
| `summarize` | `(text, title)` → summary + verbatim highlights | ≤5 s (C2) | mini | Pro+ | none | **live** | `api/summarize.ts` |
| `flashcards.*` | `(action:save\|load\|delete, userId, courseId, cards)` → `flashcards_v2` rows | ≤2 s | (gen separate) | Pro+ | none | **live** | `api/flashcards.ts` |
| `generate_quiz` | `(source)` → quiz | ≤5 s | mini | Pro+ | none | **partial** | (SpaceExams one-shot) |
| `generate_exam_plan` / `evaluate_answers` | `(gaps, readiness)` → multi-day plan / per-answer score | ≤10 s (C2, loader) | Sonnet/4o | — | coldstart | **partial** | — |
| `generate_framework` | `(rubric, prof_profile, gaps)` → **blank scaffold only** | ≤5 s | Sonnet | — | **writing-feedback-only** (headings only, never body) | **spec** | — |
| `generate_lesson_video` | `(concept, brain-context)` → 2–4 min video (script → Manim → ElevenLabs TTS → stitch) | **<5 min async (C3)** | Sonnet script | **Pro, 10/mo** (resolved, Point-1 §8.1.6) | tier-gate **first**; media-non-submittable; brain-grounding precondition | **spec** | — |
| `generate_podcast` | `(source_set, format)` → multi-voice audio | **<3 min async (C3)** | Sonnet script | Pro+ | tier-gate; non-submittable | **spec** | — |
| `what_if` | `(grade_weights, hypothetical)` → projected grade | **C0 instant, client-pure, NO LLM** | none | Pro+ | coldstart (≥1 graded) | **spec** | client fn |

### F. Media — STT / TTS / transcription (modality-routed)

| tool_id | signature → returns | latency / class | provider routing | status | code_ref |
|---|---|---|---|---|---|
| `stt` | `(audio)` → transcript | realtime-ish | Groq Whisper (fast path) | **live** | `api/stt.ts` |
| `transcribe` (long) | `?action=sign\|start\|status` `(audio\|storagePath, lang)` → transcript → **auto-ingest to RAG** | **C2 ≤10 s step / C3 minutes** | ElevenLabs Scribe (EN); **maxDuration=300** wall → multi-hour needs webhook/poll | **partial** | `api/transcribe.ts` |
| `transcribe.route` | `(audio, lang)` → engine selection | adds language-detect hop | **Scribe EN-RT · Deepgram es/fr · Tencent zh · Whisper large-v3 batch/post** | **spec** (routing absent) | — |
| `tts` | `?action=voices\|stream` `(text, voiceId, speed)` → mp3 | ≤2 s (stream) | ElevenLabs; text capped 500 / 2000 (stream) | **live** | `api/tts.ts` |

### G. Proactivity & delivery — the C4 control plane

| tool_id | signature → returns | statefulness | cadence | idempotency | status | code_ref |
|---|---|---|---|---|---|---|
| `propose_proactive` | `(person, candidate)` → `proactive_signals` row | product-write | async on detect | dedup at arbiter | **live** | `api/_notify.ts` |
| `detect_intervention` | watch `brain.signals` → `needsIntervention` → propose | brain-read + propose | **event-driven (Realtime on INSERT) + 5-min `stress_score`**; 30-min cron demoted to hourly safety sweep (resolved, §8.1.4) | — | **partial** (today only stress≥threshold / momentum) | `api/brain-intervention.ts` |
| `arbiter` | (cron) dedup · rank (urgency×value) · rate-limit (≤1/hr, ≤3/day) · quiet-hours (23:00–08:00) · **ε-greedy channel** → `notification_queue` → deliver | product-write | every 5 min, `maxDuration=60` | **single per-student claim lock**; reclaim stale | **live** | `api/arbiter.ts` |
| `deliver_in_app` / `deliver_discord` | `(person, payload)` → delivery + `delivered_at`/`opened_at`/`action_taken` tracking | product-write | async | delivery key | **live** | `api/_notify.ts`, `api/discord.ts` |
| `deliver_sms` | `(to, body)` → Twilio send | external-send | async | **must route through arbiter** (no quiet-hours bypass, resolved §8.1.5) | **partial** | `api/_utils.ts` (Twilio) |
| `notify` | `(person, type, payload)` → immediate transactional (non-proactive) | product-write | instant | n/a | **live** | `api/_notify.ts` |
| `assignment_reminder` | (cron) deadline reminders | product-write | daily 08:00 → **re-route via `propose_proactive`→arbiter** | inherits arbiter dedup | **partial** | `api/assignment-reminder.ts` |
| `friend_nudge` | `(fromUser, toUser, room)` → "come study", rate-limited, email fallback | external-send | on-demand | per-pair rate limit | **live** | `api/nudge.ts` |
| `compute_tuning` | `(labels)` → per-student threshold (≥20-label gate, stress 0–1, best-channel ≥5 samples) | pure | nightly/on-read | n/a | **live** | `api/_tuning.ts` |
| `email.*` | `?action=send\|verify\|reset` | external-send | on-demand | token | **live** | `api/email.ts` |

### H. Gamification / tokens

| tool_id | signature → returns | statefulness | latency | idempotency | status | code_ref |
|---|---|---|---|---|---|---|
| `token.award` | `(userId, event)` → balance delta | product-write | ≤500 ms | **idempotency key per event** (no double-award) | **live** | `api/token-engine.ts?action=award` |
| `token.summary` | `(userId)` → balance/streak | stateless-read | ≤300 ms | n/a | **live** | `api/token-engine.ts?action=summary` |

### I. Collaboration / voice rooms

| tool_id | signature → returns | latency | status | code_ref | note |
|---|---|---|---|---|---|
| `room.provision` | `(roomId, userName)` → voice room token | ≤1 s | **partial** | `api/daily-room.ts` (**Daily.co**) | ⚠ **PRD says LiveKit; code uses Daily.co** — reconcile the voice provider (§6 T14) |
| `room.orchestrate` | per-participant private `recall` → coordinate modes → `remember` | tutor turn ≤3 s | **spec** | — | **no individual's weakness leaked** (privacy gate) |

### J. Identity / auth / extension

| tool_id | signature → returns | statefulness | status | code_ref |
|---|---|---|---|---|
| `auth.*` | signup / login / reset (Supabase Auth bridge, service_role) | product-write | **live** | `api/auth-migrate.ts` |
| `extension.auth` | `(login\|signup\|profile)` for Chrome popup | product-write | **live** | `api/extension-auth.ts` |
| `extension.sync` | `(userId, action, …)` upsert canvas/courses/assignments/files/content; delete_stale; reads | product-write | **live** | `api/extension-sync.ts` |
| `extension.content` | shared course-library ingestion | product-write | **live** | `api/extension-content.ts` |

### K. System / lifecycle (cron capabilities, not agent-callable)

| tool_id | cadence | status | code_ref |
|---|---|---|---|
| `brain-scheduler` | hourly (warm context_window) | **partial** | `api/brain-scheduler.ts` |
| `brain-scheduler-fast` | every 5 min (`stress_score`) | **partial** | `api/brain-scheduler-fast.ts` |
| `nightly_reflection` | 2 AM, staggered 10pm–2am — synthesize day, decay, update gaps | **spec** (no cron yet; runs in brain layer) | — |

---

## 4. Statefulness ledger (the stateful-brain / stateless-tools split, made explicit)

| Class | Tools | Invariant |
|---|---|---|
| **Pure / deterministic** (no state, no LLM) | `what_if`, `sanitize_messages`, `rag.embed`, `compute_tuning`, leaderboard render | Must be replayable bit-for-bit; `what_if` runs client-side & offline. |
| **Stateless read** (read brain/product, no mutation) | `recall`, `rag.query`, `canvas.reads`, `library.lookup`, `verify_skill`, `tutor_llm`, `summarize`, `extract` | Safe to retry; cache-friendly; the LLM call itself holds **no** memory — state is injected via `recall`. |
| **Brain-write** (mutate the memory log) | `remember`, `session_summary_write`, `impression_write`, `context_window.warm`, `forget/reinforce`, nightly reflection | **Append-only / merge, never overwrite** (the `session-close` literal-overwrite bug is the cautionary case). Failed write → **queued + retried**, never blocks the user response. |
| **Product-write** (mutate FschoolAI tables) | `canvas.sync`, `flashcards.*`, `token.award`, `propose_proactive`, `arbiter`, `deliver_*` | **Idempotent** (upserts, idempotency keys, single-claim locks). A retried delivery must not double-send (§6 T3). |
| **External-send** (irreversible outward effect) | `deliver_discord`, `deliver_sms`, `email.*`, `friend_nudge`, `room.provision` | Rate-limited + governed by the arbiter; quiet-hours respected; no send is "fire twice on retry." |

---

## 5. The LLM gateway (the chokepoint every model-calling tool routes through)

Do this **first** — it's independent of the agent surface and pays off immediately. A **LiteLLM-style gateway** in front of `tutor_llm`, `route_intent`, `summarize`, `generate_*`, rerank, etc. centralizes:

| Concern | What the gateway gives |
|---|---|
| **Model routing (§7.1)** | task → tier: **Haiku / 4o-mini** for route · classify · eval · summarize · flashcards · cohort · reflection; **Sonnet / 4o** for tutor · exam-plan · video/podcast script ("quality is the moat — don't downgrade"). |
| **Prompt cache** | cache the brain-context system-prompt **prefix** → 40–60% multi-turn token cut, and a faster first token (helps the C1 stream budget). |
| **Fallback** | provider 429 / outage → automatic model fallback (mirrors `api/groq.ts`'s 429-retry, generalized). |
| **Cost accounting** | per-tool, per-tier spend — needed before the tool surface grows. |
| **Trace logging** | the natural central **span emitter** for the full-chain trace `route → recall → tool → LLM → write → deliver`; the trace store doubles as the eval-fixture source (Point-1 §6). |

---

## 6. Exhaustive tool-layer edge cases (all of them, tool-focused)

These are the **capability-layer** edges. They complement (don't repeat) the scenario edges X1–X15 in Point-1 §5 — those perturb *inputs/outputs*; these perturb *the tool call itself*.

| T | Edge | Required handling (assertion) |
|---|---|---|
| **T1** | **Tool-use loop hygiene** | Hallucinated tool name / malformed args → reject + reprompt, never execute a guessed call. Cap tool-turns per request (e.g. ≤6) → no infinite loop. Oversized tool result → truncate/summarize before feeding back to the model. Parallel tool calls allowed only when order-independent. *Assert:* unknown-tool → structured error, bounded iterations. |
| **T2** | **Gates are pre-steps, not optional tools** | Integrity (Socratic / feedback-only / non-submittable), tier, k-anon≥10, cold-start are enforced in **code before the tool body**, not as schemas the LLM may skip. On Canvas-match uncertainty for a graded item → **fail closed to Socratic**. *Assert:* every graded-touching / gated trajectory has the gate step *before* the answer/render/spend step. |
| **T3** | **Idempotency / double-fire** | `token.award`, `remember`, every `deliver_*` carry an idempotency key or single-claim lock; `canvas.sync` is upsert-idempotent; two arbiter runs for one student must not both deliver (per-student lock + reclaim-stale). *Assert:* replaying a tool call produces no second side-effect. |
| **T4** | **Timeout / maxDuration** | `transcribe` (300 s wall), `arbiter` (60 s), default Vercel ceiling — any tool that *can* exceed its ceiling MUST be **C3 async + notify-when-ready** (sign → start → poll/webhook), never a sync hang. Multi-hour audio, huge PDF (paginate, don't OOM). *Assert:* oversized job branches to async + progress, never blocks the request path. |
| **T5** | **Provider 429 / rate limit** | Anthropic, OpenAI, ElevenLabs, Deepgram, Tencent, Canvas, Discord, Twilio all throttle → exponential backoff + **gateway fallback model** + queue. `api/groq.ts` already retries on 429 — generalize it. *Assert:* a 429 degrades to retry/fallback, not a user-facing 500. |
| **T6** | **Secrets / auth / ESM** | service key server-only, never client; anon vs service split; **Sensitive Vercel vars** (`CRON_SECRET`) are write-only/unretrievable — crons auto-inject; missing env → tool returns degraded (`{context:null, reason:"missing env"}`), never 500. **Every `api/` relative import needs `.js`** — omission = `ERR_MODULE_NOT_FOUND` = whole `/api` down (real outage). *Assert:* missing-secret path returns a typed degrade; build catches import-resolve errors. |
| **T7** | **Cross-project brain hop** | brain Supabase ≠ product Supabase (~600 ms, needs `Accept-Profile` schema header + resolved `brainPersonId`). Brain unreachable → **flat-mock contract** (un-personalized but functional), failed `remember` queued. *Assert:* brain-down trajectory still answers within budget, no throw. |
| **T8** | **PostgREST schema cache** | after a migration adds a table/column → `PGRST204/205` → `notify pgrst, 'reload schema';`. *Assert:* post-migration smoke checks the new column reads. |
| **T9** | **Cold-start / data-gated tools** | `verify_skill`, exam-predictor, `prereq>0.85` trigger return **degraded** ("still learning how you work" / suppressed) until the data threshold (5 sessions + 7 days; ≥1 graded). Never error/empty. *Assert:* Day-1 call to a data-gated tool returns the degraded shape. |
| **T10** | **Streaming vs blocking** | `tutor_llm` must **stream** (first-token < ~700 ms perceived) to hit C1; today it's non-streaming Sonnet (2–6 s). `what_if` must be a **pure client fn**, not an LLM tool (determinism + 0 ms + offline). *Assert:* tutor path streams; what_if makes no server/LLM call. |
| **T11** | **Append-only writes** | `remember` / session writes append or merge — **never overwrite** (the `session-close` overwrite bug fighting the scheduler is the anti-pattern). Failed write queued + retried, never blocks response, never lost. *Assert:* a brain-write failure leaves a retry record and a successful user response. |
| **T12** | **Media modality routing** | language-detect **before** STT engine selection (Scribe/Deepgram/Tencent/Whisper) — misdetect → wrong engine → garbled. CJK font fallback (Noto Sans SC) or zh renders as tofu. Code-switching mid-utterance breaks single-engine routing. Image → OCR before tutoring; image of a graded page still trips the integrity gate. *Assert:* media trajectory has detect→route→normalize before the model hop. |
| **T13** | **Privacy / redaction at the tool boundary** | cohort tools enforce **k≥10 inside the tool** (never return per-student rows; never de-anon by day-over-day count differencing); redact PII before any external-provider call; cohort concept tags use **language-agnostic canonical IDs** (导数 == derivative == one node). *Assert:* <10 cohort returns "not enough data" with zero per-student reads. |
| **T14** | **Provider / vendor drift** | single source of truth for routing tables; reconcile the **voice provider** (PRD: LiveKit vs code: Daily.co in `daily-room.ts`); STT engine map lives in one place. *Assert:* one routing config, no divergent hard-codes. |
| **T15** | **MCP-specific** | MCP server may be **absent in headless/cron** → brain tools degrade to flat-mock. Schema/version skew between brain-MCP and agent → version the tool schema. **No brain tool fires before `link_identity` resolves** the person — missing link → flat mock, not crash. *Assert:* cron/headless run with no MCP still completes via degrade. |
| **T16** | **Tier / quota at the tool layer** | tier check is the **first** step before any LLM/render spend; over-quota → cap-reached message (not silent degrade); mid-month downgrade reconciles in-flight async jobs; off-tier capability greyed, not broken. *Assert:* free-tier video call denied before any render cost is incurred. |
| **T17** | **Partial-chain failure** | multi-tool pipelines (lecture pack: transcribe→summarize→flashcards→quiz→cross-link) deliver **partial success** on mid-failure (transcript+summary even if card-gen fails, mark retryable); render fail after TTS → **don't bill/notify success**; calendar-write fail after plan-gen → return plan + "couldn't add to calendar." *Assert:* one mid-chain failure never zeroes the whole deliverable. |
| **T18** | **Observability** | every tool call emits a trace span with retryability; the gateway is the central emitter; tool errors are logged structured, not swallowed. *Assert:* a full run produces a replayable span tree (Point-1 §6 fixture source). |

---

## 7. Tool → scenario coverage (cross-ref to Point 1)

Confirms the breakdown actually covers every catalog row; each scenario's trajectory draws only from tools above.

| Point-1 scenario | Primary tools (in trajectory order) |
|---|---|
| G1.1 Daily briefing | `recall` → `canvas.reads(upcoming)` → `route_intent`(compose) |
| G1.2 Ask on the fly | `sanitize_messages` → `route_intent` → `recall(gaps,style)` → **integrity gate** → `tutor_llm`(stream) → `remember` |
| G1.3 Grades + what-if | `canvas.reads(grades)` + `grade_weights` → `what_if`(client-pure) |
| G2.1/G2.2 Proactive nudge | `detect_intervention` → `propose_proactive` → `arbiter` → `deliver_*` → tracking → `compute_tuning` |
| G3.1 Exam prep | `recall(gaps,history)` → `canvas(exam_date)` → `generate_exam_plan` → `evaluate_answers` → `remember(readiness)` |
| G3.2 Start assignment | **tier+integrity gate** → `canvas(rubric)` + `recall(prof,gaps)` → `generate_framework`(blank) |
| G3.3 Weekly plan | `recall(stress,gaps)` → `canvas(deadlines)` → `calendar.read` → plan → `calendar.write` |
| G3.4 Digest lecture | `transcribe`(route by lang) → `summarize`+`flashcards`+`generate_quiz` → cross-link → `remember` |
| G3.5 Office hours | `recall(gaps)` → `generate_questions`; post → capture → `remember(gaps_closed)` |
| G3.6 Studio generate | **tier gate first** → `recall`+`library.lookup` → `generate_lesson_video`\|`generate_podcast`(async) → `notify` |
| G4.1 Study room | `room.provision` → `room.orchestrate`(private per-participant `recall`) → `remember` |
| G4.2 Cohort status | cohort aggregate (**k-anon≥10 in-tool**) → render |
| G4.3 Leaderboard | `token.summary` → render (C0/C1) |
| SYS reflection | nightly `recall(day)` → synthesize → brain-write → decay |

**Spec-tool gaps surfaced:** `calendar.read/write`, `generate_lesson_video`, `generate_podcast`, `what_if`, `recall_memory`, `verify_skill`, `room.orchestrate`, cohort aggregate, `grade_weights` are **spec** — these define the Step-2 build list.

---

## 8. Work split by layer (no names — same convention as Point 1)

- **Brain layer:** `recall` / `remember` / `forget` / `reinforce` / `context_window.warm` contracts; the bus + **MCP exposure** of the brain tool set; `link_identity`; decay + nightly reflection; the cross-project hop budget. Owns §3.A, §3.G-detect, §3.K and the §4 brain-write invariants.
- **Product layer:** the capability endpoints (`canvas`, `rag`, `extract`, `transcribe`, `tts`, `stt`, `summarize`, `flashcards`, `library`, `token`, `room`, generation tools) and their gates/tiers. Owns §3.C–F, H, I.
- **Shared (contract seam):** the **tool schema format** itself (what the tool-use loop sees), the **LLM gateway** (§5), the **trace/eval** emitter, and the gate-enforcement middleware (§6 T2) that wraps every spend tool. Owns §3.B and the §6 cross-cutting edges.

---

## 9. Open items for the review (what Step 2 must finalize)

- **v1 tool set for the first eval:** confirm which **spec** tools are in scope now vs deferred (video/podcast/what_if/recall_memory/verify_skill/calendar/cohort).
- **MCP boundary:** exactly which tools are MCP-exposed (brain set for sure; which product tools get cross-product reuse) and the schema-versioning story (§6 T15).
- **Voice provider reconciliation:** LiveKit (PRD) vs Daily.co (`daily-room.ts`) — pick one before room work (§6 T14).
- **Gateway-first:** agree to land the LiteLLM-style gateway (§5) before expanding the tool surface, so routing/cost/trace exist from day one.
- **Confirm the resolved decisions** carried from Point-1 §8.1 (warm cache, stress 0–1, event-driven detect, arbiter-routed reminders/SMS, Lesson Generator = Pro 10/mo) — they're already baked into the tool contracts above.
