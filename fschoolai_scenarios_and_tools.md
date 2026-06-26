# FschoolAI — Scenario Catalog & Agent Tool Inventory
**v1 draft for tech review**
Covers the senior-eng asks: **(1)** every scenario's input / output / max latency, **(2)** the tools/API/MCP an agent can call, plus **(3)** the eval-set, full-chain trace, and LLM-gateway notes raised in the same thread. Source material: `fschoolai_agents_and_scenarios.md.docx`, `neuroagi-fschool-scenarios.html`, and `FschoolAI_PRD.md` §3/§7.1/§9/§14/§18.

---

## A. Architectural backbone (from the scenario diagram)

`neuro-agi (脑/OS) ⇄ FschoolAI (主 Agent) ⇄ 子 Agents`. Four canonical interaction patterns the catalog below is built on:

| Pattern | What | Where it shows up |
|---|---|---|
| **A · reactive Q&A** (反应式问答) | user asks → main agent `recall`s context → answers → `remember`s a signal | Daily group, most academic tasks |
| **B · proactive intervention** (主动干预) | brain watches signals → `cortex/policy` arbitrates → reaches out | Passive-reminders group |
| **C · nightly consolidation + forgetting** (夜间整合与遗忘) | 2 AM: synthesize the day, decay stale nodes | Reflection Agent (system) |
| **D · cross-product compounding** (跨产品复利) | a second product inherits the brain on day one | future; identity bridge enables it |

**NeuroAGI's role is exactly 3 jobs** (route intent · augment context · facilitate bidirectional comms). **All multi-step product logic runs closed-loop inside FschoolAI** — it does not round-trip the brain per step.

---

## 1. Scenario catalog (input · output · max latency · agent · expected tool trajectory)

Latency budgets derive from PRD §9 (3 s standard, ≤10 s for transcription/plan-gen with a loading state, async/minutes for video & podcast — both **exempt** from the 3 s NFR). "Expected tool trajectory" doubles as the eval-set spec (§3).

### ① Opening the app daily — high-frequency, user-initiated (Pattern A)

| Scenario | Input | Output | Max latency | Primary agent(s) | Expected tool trajectory |
|---|---|---|---|---|---|
| **Daily briefing** | app open (`user_id`) | "what to do today": deadlines this week, today's study block, lowest-readiness course | **≤1.5 s** (warm context) | Situation Synthesizer + Planner + Canvas | `recall(context_window)` → `canvas.upcoming` → compose-greeting (LLM-mini) |
| **Ask on the fly** | message (text/image/voice) | level-adapted explanation; **Socratic** if it matches an open graded assignment | **≤3 s** | Reggie → Tutor | route-intent (LLM-mini) → `recall(gaps,style)` → `canvas.is_open_graded?` (→ Socratic gate) → tutor (LLM-Sonnet) → `remember(topic, confusion, gap)` |
| **Check grades / deadlines + what-if** | open page | per-course grade + 2-week due list; **live** what-if ("what final → B+?") | page **≤1 s**; what-if **instant** (client) | Canvas + Exam Predictor (7b) | `canvas.grades` + `canvas.assignments` + `grade_weights` → what-if = client arithmetic (no LLM) |

### ② Passive reminders — system-initiated, background (Pattern B)
Not bounded by user-facing latency; the SLO is **freshness + governance**: trigger→delivery within minutes, **≤3/day, ≤1/hr, quiet hours 23:00–08:00**, deduped.

| Scenario | Input (signal) | Output | Latency / cadence | Agent(s) | Expected tool trajectory |
|---|---|---|---|---|---|
| **Stress / deadline nudge** | 3 deadlines/48 h, opened-not-started, grade drop | one gentle nudge after arbitration | trigger→deliver **≤ a few min** (arbiter debounce 2–3 min) | Intervention → Arbiter | (cron) watch `brain.signals` → `needsIntervention` → `propose_proactive` → arbiter (dedup/rank/rate/quiet) → `deliver(in_app|discord)` |
| **Gap / review-opportunity nudge** | free block + quiz tomorrow; spaced-rep due | "90 min free at 3 PM + quiz tomorrow — quick review?" | same pipeline | Intervention → Arbiter | same; positive trigger |
| **Stress escalation cap** | very-high stress ≥3 days, no engagement | one supportive wellbeing message, then 48 h pause | n/a | Intervention | gate on delivered-unengaged labels → wellbeing message + suppress |

### ③ Academic tasks — goal-driven, high value (Pattern A, some async)

| Scenario | Input | Output | Max latency | Agent(s) | Expected tool trajectory |
|---|---|---|---|---|---|
| **Exam prep** | "CHEM 201 exam in 3 days" | multi-day plan by weak points + practice Qs; dynamic re-plan; eve-of one-liner | plan **≤10 s** (loading); per-answer eval ≤3 s | Exam Mode (7) → Predictor (7b) | `recall(gaps,history)` → `canvas.exam_date` → `generate_exam_plan` → `generate_questions` → on submit `evaluate_answers` → `remember(exam_readiness)` |
| **Start assignment** | "Help me start" / assignment | **structural skeleton only** (no body — integrity red line) | **≤5 s** | Assignment Agent | `canvas.rubric` + `recall(prof_profile,gaps)` → `generate_framework` (scaffold-only guard) |
| **Weekly plan** | "plan my week" | personalized plan (deadlines + free time + difficulty + stress); silent reschedule on miss | **≤5 s** | Planner + Calendar | `recall(stress,gaps,patterns)` → `canvas.deadlines` → `calendar.read` → `generate_plan` → `calendar.write` |
| **Digest lecture** | lecture audio (Chrome ext.) | transcript + summary + concepts + flashcards + quiz + cross-course links | transcription ≤10 s; full pack **minutes** | Lecture + Audio | `transcribe(audio, lang)` → `summarize`+`generate_flashcards`+`generate_quiz` → `cross_course_connect` → `remember(lecture, concepts)` |
| **Office hours** | "seeing Prof Chen in 30 min" / "ended" | 3–5 targeted questions / capture + brain update | **≤5 s** | Office Hours | `recall(gaps in course)` → `generate_questions`; post: capture → `remember(gaps_closed)` |
| **Studio: generate** | pick source + format | podcast / explainer video / mind-map / summary from **own** materials | **async**: video <5 min (Max), podcast <3 min (Pro+) | Studio → Lesson Gen (6b) / Podcast (15) / Library | `recall(context)` + `library.source` → `generate_video`\|`generate_podcast` (pipeline) → `notify` when ready |

### ④ Social / collaboration (Pattern A + aggregate)

| Scenario | Input | Output | Max latency | Agent(s) | Expected tool trajectory |
|---|---|---|---|---|---|
| **Study room** | join room | AI tutor coordinates; **no individual's weakness leaked** | voice ≤sub-second (LiveKit); tutor turn ≤3 s | Study Room Orchestrator | per-participant private `recall` → orchestrate modes → `remember(room_interaction)` (privacy: never expose individual) |
| **Class-wide status** | open social/status page | "many in your class stuck on stereochem — targeted review" | **≤2 s** | Cohort (14) | read **de-identified** cohort aggregate (gated **k≥10** + legal) → render |
| **Leaderboard** | open leaderboard | progress, streaks, healthy comparison | **≤1 s** | Leaderboard | read leaderboard tables |

### System scenario (Pattern C)

| Scenario | Input | Output | Cadence | Agent | Trajectory |
|---|---|---|---|---|---|
| **Nightly reflection** | day's `brain.signals` | updated gap-confidence, decayed nodes, new patterns, brain-health summary | 2 AM, staggered over a 4 h window | Reflection (12) | `recall(day signals)` → synthesize patterns → update brain → decay sweep |

**Three hard constraints that cut across scenarios** (must be trajectory-asserted, not per-feature): ① graded-open work → never a direct answer (Socratic); ② writing → feedback only, never ghostwriting; ③ podcast/video → never submittable content. Plus tier gating (video=Max, podcast/studio=Pro+, free=20 msg/day).

---

## 2. Agent tool / API / MCP inventory

The main agent reaches the brain over the **bus (local/http/MCP)**; product capabilities are tools too. Each: signature → output · side-effects · latency budget · callers · status.

### Brain (NeuroAGI) — via bus / MCP
| Tool | Signature → output | Latency | Callers | Status |
|---|---|---|---|---|
| `recall` | `(subject, query?)` → context slice (memory, patterns, gaps, deadlines) | **≤300 ms** (warm `context_window`; cold rebuild 3–8 s off-path) | all read-side | live (Supabase) → v2 target |
| `remember` | `(subject, {kind, body, source})` → ack | async | all write-side | live (`api/brain-signal`) |
| `forget` / `reinforce` | `(subject, filter)` | async | RTBF, decay | v2 |
| `verify_skill` | `(subject, skill)` → mastery + evidence | ≤1 s (derived) | credentials | v2 (derived layer) |
| `brain_health` | `(subject)` → metrics | ≤1 s (derived) | Brain page | v2 |

### Canvas / academic
| Tool | Signature → output | Latency | Status |
|---|---|---|---|
| `canvas.sync` | `(user)` → courses/assignments/grades/syllabus | async (6 h + on-demand) | live |
| `canvas.grades` / `canvas.assignments` | `(user, course?)` → reads | ≤1 s | live |
| `grade_weights` | `(course)` → weight schema (for what-if) | ≤1 s | needs exposing |

### Content / RAG / library
| Tool | Signature → output | Latency | Status |
|---|---|---|---|
| `rag.query` | `(user, q)` → grounded chunks (hybrid + rerank) | ≤2 s | live (`api/rag`) |
| `library.lookup` | `(university, course, type)` → shared `course_content` | ≤1 s | partial |
| `recall_memory` | `(user, query)` → student files by intent (summary-index routing, not vector) | ≤2 s | v2 (MEMORY_ARCH) |
| `extract` | `(file\|storagePath)` → structured text (pdf/docx/pptx/img/yt) | seconds | live (`api/extract`) |
| `transcribe` | `(audio, lang)` → transcript (routed: ElevenLabs/Deepgram/Tencent/Whisper) | realtime-ish / ≤10 s | partial |

### Generation
| Tool | Signature → output | Latency | Tier | Status |
|---|---|---|---|---|
| `summarize` / `generate_flashcards` / `generate_quiz` | `(source)` → artifact (LLM-mini) | ≤5 s | Pro+ | live (YouLearn surface) |
| `generate_exam_plan` / `evaluate_answers` | `(gaps, readiness)` → plan / score (LLM) | ≤10 s | — | partial |
| `generate_framework` | `(rubric, prof_profile, gaps)` → **scaffold only** | ≤5 s | — | partial |
| `generate_lesson_video` | `(concept, brain-context)` → video (Manim + ElevenLabs) | **<5 min async** | Max | spec |
| `generate_podcast` | `(source_set, format)` → audio (ElevenLabs multi-voice) | **<3 min async** | Pro+ | spec |
| `what_if` | `(grade_weights, hypotheticals)` → projection | **instant, client-side, no LLM** | Pro/Max | spec |

### Delivery / proactivity
| Tool | Signature → output | Latency | Status |
|---|---|---|---|
| `propose_proactive` | `(user, candidate)` → `proactive_signals` row | async | **live** (`api/_notify`) |
| `arbiter` | (cron) dedup/rank/rate-limit/quiet → `notification_queue` | every 5 min | **live** (`api/arbiter`) |
| `deliver_in_app` / `deliver_discord` | `(user, payload)` → delivery + tracking | async | **live** |
| `notify` | `(user, type, payload)` → immediate transactional | instant | **live** |

---

## 3. Eval set, full-chain trace, LLM gateway (the quality guardrail)

**Eval set (trajectory-based).** Each scenario in §1 becomes a fixture:
```
{ input, expected_output_assertions, expected_tool_sequence, latency_budget }
```
Grade three axes: **output** (LLM-judge + assertions), **trajectory** (right tools, right order, integrity gates honored — e.g. for an open-graded input the answer tool MUST NOT fire / the Socratic path MUST), and **latency** (vs the budget column). The 3 academic-integrity red lines are encoded as trajectory assertions, not prose.

**Full-chain trace.** Every agent run emits a span tree: `route → recall → tool calls → LLM(gateway) → remember → deliver`. Export/persist trajectories so they can be replayed as eval fixtures and audited. This is the senior eng's "全链路 trace" — the trace store is also where the eval harness reads trajectories from.

**LLM gateway (do first — it's independent).** Put a **LiteLLM-style gateway** in front of every model call. It centralizes: §7.1 model routing (Haiku / 4o-mini for routing·eval·summarize; Sonnet / 4o for tutor·video·podcast), prompt-cache of the brain-context prefix (~70–80% token cut), cost accounting, fallback, and **trace logging** (the natural central span emitter). Landing this first gives observability + cost control before the agent surface grows.

---

## Open items for the review
- **Confirm latency SLOs** above (esp. the ≤300 ms warm-context read — depends on the `context_window` cache actually being populated by the scheduler).
- **v1 vs v2 tool set**: several tools are "spec" (video/podcast/what_if/recall_memory/verify_skill) — agree which are in the first eval set.
- **Split of points 1 & 2 by layer**: brain-layer work = the brain tools + trajectories (recall/remember/propose_proactive/arbiter) and the trace/gateway; product-layer work = the product-agent tools + scenario outputs. Reconcile at the review.
- **k-anonymity + legal gate** for the cohort/class-status scenario must clear before that scenario ships.
