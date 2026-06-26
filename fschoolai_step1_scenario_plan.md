# Step 1 — Scenario Catalog: Deep Plan (for Tech Review)

> Status: this is the **catalog-design** plan, not the catalog itself. It defines the schema, the latency model, the inventory skeleton, the edge-case taxonomy, and the eval-fixture contract so that the actual row-filling work (split by work area) is mechanical and reviewable. Every claim is grounded in INPUT A (PRD rules), INPUT B (code audit), INPUT C (scenarios + edge cases). Where the live code contradicts the PRD, the contradiction is named, not smoothed over.

---

## 1. Objective & scope

### 1.1 What Step 1 must deliver

A **single source-of-truth scenario catalog**: one row per de-duplicated scenario, each expressed in the team's `scenario = prompt + read + write` framing, plus the columns needed to turn each row into an **eval fixture** (Section 6). Concretely Step 1 delivers four artifacts:

1. **The catalog** — a structured table (Section 2 schema) covering the full inventory (Section 4): 14 user-facing scenarios across 4 groups + 3 system/lifecycle scenarios (S1–S3), each tagged `live | partial | spec` against the code audit.
2. **A latency model** (Section 3) — latency **classes** + a per-**stage** budget decomposition, so every scenario's latency column is a defensible SLO and not a guess.
3. **An exhaustive edge-case catalog** (Section 5) — cross-cutting edges that apply to many scenarios + per-scenario edges, each tagged by which axis it perturbs (input / output / latency) and the required handling.
4. **The eval-fixture spec** (Section 6) — the rule that turns each row into `{input, expected_output_assertions, expected_tool_sequence, latency_budget}`, including how the 3 integrity red-lines become hard trajectory assertions.

The catalog is the **contract** the rest of the project is graded against. Its purpose is to be *over-specified on purpose*: trajectories and SLOs are written to the **spec** (what the system must do), with a `status` tag and a `code_reality` note recording the gap to today's flat/partial implementation.

### 1.2 What Step 1 is explicitly NOT

- **NOT Step 2 (the tool/capability registry).** Step 1 names the *capabilities a trajectory calls* (e.g. `recall(context_window)`, `tutor_llm`, `rag_query`, `integrity_check`, `proposeProactive`, `arbiter_gate`) at the granularity of an eval assertion. It does **not** define each tool's signature, request/response JSON schema, owning endpoint, retry policy, or idempotency key. Those are Step 2. Step 1's trajectory uses tool *names as tokens*; Step 2 makes them callable.
- **NOT Step 4 (the agent-loop refactor).** Step 1 documents that Reggie today is **not** a tool-use loop — `claudeTutor()` returns a string, drops `contentBlocks`/`stop_reason`, and "recall" is a parallel keyword-classified fetch (INPUT B). Step 1 records this as a `status=partial` + gap note. It does **not** redesign the loop, fix the three stress-scale mismatches, wire the async transcription path, or build the missing agents. The catalog describes the **target trajectory**; Step 4 makes the runtime match it.
- **NOT a build plan / sprint plan.** No estimates, no engineering tickets — only the work-area grouping (Section 7).
- **NOT new product scope.** We catalog the PRD's scenarios as-is, including the ones with no backing code (`spec`). We do not invent scenarios.

The deliverable boundary: when Step 1 is done, a reviewer can read any row and say "if the system did exactly this trajectory within this budget and these output assertions held, the scenario passes" — without needing Steps 2/4 to exist yet.

---

## 2. Catalog schema

Each scenario is one row. Columns below are grouped by the framing axes (**prompt / read / write**) plus the eval and governance axes. Every column has a justification tied to an input.

| # | Column | Type / domain | Why it exists (grounded) |
|---|--------|---------------|--------------------------|
| 1 | `scenario_id` | stable slug, e.g. `G1.S2-ask-on-the-fly` | Primary key; must be stable so eval fixtures and trajectory assertions reference it permanently. Group prefix encodes the inventory grouping (INPUT C). |
| 2 | `group` | `G1 daily / G2 proactive / G3 academic / G4 social / SYS lifecycle` | The de-dup grouping from INPUT C §1–§4 + system scenarios. Drives the latency-class default (Group 2 = proactive ≠ 3s). |
| 3 | `pattern` | `P-A reactive / P-B proactive / P-C nightly / P-D cross-product` | The 4 brain-interaction patterns (INPUT C). Determines whether the 3s NFR even applies: P-A is on the request path; P-B/P-C are not. |
| 4 | `trigger_input` | structured: `{source, modalities[], preconditions[]}` | The **prompt** half of the framing. `source` = app-open / text msg / page-nav / signal-INSERT / cron-tick. **Modalities** must enumerate text/voice/image where applicable (PRD §9: voice valid for *all* agent interactions; Reggie input = text/voice/image, Agent 1). `preconditions` = brain-grounding gates (e.g. video requires a lecture transcript, §6b; exam-prep requires a future exam date). |
| 5 | `input_modality_variants` | enum set + per-variant normalize step | INPUT C "image/voice/text variants" edge: each modality needs a distinct *perceive/normalize* step before routing (OCR for image, language-detect→STT for voice, `sanitizeApiMessages` for text). Without this column the trajectory can't assert the per-modality preprocessing hop. |
| 6 | `context_to_READ` | list of brain/product reads, each tagged `warm-cache / live-DB / RAG / canvas` | The **read** half. Must distinguish a **warm `context_window` snapshot** (the only 3s-safe brain read, PRD §13.6) from a cold `refresh()` (the 3–8s NFR violation) and from live-DB hops. Names the exact fields read (e.g. `learning_style, knowledge_gaps[], stress_level, upcoming_deadlines[], preferred_language, session_count` — the **flat-mock contract**, §3.6). Fields outside that set must be flagged `graph-dependent`. |
| 7 | `read_freshness_bound` | duration | How stale a read may be. Reactive = warm snapshot ≤30 min (scheduler cadence). Event-driven interventions = "within minutes" (§3.5.1: a 3pm grade can't wait for 2am). Flags the staleness edge (INPUT C "stale snapshot"). |
| 8 | `output` | prose description of the deliverable | The visible result. |
| 9 | `output_contract` | typed shape per §15.5 | PRD §15.1/§15.5: single endpoint `POST /api/agent-manager` → `{type, content, signals?}`; per-page types (`greeting`, `assignments_enriched`, `study_ready`, `brain_state`, `leaderboard`, …). Chat is the only SSE/streaming output (`stream_chunk … stream_done{tokens_earned}`). The contract column is what the output assertion checks against. |
| 10 | `signal_to_WRITE` | list of writes, each tagged `brain.signals / context_window / proactive_signals / notification_queue / product-table / none` | The **remember** half. Many reactive scenarios write fire-and-forget session signals (INPUT B: `brain-signal`, `session-close`); proactive scenarios' write IS the delivery-tracking record (`delivered_at/opened_at/action_taken`, §3.5.3) which doubles as the effectiveness label (§3.5.4). Briefing/grades read-only → `none`. |
| 11 | `write_is_eval_label` | bool + label semantics | §3.5.4: `intervention_accepted` = positive; `delivered + no action in 2h` = negative. For proactive rows the write is the eval signal — the trajectory must emit it. |
| 12 | `max_latency` | duration | The SLO ceiling. Default **3s** unless explicitly exempted (PRD §9). |
| 13 | `latency_class` | enum (Section 3.1) | The qualitative band; drives UX (loading indicator? notify-when-ready?) and which stage budget table applies. |
| 14 | `latency_stage_budget` | per-stage ms (Section 3.2) | route → recall → tool/LLM → write → deliver, summing to ≤ `max_latency`. Forces the SLO to be mechanically defensible against the code landmines. |
| 15 | `primary_capabilities` | ordered list of capability tokens | The capabilities the trajectory invokes (Reggie route, recall, tutor_llm, rag_query, integrity_check, exam_plan_gen, proposeProactive, arbiter_gate, transcribe, …). These become the `expected_tool_sequence` skeleton — but stay name-level (Step 2 defines them). |
| 16 | `model_routing` | model per LLM hop + latency class (§7.1) | §7.1 binds task→model→latency/cost class: intent classify = Haiku/4o-mini sub-100ms; tutor/exam/video/podcast script = Sonnet/4o "quality is the moat"; summarize/flashcard/cohort/reflection = 4o-mini. Needed to justify the LLM-stage budget and to assert prompt-caching of the brain-context prefix (40–60% multi-turn saving). |
| 17 | `integrity_gates` | list: `socratic-graded / writing-feedback-only / media-non-submittable / k-anon≥10 / none` | The 3 academic-integrity red lines + cohort k-anonymity (INPUT A, INPUT C). A gate here forces a trajectory pre-step (the open-Canvas-assignment check) and an output assertion (Section 6). |
| 18 | `tier_gate` | `free / pro+ / max-only` + quota | §11: video = Max-only (flag the PRD's own Pro-10/mo inconsistency); podcast = Pro+ (10/mo Pro, unlimited Max); studio = Pro+; exam-predictor = Pro+; free = 20 msg/day. First trajectory step for gated capabilities = the tier check. |
| 19 | `coldstart_gate` | precondition + degraded output | §3.5.5 / §7b: behavioural triggers need 5 sessions + 7 days; exam-predictor needs ≥1 graded assignment; prereq>0.85 trigger is data-gated; learning-style defaults neutral. Column states the precondition AND the degraded output ("I'm learning how you work…", suppress/placeholder) — never an error/empty state. |
| 20 | `failure_degraded_behavior` | branch table | Per scenario: brain-DB down → un-personalized answer (flat mock is the contract, degrade not block); offline → cached read or graceful offline notice; partial tool failure → partial-success delivery + retry queue; unbuilt capability → graceful "coming soon". Maps INPUT C cross-cutting edges to a per-row branch. |
| 21 | `expected_tool_TRAJECTORY` | ordered step list (the fixture) | The eval trajectory — the ordered capability calls with the **mandatory gate steps inlined** (integrity check, tier check, k-anon check, debounce, arbiter). This is the load-bearing column: it is the `expected_tool_sequence` of the fixture. |
| 22 | `status` | `live / partial / spec` | From the code audit (INPUT B). |
| 23 | `code_reality` | free text + file refs | The gap note: where the live code diverges (e.g. "Reggie not a tool-use loop; recall is parallel keyword fetch; 3000ms RAG race tax", `NeuralRing.tsx` L2110-2400, `api/claude.ts`). Keeps Step 1 honest without doing Step 4. |
| 24 | `work_area` | `brain-layer / product-layer / shared` | Which layer the row's work falls in (Section 7). |
| 25 | `open_questions` | list | Per-row unknowns surfaced to the review (Section 8). |

**Framing tie-in:** columns 4–11 are exactly `prompt (4,5) + read (6,7) + write (10,11)` with the output (8,9) in the middle — the row literally reads as "prompt + read + (act) + write." Columns 12–16 are the latency/capability envelope; 17–20 are the governance gates; 21 is the eval trajectory; 22–25 are provenance/work-area.

---

## 3. Latency model

### 3.1 Latency CLASSES

Five classes. The class determines UX affordance and which SLO applies. Default is **C1 unless explicitly exempted by §9.**

| Class | Name | Bound | UX affordance | Applies to (PRD/audit grounding) |
|------|------|-------|---------------|-----------------------------------|
| **C0** | Instant / client | ≤300ms, no server LLM | no spinner | What-if calc (deterministic math, §7b); leaderboard render; offline cached briefing/plan/deadlines (§9 offline); first-open detection. |
| **C1** | Interactive | **≤3s** (§9 default) | inline, no spinner expected | Daily briefing (warm cache), ask-on-the-fly, checking grades, Reggie routing, tutor explanation, office-hours questions, study-room tutor turn, cohort/leaderboard render. **The default.** |
| **C2** | Near-interactive | **≤10s WITH visible loading indicator** | required loading indicator | The ONLY synchronous exception (§9): lecture **transcription step** + **exam-prep plan generation**. Student waits. |
| **C3** | Async-minutes (notify-when-ready) | video **<5min** (§6b), podcast **<3min** (§15), full lecture pack "within minutes" | progress UI, then `notification_queue` "your X is ready"; student does NOT wait | EXEMPT from 3s. Studio generation; long-recording lecture pack. |
| **C4** | Background-governed | not a response SLA; a **delivery** SLA | no user-facing latency | Proactive nudges: "within minutes" of event + 2–3min arbiter debounce + ≤1/hr ≤3/day + quiet hours (§3.5.2/3). Nightly reflection (staggered 10pm–2am, §13.5). Canvas sync (6h cron + on-demand async). context_window pre-compute (~30min). |

**Hard rule encoded:** any scenario not in C2/C3/C4 by explicit PRD exemption is **C1 = 3s**. The cold/empty-context `refresh()` (~10 queries + Claude = **3–8s**) is the canonical C1 violation to design *around*, never a license to relabel a scenario C2.

### 3.2 Stage decomposition + per-stage budget

End-to-end latency for a reactive (C1) turn decomposes into 5 stages. Budgets below are derived from the code-audit landmines, not invented.

```
[route] → [recall] → [tool/LLM] → [write] → [deliver]
```

| Stage | What happens | Audit reality (cost driver) | C1 budget (3s) | C2 budget (10s) | What MUST be cached/precomputed to hit it |
|-------|--------------|------------------------------|----------------|------------------|-------------------------------------------|
| **route** | language-detect (voice), `detectVoiceChangeIntent`, intent classify, tier/integrity/cold-start gate checks | §7.1 intent classify = Haiku/4o-mini **sub-100ms**; but Voice-Preference Agent runs `detectVoiceChangeIntent` on **every** message (pre-routing hop). Cold start adds 0.5–2s on `/api/claude`,`/api/tutor-context`. | **≤200ms** (excl. cold start) | ≤300ms | Keep router warm (cron ping); cache tier + canvas_connected + cold-start flags in the session object so gate checks are O(0) reads, not DB hits. |
| **recall** | read warm `context_window` + any RAG | §13.6: cold rebuild = 3–8s (FORBIDDEN on path). Even warm read = **~600ms cross-project Brain DB hop** (Brain Supabase ≠ FschoolAI Supabase, INPUT B). `tutor-context` adds a blocking **Haiku classification ~0.5–1.5s** before the brain fetch. RAG query = embed ~0.5s + RPC + **gpt-4o-mini rerank 0.5–1.5s** + 2 selects = 1.5–4s, today gated behind a **fixed 3000ms race tax**. | **≤800ms** (warm snapshot, parallelized brain+RAG; rerank off or pre-warmed) | ≤1.5s | **Warm `context_window` MUST exist** (scheduler 30min + on-demand-if-stale); Redis layer over it; **drop the blocking Haiku classifier from the hot path** (it's a route-stage concern, parallelize or precompute); **kill the fixed 3000ms RAG race** (race against actual completion, not a dead timer); consider `rerank=false` on the chat path or a cheaper reranker. |
| **tool/LLM** | the capability call (tutor Sonnet stream, exam-plan 4o, what-if pure fn) | §7.1: tutor/exam = Sonnet/4o (don't downgrade). NeuralRing text path is **non-streaming** Sonnet (full latency before first token), ~2–6s. What-if = 0ms (pure fn → belongs in C0). | **≤1.8s perceived** via streaming (first token fast) | ≤7s (plan-gen) | **Stream** the tutor output (first-token < ~700ms perceived); **prompt-cache the brain-context system-prompt prefix** (§7.1: 40–60% multi-turn saving); what-if must be a client/edge pure function, not an LLM call. |
| **write** | `remember()` — session signal / `brain.signals` / delivery-track | INPUT B: `brain-signal`,`session-close` are **fire-and-forget** (sendBeacon), off the critical path; single ~300–700ms Brain DB POST. | **≤0ms on path** (fire-and-forget) | 0ms on path | Writes are async/queued; a failed write is **queued + retried**, never blocks or fails the user response (INPUT C partial-failure edge). Append-only — no overwrite (note the `session-close` literal-overwrite bug fighting the scheduler). |
| **deliver** | render / stream flush | client render | **≤200ms** | ≤200ms | n/a |

**C1 budget sum:** 200 + 800 + 1800 + 0 + 200 = **3000ms**. The model only closes if recall hits a warm snapshot and the LLM streams — i.e. the two biggest audit landmines (cold context + fixed RAG race) are exactly the two things that blow the budget.

**C4 (proactive) stage model is different** — it's a pipeline latency, not a response latency:
```
[signal INSERT] → [detect (≤30min cadence today; spec=within minutes)] → [propose candidate] → [debounce 2–3min] → [arbiter dedup/rank/rate-limit/quiet-hours (≤5min cron)] → [channel select] → [deliver] → [track]
```
Resolved (§8.1.4): detection is **event-driven** (Supabase Realtime on `brain_signals` INSERT, §3.5.1) and consumes the 5-min `stress_score`, so it fires within minutes (meets the C4 SLO); the 30-min cron is demoted to an hourly safety sweep. The old cadence-bound path (~35min worst case via the 30-min cron, ignoring the 5-min score) is what this replaces.

---

## 4. Complete scenario inventory (table skeleton)

Columns abbreviated; full schema (Section 2) applies. `status` from INPUT B. `lat` = latency class.

### Group 1 — Daily app-open (P-A reactive)
| id | scenario | input | lat | key integrity/gate | status | code_reality |
|----|----------|-------|-----|--------------------|--------|--------------|
| G1.1 | **Daily Briefing** | app-open, no text | C1 (C0 offline) | coldstart (empty brain → "learning how you work") | **spec** | No briefing aggregator; data sources exist (canvasSync + brain.ts) but no "what to do today" assembler, no study-block/Calendar source, no readiness. |
| G1.2 | **Ask on the fly** | text/voice/image msg | C1 (C2 if image-OCR/voice-STT) | **socratic-graded** | **live** | Reggie live but NOT a tool-use loop; recall = parallel keyword fetch; integrity red-line is **prompt-only, no hard guard** (`NeuralRing.tsx`,`api/claude.ts`). |
| G1.3 | **Checking grades + What-if** | page-nav, optional what-if query | C0 (what-if math) / C1 | coldstart (≥1 graded assignment) | **spec** | No endpoint; no `exam_readiness_score`; what-if has no backing code; syllabus weights not synced. |

### Group 2 — Passive reminders (P-B proactive, C4)
| id | scenario | input | lat | gate | status | code_reality |
|----|----------|-------|-----|------|--------|--------------|
| G2.1 | **Negative / risk nudge** | signal INSERT (stress / no-study-pre-deadline / 3x-confusion / grade-drop / late-night) | C4 | arbiter rate-limit + quiet-hours; escalation cap (stress>0.9 3d) | **partial** | `brain-intervention` fires only on stress≥7 / momentum / stale-context; **does NOT implement** most spec triggers; 30-min cadence ≠ "within minutes." |
| G2.2 | **Positive / opportunity nudge** | signal INSERT (free-block+due<24h / prereq>0.85[gated] / spaced-rep-due / 4-day-streak) | C4 | same arbiter; prereq>0.85 **data-gated** | **spec** | POSITIVE path **entirely absent** in `brain-intervention`. |

### Group 3 — Academic tasks (P-A / P-C / C3)
| id | scenario | input | lat | gate | status | code_reality |
|----|----------|-------|-----|------|--------|--------------|
| G3.1 | **Exam prep** | "exam in 3 days" | **C2** (plan/Q-gen ≤10s + loader) | coldstart (gaps; ≥1 graded for predictor feed) | **partial** | `SpaceExams` is a one-shot quiz gen+grader over manually-picked docs; **no** brain gaps, multi-day plan, readiness_score, re-plan, day-before summary. |
| G3.2 | **Start assignment / essay** | "help me start" | C1/C2 | **writing-feedback-only** (blank scaffold) | **spec** | No Office-Hours/Assignment scaffold endpoint with the integrity guard. |
| G3.3 | **Weekly plan** | "plan my week" | C1/C2 | — (silently reschedule, no nag) | **spec** | No Planner/Calendar agent; no Google/Apple calendar write-back; no available_hours source. |
| G3.4 | **Digest a lecture** | Chrome-ext audio capture | **C2** transcribe + **C3** full pack | — | **partial** | `transcribe.ts` synchronous, `maxDuration=300` wall; async webhook stubbed; no auto-chained pack (summary/cards/quiz are separate, not chained); language routing absent. |
| G3.5 | **Office hours prep/followup** | "seeing Prof Chen in 30min" / "ended" | C1 | feedback framing | **partial** | `monitor-agent` is reactive page-mount nudge, doesn't read context_window; no OH question-gen / gaps_closed write. |
| G3.6 | **Find resources / generate (Studio)** | pick source+format | **C3** (video<5min Max / podcast<3min Pro+) | **tier-gate** + **media-non-submittable** + brain-grounding precondition | **spec** | No Lesson-Generator video pipeline; podcast/studio render pipeline absent. |

### Group 4 — Social / collaboration (P-A, C1)
| id | scenario | input | lat | gate | status | code_reality |
|----|----------|-------|-----|------|--------|--------------|
| G4.1 | **Study room** | join room | C1 (tutor turn) | **no gap leakage** | **spec** | Study Room Orchestrator (Cloudflare Durable Objects) NOT BUILT. |
| G4.2 | **Class-wide status (cohort)** | open status page | C1 | **k-anon≥10**; never individual; never rank professor; **release gate** | **spec** | No cohort aggregation / canonical-concept-ID layer; PIPEDA/FERPA + k-anon gate. |
| G4.3 | **Leaderboard / motivation** | open leaderboard | C0/C1 | healthy-comparison framing | **partial** | Resolved in-scope (frontend/dev) per PRD v1.8 — **verify actually shipped**; token/gamification read only. |

### System / lifecycle scenarios
| id | scenario | input | lat | gate | status | code_reality |
|----|----------|-------|-----|------|--------|--------------|
| S1 | **Onboarding / first login** | signup → Canvas OAuth → 5 LS questions | per-turn C1; sync C3 (progress) | coldstart; no-Canvas branch | **partial** | `canvasSync` uses stored PAT (**no OAuth**), client-side serial sync; no syllabus ingest; 5-Q learning-style flow + brain-create not in audit. |
| S2 | **Nightly reflection** | cron tick | C4 (batch, staggered 10pm–2am local) | — | **spec** | **No 2am reflection cron** (`vercel.json` crons = reminder + 3 brain + arbiter only); decay/forget aspirational; runs in the NeuroAGI brain layer, FschoolAI doesn't call it. |
| S3 | **Canvas sync** | 6h cron + on-demand app-open | C4 background | idempotent upsert; manual-course survival | **partial** | Client-side only (no cron), serial, no syllabus docs, manual/past-course overwrite bug (CLAUDE.md), PAT not OAuth. |

**Inventory totals:** 14 user-facing + 3 system = **17 rows**. Status split: **live** 2 (G1.2, G4.2-render-substrate caveat aside → really G1.2 and the recall/arbiter substrate); **partial** 7; **spec** 8. The catalog is therefore mostly **spec/partial** — which is the point: it's the target, with the gap recorded.

---

## 5. Exhaustive edge-case catalog

Tag legend: **[I]** perturbs input · **[O]** perturbs output · **[L]** perturbs latency. Each edge states the **required handling** + how it shows up as a trajectory/assertion.

### 5.1 Cross-cutting (apply to many rows; author once, reference by id)

| EC | Edge | Axis | Required handling (assertion) |
|----|------|------|-------------------------------|
| **X1** | **Cold-start empty brain (Day 1–7)** | [O][L] | Behavioural/learning-style/pattern triggers DISABLED until 5 sessions + 7 days; deadline proactivity available Day 1 (Canvas synced at signup); LS format = neutral; exam-predictor suppressed (<1 graded); prereq>0.85 disabled. UI shows "I'm learning how you work…" never error/empty. **Latency trap:** empty `context_window` → cold refresh 3–8s → MUST serve pre-warmed snapshot. *Assertion:* Day-1 trajectory contains no stress/pattern read and emits no behavioural nudge. |
| **X2** | **No Canvas connected** | [O] | No courses/assignments/grades/syllabus → even deadline proactivity gone → cold-start fully silent unless manual upload. Branch on `canvas_connected=false`: degrade, prompt to connect/upload, don't read deadlines. *Assertion:* trajectory has the `canvas_connected` branch; no deadline reads when false. |
| **X3** | **Stale / missing `context_window`** | [L][O] | Reactive reads warm snapshot (≤30min); never inline 10-query refresh on hot path; Redis over context_window; signal written seconds ago may be missing → accept brief staleness + async refresh. *Assertion:* reactive trajectory reads warm snapshot, never triggers inline `refresh()`. |
| **X4** | **Brain DB unreachable** | [O][L] | Function on flat-mock contract; if even flat read fails → generic (un-personalized) tutoring + offline-cached plan/deadlines, don't block. Failed `remember()` writes queued/retried, never lost (append-only). Crashed derived layer must not corrupt memory log. *Assertion:* brain-down trajectory still returns an answer within budget, no unhandled throw. |
| **X5** | **Quiet hours + rate-limit deferral** | [O][L-delivery] | ≤3/day, ≤1/hr, quiet 11pm–8am, **SMS never in quiet hours regardless of urgency**. 2am urgent nudge → deferred to 8am (value collapses if deadline < 8am); over-cap candidates deferred/discarded; expired-during-deferral discarded by hourly safety-sweep; 4th candidate rejected even if better than one already sent. *Assertion:* candidate → arbiter defer with `scheduled_for` respecting quiet hours; no SMS in window. **Resolved (§8.1.5):** `assignment-reminder` is routed through the arbiter (`propose_proactive → arbiter → deliver`), inheriting dedup, rate limits, quiet hours, and student tz; no direct-SMS bypass. |
| **X6** | **3 academic-integrity gates on graded work** | [O] | (G1) graded Q matching open Canvas assignment w/ future due → Socratic only, NOT configurable; (G2) writing → feedback + BLANK scaffold only, never rewrite/fill; (G3) podcast/video never submittable. Detecting "graded+open+future-due" needs reliable Canvas match — stale/unmatched Canvas may fail-open (gives answer) or fail-closed (refuses legit conceptual Q). Multilingual paraphrase of a graded prompt must still trip the gate. Image of a graded page must trip the gate (gate can't be text-only). *Assertion:* every graded-touching trajectory has the open-assignment check **before** the answer/scaffold step; on Canvas-match uncertainty, **fail closed to Socratic**. |
| **X7** | **Cohort k-anonymity < 10** | [O] | No insight computed/shown for cohort <10 OR concept-confused <10; never individual data; **never de-anonymize by differencing day-over-day counts** (10→11 exposes the 11th); never evaluate/rank professor. Release gate: PIPEDA/FERPA + k-anon sign-off. *Assertion:* <10 cohort trajectory short-circuits to "not enough data" with NO per-student reads exposed. |
| **X8** | **Language routing (zh-CN req; es/fr secondary; hi/ar Phase 2)** | [O][L] | Language-detect step precedes STT routing + explanation rendering. STT engine per language (Scribe EN-RT / Deepgram es,fr / Tencent zh / Whisper batch) — misdetect → wrong engine → garbled. CJK font fallback (Noto Sans SC) or zh-CN renders as tofu. Code-switching mid-message breaks single-engine routing. **Cohort concept tags MUST be language-agnostic canonical IDs** (导数 == derivative same node) or k-anon counts fragment by language. zh-CN scoped to N. America international students (no mainland infra). hi/ar degrade gracefully, not error. *Assertion:* voice/multilingual trajectory has language-detect before STT; cohort write uses canonical concept ID. |
| **X9** | **Offline cache** | [O][L] | Study plan + deadlines viewable offline (cached); any LLM/tool call requires internet → ask-on-the-fly fails **gracefully with offline notice, not a 3s hang→timeout**; cached deadlines may be stale vs server → show "last synced" marker; offline `remember()` queued + flushed on reconnect; what-if OK offline (deterministic), exam-prep not. *Assertion:* offline reactive trajectory returns cached output or offline notice within C0, no LLM call. |
| **X10** | **Voice / Phase-5 not built** | [I][O] | Voice input required (§9, WCAG AA) but native app out of scope + RT two-way voice Phase-2. Voice msg with no built STT for a language → fall back to text path or clear "voice not yet available for X", never silently drop. Phase-5 controls → "coming soon", not broken control. Keyboard/text path always exists (accessibility). *Assertion:* unbuilt-capability trajectory routes to graceful degradation, not exception. |
| **X11** | **Concurrent cron / double-delivery** | [O][L] | Two agents flag same deadline in debounce window → arbiter dedup to one (per-student Redis/Supabase 2–3min lock); missed event → hourly safety-sweep catches expired-unprocessed (but NOT a full all-students sweep); thousands of midnight reflections → stagger 10pm–2am + write queue + optimistic locking; overlapping Canvas sync (6h + on-demand) → idempotent upserts; two arbiter runs for one student must not both deliver (single lock). *Assertion:* proactive/sync trajectory shows dedup + idempotency. |
| **X12** | **Partial tool failure** | [O][L] | One mid-chain failure must not corrupt the whole: lecture pack delivers transcript+summary even if card/quiz gen fails (mark retryable); video render fails after TTS → don't bill/notify success, budget includes retry headroom; `remember()` fails after a good answer → queue write, don't fail the response; calendar write fails after plan gen → return plan, flag "couldn't add to calendar." *Assertion:* graceful partial-success, not all-or-nothing. |
| **X13** | **Tier-gated denial** | [O] | Free 21st message → upgrade prompt, not silent fail/degraded answer; Free/Pro video → **denied** (video Max-only hard gate); Pro over 10 videos/podcasts/mo → cap-reached message; downgrade mid-month → reconcile in-flight async jobs; cross-course graph viz placeholder for non-Max. *Assertion:* tier check is the **first** step before any LLM/render spend. **Resolved (§8.1.6):** Lesson Generator = **Pro, 10/mo** (the `tier_gate` for G3.6-video is authored as Pro). |
| **X14** | **Image / voice / text input variants** | [I][L] | Image → OCR before tutoring; blurry/rotated/multi-problem → confirm/ask; image of graded page must still trip integrity gate. Voice → language-detect→STT first (gets the ≤10s allowance, then the answer budget starts). Text → `sanitizeApiMessages` (empty/dup-role poison history). Mixed image+caption → fuse into one context. *Assertion:* multimodal trajectory has per-modality perceive/normalize step before routing. |
| **X15** | **Expired / very-large inputs** | [I][O][L] | Multi-hour recording > `maxDuration=300` → async/webhook + poll, progress not timeout; huge PDF → paginate ingest, don't OOM; candidate `expires_at` passed before arbiter ran → discarded by safety-sweep, never delivered late; exam date in past/today → reject/redirect, no plan; elapsed study block → silently reschedule, no nag. *Assertion:* oversized-input trajectory branches to async + progress, never blocks request path. |

### 5.2 Per-scenario edges (representative; each becomes a row's `failure_degraded_behavior` + extra fixtures)

- **G1.1 Briefing:** empty brain → cold-start copy not blank; all-done → "you're caught up" (don't fabricate tasks); multi-open same day → "first open of day" must not re-fire/double-count; **tz** for "morning" + quiet boundaries (student local, not server); stale snapshot may miss a deadline added in last 30min (serve cached + async refresh). [O][L]
- **G1.2 Ask on the fly:** matches open graded → Socratic (the single most-emphasized constraint); deeper prereq gap → teach prereq first (data-gated: if no typed prereq edges, ASK "do you know X?"); ambiguous → ONE clarifying question then route; LS unknown → neutral format; off-topic → graceful redirect; dup/empty history → sanitize. [O]
- **G1.3 What-if:** zero graded → MUST NOT display (hard guard); missing syllabus weights → fall back to raw points + caveat; impossible target ("A" when max is B) → say unreachable, no fake score; weights not summing to 100% (drop/extra-credit/curve) → handle; frame as estimate, never guarantee. [O]
- **G2.1 Negative nudge:** multiple triggers at once → ONE ranked message not three; same deadline consecutive days → cooldown/dedup (no daily nag); per-student threshold tuning after 20 labels (ignores stress, acts on deadline → raise stress/lower deadline); behavioural disabled in cold-start; late-night trigger respects tz + not delivered in quiet hours. [O][L]
- **G2.2 Positive nudge:** prereq>0.85 **data-gated** (keep OUT of trigger table until graph confidence reliable); spaced-rep = last-reviewed >7d AND exam within 14d (both, not either); free-block needs Calendar connected; competes in same 3/day-1/hr-quiet budget; 4-day-streak must not be the 4th message that day. [O]
- **G3.1 Exam prep:** date past/today → no multi-day plan; "exam in 2 hours" → collapse to single triage; no gaps (cold-start) → syllabus-topic coverage; answers in another language → eval handles it; ≤10s + loader; readiness feeds predictor but predictor still blocked if no graded assignment. [I][O][L]
- **G3.2 Scaffold:** open graded → BLANK scaffold (headings only, never body/filled outline); past/practice → restriction lifted; rubric unsynced → generic structure + ask for rubric, don't fabricate professor prefs; "fix this draft" → feedback only, no rewrite; gate-evasion phrasing ("example paragraph I won't submit") → still scaffold-only. [O]
- **G3.3 Weekly plan:** no calendar → plan over deadlines+difficulty, flag missing; over-committed week → prioritize, don't silently drop; missed slot → **silently** move, no nag; calendar write fail → return plan + flag; conflicting events → plan around union, don't double-book. [O]
- **G3.4 Lecture digest:** multi-hour > timeout → async + poll + progress; non-English → language-routed STT (wrong route = garbled); poor audio/accent/crosstalk → Krisp upstream + low-confidence flag; partial fail → deliver transcript+summary; cross-links need prior brain data → omit gracefully cold-start; no extension → offer file upload. [I][L][O]
- **G3.5 Office hours:** no gaps (cold-start) → general/syllabus questions; vague recap → prompt specifically before writing gaps_closed; prof/course not in Canvas → no professor profile tie; post-update reinforce without overwriting other signals (append-only). [O]
- **G3.6 Studio:** tier gate first; thin source (no uploads/Canvas) → block or warn "generic, not brain-built"; async budgets, notify-when-ready never loading screen; media review-only (integrity); mid-pipeline fail → no success-notify, no cap consumption; format greyed if off-tier. [O][L]
- **G4.1 Study room:** no individual weakness leaks to room (read each brain privately, surface group-safe only); Orchestrator NOT BUILT → behind flag/unavailable; concurrent edits/many participants → contention; empty-brain participant must not degrade shared session. [O]
- **G4.2/G4.3 Class-wide & leaderboard:** cohort/concept <10 → nothing (k-anon); never individual; never rank professor; canonical concept IDs for multilingual; release gate; leaderboard verify-actually-shipped; "healthy comparison" avoid de-motivating bottom-rank; streaks handle tz + missed-day. [O]
- **S1 Onboarding:** abandon mid-flow (skip Canvas/5Qs) → partial brain, downstream tolerates missing LS; OAuth fail → proceed without course data; slow sync → progress, don't block identity card; LS guess is a HYPOTHESIS shown for confirmation; re-onboarding existing brain must NOT wipe memory (append-only). [I][L][O]
- **S2 Reflection:** staggered 10pm–2am local + write-queue optimistic locking; zero-activity day → decay only, no fabricated insight; decay = salience×time 14-day half-life, must not decay a concept reviewed today; runs in the NeuroAGI brain layer; one student's failure must not block batch. [O][L]
- **S3 Canvas sync:** token expired/revoked → prompt re-auth, not stale-forever; overlapping sync → idempotent upserts; unparseable syllabus → degrade (no lookahead); 3pm grade → Intervention within minutes (event-driven), not 2am; manual/past entries survive sync (known overwrite bug); on-demand sync must not block briefing (cached + async). [I][O]

---

## 6. Eval-set / trajectory

### 6.1 Row → fixture mapping

Each catalog row mechanically yields one **base fixture** plus N **edge fixtures** (one per applicable edge from Section 5). A fixture is:

```json
{
  "fixture_id": "G1.2-ask-on-the-fly__base",
  "scenario_id": "G1.2",
  "input": { "page": "chat", "action": "message",
             "context": { "text": "...", "modality": "text|voice|image" } },     // §15.1 envelope
  "expected_output_assertions": [
    { "type_eq": "stream_chunk|...|stream_done" },                                 // output_contract (col 9)
    { "content_matches": "<semantic rubric, not exact string>" },
    { "must_not_contain": "<direct graded answer>" }                               // integrity, see 6.2
  ],
  "expected_tool_sequence": [ "route.intent", "route.integrity_check_open_assignment",
                              "recall.context_window_warm", "rag.query?",
                              "tutor.llm_sonnet_stream", "remember.session_signal" ], // col 21
  "latency_budget": { "class": "C1", "max_ms": 3000,
                      "stage_budget": { "route":200, "recall":800, "llm":1800, "write":0, "deliver":200 } } // col 14
}
```

Rules:
- `expected_output_assertions` are **semantic rubrics + hard must/must-not**, not string equality (LLM output is non-deterministic). Hard constraints (integrity, k-anon, tier denial) are `must_not_contain` / `must_short_circuit` assertions.
- `expected_tool_sequence` asserts **ordered presence of mandatory gate steps** and absence of forbidden ones (e.g. **no inline `recall.refresh_cold`** on a C1 row — that's the X3 assertion). It does **not** assert internal tool args (Step 2).
- `latency_budget` is checked against the per-stage model; a fixture fails if any stage exceeds budget OR total exceeds `max_ms` (with the cold-start landmine measured separately, not amortized away).
- Edge fixtures **override** specific fields: e.g. `G1.2-ask__graded-open` flips `input.context` to a question matching an open assignment and asserts `expected_tool_sequence` includes `route.integrity_check_open_assignment` returning "graded" → capability switches to `tutor.socratic` and `must_not_contain: direct_answer`.

### 6.2 The 3 integrity red-lines as trajectory assertions

These are the highest-value fixtures — they must be **hard pass/fail**, not rubric-scored:

1. **Socratic-on-graded (Gate 1).** Fixture: a question that matches an open Canvas assignment with a future due date.
   - `expected_tool_sequence` MUST contain `integrity.check_open_assignment` **before** any tutor-answer capability.
   - Branch assertions: match=graded+open+future → capability = `tutor.socratic`; output `must_not_contain` a direct solution; **on Canvas-match uncertainty (stale/unmatched), MUST fail closed to Socratic** (X6). Negative fixture: a past/practice/conceptual question → capability = `tutor.explain` (answer allowed) — proves the gate isn't over-firing. Multilingual-paraphrase fixture (zh-CN restatement of the graded prompt) must still route to Socratic (X8).
2. **Writing feedback-only (Gate 2).** Fixture: "help me write/fix" on an open graded writing assignment.
   - `expected_tool_sequence` MUST contain the integrity check first; capability = `scaffold.blank_headings_only`; output `must_not_contain` body sentences/paragraphs/filled outline. Gate-evasion fixture ("just an example paragraph I won't submit") still scaffold-only. Past/practice fixture lifts the restriction.
3. **Generated media non-submittable (Gate 3).** Fixture: podcast/video generation request.
   - Output assertion: review/explanatory framing only; `must_not_produce` submittable deliverable. Combined with tier gate (X13) as the first step.

Plus the **k-anonymity red-line** (X7) as a fourth hard assertion for G4.2: `<10` cohort fixture MUST `short_circuit` to "not enough data" with `expected_tool_sequence` containing **no** per-student read.

### 6.3 Coverage target

Every row ships with: 1 base + all applicable cross-cutting edges (X1–X15) + per-scenario edges. The **4 hard-constraint families** (3 integrity + k-anon) must each have a positive and a negative fixture (gate fires / gate correctly doesn't fire) so we catch both fail-open and fail-closed.

---

## 7. Method & sequencing

### 7.1 Order of work (produce the catalog in this sequence)

1. **Freeze the schema (Section 2) at the review.** Nothing else proceeds until columns are agreed — every downstream artifact references them.
2. **Lock the latency model (Section 3).** Classes + stage budgets must be agreed before any row's latency column is filled, because the SLO is derived, not per-row invented.
3. **Fill the inventory skeleton (Section 4)** — id, group, pattern, status, code_reality. Pure cataloguing against INPUT B/C; no design judgment. Fast.
4. **Author cross-cutting edges once (X1–X15)** with their generic assertions, then **reference by id** from each row's `failure_degraded_behavior`. Avoids re-writing the same edge 17×.
5. **Fill the read/write/output/trajectory columns per row**, grouped by pattern (do all P-A reactive rows together — they share the warm-snapshot recall + stage budget; then P-B proactive — they share the arbiter pipeline; then P-C/SYS).
6. **Add per-scenario edges (5.2)** and derive edge fixtures.
7. **Generate the eval fixtures (Section 6)** mechanically from filled rows.
8. **Reconcile contradictions** (PRD-internal Lesson-Generator tier; spec "within minutes" vs 30-min cron; three stress scales) into the `open_questions` column for the review.

### 7.2 Work split by layer (brain layer vs product layer)

The work divides along the data boundary — **brain-layer work reads/writes the Brain DB (NeuroAGI) and defines the trajectory + trace; product-layer work defines the product-agent output shapes and the FschoolAI-side product tables/UI.** This groups *what needs doing*; it is not an assignment of who does it.

| Concern | Layer | Why it sits there |
|---------|-------|-------------------|
| `context_to_READ` brain fields, flat-mock contract, warm-snapshot vs cold-refresh, freshness bounds, graph-dependency flags | **Brain** | Brain DB + `context_window` semantics; the cross-product brain (one person = one brain). |
| `signal_to_WRITE` brain signals, `proactive_signals`, delivery-tracking labels, effectiveness loop | **Brain** | All `brain.signals` / arbiter / intervention / reflection writes are NeuroAGI-side. |
| `expected_tool_TRAJECTORY` (the capability sequence) + the **trace** (which writes fire, in what order, dedup/idempotency) | **Brain** | Trajectory = the read→route→tool→write loop the brain orchestrates. |
| Proactive pipeline edges (X5, X7, X11, debounce/quiet-hours/k-anon) | **Brain** | Arbiter + cohort live in the brain layer. |
| `output` + `output_contract` per page/action (§15.5 typed shapes), SSE streaming | **Product** | Product-agent outputs the UI consumes via `/api/agent-manager`. |
| `tier_gate`, message-quota, Studio/video/podcast availability | **Product** | Product monetization + Stripe enforcement. |
| Input modality normalize (OCR, STT routing, sanitize) + UI affordances (loading indicator, offline notice, "coming soon") | **Product** | Product-side perceive layer + WCAG/UX. |
| `integrity_gates` *trajectory step* (the open-assignment check) | **Shared** | The check is a brain/Canvas read (brain layer); the "what the user sees" content assertion is product layer. |
| `status` / `code_reality` | **Shared** | Product files (NeuralRing, SpaceExams, canvasSync) on the product side; brain crons / intervention / arbiter on the brain side. |

### 7.3 What must be DECIDED at the review

1. **Schema lock** (Section 2): are these 25 columns the contract? Any missing axis?
2. **SLO confirmation** (Section 3): confirm the per-stage budgets, noting C1=3s is committed against the warm-cache + streaming path resolved in §8.1.1 (built in Step 4).
3. **Spec-vs-flat-mock stance:** do we write trajectories to the **spec** (target) with a `code_reality` gap note (recommended), or to today's flat implementation? (This plan assumes spec-target.)
4. **Confirm the resolved decisions** (§8.1): stress scale = 0–1, event-driven detection, arbiter-routed reminders, Lesson Generator = Pro 10/mo, the warm-cache plan, and gap-data sourcing.
5. **Cohort release gate:** is G4.2 in the Step-1 catalog as `spec` behind the PIPEDA/FERPA + k-anon gate, or deferred?
6. **Voice modality:** catalog every interactive row with a voice variant (per §9) even though STT routing is unbuilt, with X10 degradation — yes/no?

---

## 8. Decisions & remaining risks

### 8.1 Resolved (decision baked into the catalog)

1. **Warm `context_window` cache (the C1 3s enabler).** Make the snapshot reliably warm: run the scheduler every 30 min, give it a `maxDuration` and **paginate the person list** so it never truncates under load, add a **Redis layer** over `context_window`, and on a cold/expired read return a **fast fallback** while refreshing in the background. **Move the blocking classifier and the fixed 3000ms RAG race off the hot read path.** Result: `recall` is always a warm read (≤800ms), so the C1 budget holds. C1 SLOs are committed against this path (built in Step 4).
2. **One stress scale: 0.0–1.0 everywhere.** Standardize on the PRD's 0–1 float (matches `src/api/brain.ts`). Both schedulers write 0–1; the negative trigger is `stress > 0.8`. The 0–10 / 0–100 representations are converted at the source. Trigger columns are authored on the 0–1 scale.
3. **Real gap data + reader matches writer.** `knowledge_gaps` is populated from the Tutor/quiz signals (the effectiveness loop), not a hardcoded `[]`. `context_to_READ` reads **only** the flat fields the scheduler actually writes (`stress_level, momentum_state, active_deadline, recent_summary, what_to_focus_on, knowledge_gaps[]`); the unused rich-field branches are dropped. Anything beyond the flat set is flagged `graph-dependent`.
4. **Proactive detection is event-driven.** Intervention subscribes to `brain_signals` INSERT via Supabase Realtime and consumes the 5-min `stress_score`, so it fires within minutes (meets the C4 SLO). The 30-min cron is demoted to an hourly safety sweep for missed events.
5. **All proactive delivery goes through the arbiter.** `assignment-reminder` is routed through `propose_proactive → arbiter → deliver` like every other proactive signal, inheriting dedup, the ≤1/hr ≤3/day rate limits, quiet hours, and student-timezone handling. No direct-SMS bypass.
6. **Lesson Generator tier = Pro, 10/month.** Resolves the PRD inconsistency; the `tier_gate` column for G3.6-video is authored as Pro 10/mo.

### 8.2 Remaining open risks (track; no clean fix yet)

- **Flat-mock vs graph (§3.6).** Behaviours needing more than the flat fields (prereq checking, cross-course links, prereq>0.85 trigger, cohort) must carry a `graph-dependent` flag + thin-data fallback, never silently break when the graph is absent.
- **Positive proactive path is unbuilt.** `brain-intervention` implements only part of the negative trigger table; the positive table (G2.2) is `spec`. Catalogued as target; build tracked separately.
- **Voice/STT + language routing unbuilt.** §9 mandates voice + zh-CN Phase-1, but there's no language-detect→STT routing yet and transcription is synchronous English-only. Voice/multilingual variants are `spec` with X8/X10 degradation.
- **Canvas is PAT-not-OAuth, client-side, no syllabus ingest.** Scenarios needing syllabus/rubric/weights (G1.3, G3.1, G3.2, S3) lack their data source today, and integrity Gate 1 depends on reliable Canvas data (X6 fail-closed handling required).
- **SLO measurement spike.** The per-stage budgets (§3.2) are not yet load-tested against the ~600ms cross-project Brain hop + cold starts + RAG rerank. Measure before treating the budgets as final; the recall stage has the least margin.
- **Reflection (S2) cron doesn't exist yet** and runs in the NeuroAGI brain layer; FschoolAI never calls it, so decay/forget is aspirational. Any scenario relying on decayed confidence reads data not yet produced.