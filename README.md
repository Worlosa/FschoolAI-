# FschoolAI — Academic Intelligence Platform

**FschoolAI is an AGI-level academic intelligence system that builds a living, compounding brain for every student.**

The AI adapts to the student. Not the other way around.

> **Live product:** [fschool-ai.vercel.app](https://fschool-ai.vercel.app) · **52 active users** · **926 assignments synced** · **84 courses tracked**

---

## What This Is

Most AI tools summarize content in the AI's context. FschoolAI summarizes content in **the student's context** — using everything it knows about how that specific student thinks, what they struggle with, and what's due this week.

The system has two components that work together:

| Component | What It Does |
|---|---|
| **FschoolAI** | The product students use — chat, assignments, grades, leaderboard, study tools |
| **NeuroAGI Brain** | The intelligence layer — a living brain that compounds everything the student does into a growing cognitive model |

FschoolAI owns the product. NeuroAGI owns the person. Every student interaction writes signals to the brain. The brain gets smarter every day. By Day 100, the AI knows the student better than any tutor, professor, or advisor ever could.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    STUDENT                              │
│  Web App  ·  Chrome Extension  ·  (Mobile coming)      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              FSCHOOLAI BACKEND (Node.js/Express)        │
│                                                         │
│  Agent Manager  →  Routes every request to the         │
│                    right specialist agent               │
│                                                         │
│  Routes: /api/agents  /api/canvas  /api/brain           │
│          /api/chat    /api/voice   /api/signals         │
│          /api/feedback  /api/extension                  │
└──────────────┬──────────────────────┬───────────────────┘
               │                      │
               ▼                      ▼
┌──────────────────────┐  ┌───────────────────────────────┐
│  FSCHOOLAI DB        │  │  NEUROAGI BRAIN DB            │
│  (Supabase Postgres) │  │  (Supabase Postgres)          │
│                      │  │                               │
│  Operational data:   │  │  Intelligence data:           │
│  · users             │  │  · neuro.persons (identity)   │
│  · courses           │  │  · brain.signals              │
│  · assignments       │  │  · brain.knowledge            │
│  · sessions          │  │  · brain.reflections          │
│  · leaderboard       │  │  · brain.predictions          │
│  · flashcards        │  │  · brain.reports              │
│  · modules           │  │  · agents.sessions            │
│  · impressions       │  │  · agents.messages            │
│  · knowledge_graph   │  │  · neuro.memory               │
└──────────────────────┘  │  · neuro.patterns             │
                          └───────────────────────────────┘
```

**The rule:** FschoolAI never stores intelligence. It only reads intelligence from the Brain and writes signals back. The Brain never stores Canvas operational data. It only stores the brain's view of that data.

---

## Two Databases — Why and How

### FschoolAI Production DB

Stores the product's operational data — what the student does, what Canvas says, what the leaderboard shows.

| Table | Description |
|---|---|
| `users` | Student profiles, Canvas OAuth tokens, brain_person_id link |
| `courses` | Synced from Canvas/Moodle/D2L — name, code, score, institution, term |
| `assignments` | All assignments — due dates, scores, submission status |
| `sessions` | Chat sessions with message history |
| `modules` | Course modules and items from Canvas API |
| `flashcards` | AI-generated flashcards per course |
| `leaderboard` | Weekly rankings across 8 categories |
| `impressions` | AI tutor interaction logs |
| `knowledge_graph` | Per-student concept mastery nodes |

### NeuroAGI Brain DB

Stores the intelligence — everything the brain has learned about the student. Four schemas, each with a clear purpose.

**`neuro` — Identity Layer**

Product-agnostic identity. A "person," not a student. Every product that connects to the brain references `neuro.persons(id)`.

| Table | Description |
|---|---|
| `neuro.persons` | Core identity: id, display_name, email, timezone, language |
| `neuro.memory` | Key-value facts extracted from conversations |
| `neuro.patterns` | Behavioral patterns discovered from observation |

**`brain` — Intelligence Layer**

The brain itself. Signals in, intelligence out. Never accessed directly — only through Brain SDK functions.

| Table | Description |
|---|---|
| `brain.signals` | Unified signal table — every event that matters |
| `brain.knowledge` | Knowledge graph: concept → mastery level → decay rate |
| `brain.predictions` | What the brain predicts about the student |
| `brain.reflections` | AI observations, session notes, self-reflections |
| `brain.reports` | Weekly intelligence reports |

**`agents` — Agent Manager Layer**

All agent activity — sessions, messages, outputs, registry.

| Table | Description |
|---|---|
| `agents.registry` | Which agents exist and their capabilities |
| `agents.sessions` | Conversation sessions |
| `agents.messages` | All messages (1,469 migrated from legacy) |
| `agents.outputs` | Structured outputs from agents |

**`fschool` — Product Data Layer (Brain's Academic View)**

| Table | Description |
|---|---|
| `fschool.assignments` | Upcoming deadlines as the brain sees them |
| `fschool.courses` | Courses the brain tracks |

### Brain SDK — The Only Way to Talk to the Brain

```typescript
// Get everything the brain knows about a person
brain.get_context(person_id: uuid) → jsonb

// Send a signal to the brain (Canvas sync, conversation event, etc.)
brain.emit_signal(person_id: uuid, type: text, payload: jsonb, source: text) → uuid

// Runs nightly via pg_cron — decays stale knowledge
brain.apply_knowledge_decay() → void
```

FschoolAI code must use `brain.get_context()` and `brain.emit_signal()`. Never INSERT directly into `brain.*` tables.

### The Bridge: `brain_person_id`

Every FschoolAI user has a `brain_person_id` column in `public.users`. This UUID links the Canvas account to the corresponding `neuro.persons` record in the Brain DB. Set on first Canvas OAuth login by `brain-person-service.ts`.

---

## The 7-Layer Brain Architecture

The brain processes student data through 7 sequential layers. Each layer builds on the previous one.

| Layer | Name | What It Does |
|---|---|---|
| **1** | Signal Collection | Captures behavioral, emotional, knowledge, context, outcome, and biometric signals from every student interaction |
| **2** | Knowledge Graph | Maps concepts the student knows, their mastery level, and how concepts connect across courses |
| **3** | Causal Inference | Finds root causes — not just "grade dropped" but "grade dropped because study sessions shortened after friend group changed" |
| **4** | Prediction Engine | Forecasts outcomes — grade predictions, burnout risk, optimal study timing, exam readiness |
| **5** | Intervention Engine | Decides when and how to intervene — proactive nudges, study plan adjustments, motivation triggers |
| **6** | Agent Orchestration | Routes every student request to the right specialist agent, synthesizes multi-agent responses |
| **7** | Compounding | Synthesizes all layers into a growing intelligence snapshot — the brain gets smarter every day the student uses the product |

### Nightly Brain Jobs (pg_cron)

- **2:00 AM UTC** — Knowledge Graph Compaction: summarizes recent `brain.signals` into `brain.knowledge`, calculates mastery levels and confidence decay
- **3:00 AM UTC** — Prediction Refresh: updates grade predictions, burnout risk scores, and study recommendations based on the last 90 days of signals

---

## Signal Types

The brain ingests 8 categories of signals. Each writes to a dedicated table and feeds the 7-layer processing chain.

| Signal Type | What It Captures | Source |
|---|---|---|
| **Behavioral** | Typing speed, session duration, scroll patterns, tab switches | Web app, Chrome extension |
| **Emotional** | Confidence level, stress indicators, motivation state | Chat sentiment, self-reports |
| **Knowledge** | Concept mastery, quiz performance, flashcard accuracy | Study sessions, quizzes |
| **Context** | Time of day, device, location type, course context | App metadata |
| **Outcome** | Grades posted, assignments submitted, deadlines met/missed | Canvas sync |
| **Biometric** | Heart rate, sleep quality, activity level | Apple Health (planned) |
| **Facial Expression** | Engagement level, confusion detection | Camera (planned, opt-in) |
| **Voice Analysis** | Stress in voice, confidence level | Voice sessions (planned) |

---

## What's Built

### Backend Services (all in `backend/server/services/`)

| Service | Status | Description |
|---|---|---|
| `agent-orchestrator.ts` | ✅ Live | Routes all chat to the right agent, synthesizes responses |
| `brain-context-window.ts` | ✅ Live | Pre-computes brain snapshot — chat starts in <50ms |
| `brain-chat-session.ts` | ✅ Live | Manages chat with full brain context |
| `brain-scheduler.ts` | ✅ Live | Cron jobs: context refresh, reflections, interventions |
| `brain-reflection-engine.ts` | ✅ Live | Post-session reflections, hypothesis generation |
| `brain-compounding.ts` | ✅ Live | Synthesizes signals into intelligence |
| `knowledge-graph.ts` | ✅ Live | Concept mastery tracking and gap detection |
| `causal-inference.ts` | ✅ Live | Root cause analysis from signal patterns |
| `prediction-engine.ts` | ✅ Live | Grade predictions, burnout risk, study timing |
| `intervention-engine.ts` | ✅ Live | Proactive intervention delivery |
| `signal-ingestion.ts` | ✅ Live | Normalizes all events into `brain.signals` |
| `pattern-recognition.ts` | ✅ Live | Detects behavioral patterns across time |
| `hypothesis-engine.ts` | ✅ Live | Generates and tests hypotheses about the student |
| `canvas-sync.ts` | ✅ Live | Pulls Canvas data every 30 min, emits brain signals |
| `canvas-oauth.ts` | ✅ Live | Full Canvas OAuth 2.0 flow with token refresh |
| `canvas-api.ts` | ✅ Live | Canvas API client — courses, assignments, grades, modules |
| `voice-service.ts` | ✅ Live | ElevenLabs Turbo TTS streaming, voice customization via chat |
| `brain-person-service.ts` | ✅ Live | Canvas user ↔ Brain person mapping and creation |
| `proactive-intervention-engine.ts` | ✅ Live | Schedules and delivers proactive nudges |
| `autonomous-reflection-engine.ts` | ✅ Live | Runs unprompted reflections on student patterns |

### API Routes

| Route | Auth | Description |
|---|---|---|
| `POST /api/chat` | JWT | Main chat endpoint — agent manager routes to specialist |
| `GET /api/canvas/sync` | JWT | Trigger Canvas sync for current user |
| `GET /api/canvas/courses` | JWT | Get synced courses with grades |
| `GET /api/brain/context` | JWT | Get brain's full context snapshot for current user |
| `POST /api/signals` | JWT | Ingest a signal from the frontend |
| `POST /api/voice/stream` | JWT | Stream TTS audio from ElevenLabs |
| `POST /api/feedback` | JWT | Submit session rating and feedback |
| `GET /api/agents/status` | JWT | Get agent registry and health |
| `POST /api/extension/sync` | JWT | Chrome extension: sync LMS data |
| `POST /api/extension/signal` | JWT | Chrome extension: send behavioral signal |
| `POST /api/extension/content` | JWT | Chrome extension: send captured page content |
| `GET /api/extension/status` | JWT | Chrome extension: get sync status |

### Agents Built (10 live)

| Agent | File | What It Does |
|---|---|---|
| **Assignment Agent** | `agents/assignment-agent.ts` | "Help me start" feature, rubric analysis, framework generation |
| **Study Agent** | `agents/study-agent.ts` | Flashcards, study guides, from uploaded notes |
| **Focus Agent** | `agents/focus-agent.ts` | Session tracking, attention monitoring, break suggestions |
| **Citation Agent** | `agents/citation-agent.ts` | APA/MLA/Chicago citation generation |
| **Canvas Agent** | `agents/canvas-agent.ts` | Canvas-specific queries — grades, deadlines, missing work |
| **Agent Router** | `agents/agent-router.ts` | Intent detection, routes to correct specialist |
| **Agent Orchestrator** | `services/agent-orchestrator.ts` | Multi-agent coordination, response synthesis |
| **Token Engine** | `routes/agents.ts` | Server-side token awards, anti-cheat validation |
| **Voice Preference Agent** | `services/voice-service.ts` | Detects voice change intent, generates custom ElevenLabs voice |
| **Context Window Builder** | `services/brain-context-window.ts` | Pre-computes full brain snapshot before every chat |

### Frontend Pages Built

| Page | Description |
|---|---|
| **Landing** | Cluely-style dark landing page with cinematic animations |
| **Onboarding** | Canvas connect + brain setup flow |
| **Work (Home)** | AI tutor greeting with situation awareness, priority cards |
| **Assignment** | Assignment cards with "done" button, token awards |
| **Study** | Flashcards, study guides, focus timer |
| **Canvas** | Grades overview, course cards, sync status |
| **Leaderboard** | Real-time rankings, tier badges, token balance pill |
| **Identity** | Student profile, activity feed, brain stats |
| **Toolkit** | Study tools and resources |

### Chrome Extension

The extension captures academic data passively — the student never has to do anything.

| LMS | Method | What It Captures |
|---|---|---|
| **Canvas** | Internal API | Courses, assignments, grades, modules, due dates, submission status |
| **Moodle** | Internal API | Courses, assignments, grades per assignment |
| **D2L/Brightspace** | Valence API | Courses, assignment folders, grade values, final grades, computed course % |
| **Blackboard / Other** | AI scrape fallback | Claude parses page content into structured data |

Extension v2 (in progress on `extension/v2-aryan`) rewires all writes to go through the backend API instead of directly to Supabase, using Supabase Auth JWT for authentication.

---

## Token Economy

Tokens are not just points — they are signals that tell the brain about the student's engagement patterns.

| Tier | Tokens Required | Unlocks |
|---|---|---|
| **Basic** | 0 | Core chat, Canvas sync, flashcards |
| **Scholar** | 500 | Advanced study guides, priority support |
| **Mastermind** | 2,000 | Professor Intelligence, Exam Predictor, Social layer |
| **Brain Owner** | 10,000 | Full brain export, custom voice, API access |

**Anti-cheat:** All token awards are server-side. The client cannot award tokens to itself. Every award is validated against `brain.signals` — you cannot earn tokens for study sessions that don't exist in the signal record.

---

## Agents Roadmap

### Sprint 2 — Academic Intelligence (Weeks 3–4)

**Situation Synthesizer** — The tutor's opening greeting every time the student opens the app. Not "Hello! How can I help?" — a real, situation-aware message: "Hey, it's Wednesday 9pm. Your Thermo assignment is due Friday and you haven't started it. Last time you left it this late you got a B-. Want to start now?" Reads recent signals, upcoming deadlines, current streak, social context, and time patterns.

**Professor Intelligence** — Builds a profile of each professor's grading style by analyzing graded assignments. After 5 graded assignments, the brain knows: "Prof Chen deducts exactly 5% per missing citation. Students who open with examples score 12% higher." Surfaces as a badge on assignment cards and as chat context. Confidence score increases with every data point.

**Exam Predictor** — Predicts the student's grade per assignment based on current performance trajectory, submission history, and course patterns. Shows as a predicted grade badge on assignment cards. Updates in real-time as Canvas data changes.

### Sprint 3 — Social Layer (Weeks 5–6)

**Motivation Engine** — Detects motivation drops before they become procrastination spirals. Learns which motivation type works for each student: competitive ("Sarah just passed you"), achievement ("2 days from your longest streak"), fear-driven ("your grade prediction drops to C+ if you start tomorrow"), or curiosity ("I found a connection between your Physics and Econ courses"). Runs every 2 hours for active students.

**Social Intelligence Agent** — Understands the student's social learning patterns. Calculates study compatibility scores between students. Surfaces: "You study 40% longer when Sarah is in the room" and "Groups of 4+ reduce your focus by 30%." Powers the study partner suggestions and room configurations.

**Leaderboard Agent** — Calculates rankings across 8 categories: Nerdmaxing (study hours), Grindmaxing (on-time assignments), Late Night Maxing (10pm–4am study), Social Maxing (friends helped), Brain Maxing (knowledge graph growth), Streak Maxing, Token Maxing, Influencer Maxing (referrals). Anti-gaming: validates all data against `brain.signals`.

**Study Room Orchestrator** — Manages multi-student AI tutoring sessions. When two students are in the same study room, the AI Tutor adapts to both students' brain contexts simultaneously.

### Sprint 4 — Deep Intelligence (Weeks 7–10)

**Writing Evolution Tracker** — Analyzes every piece of writing the student submits. Tracks vocabulary growth, argument structure, citation quality, and clarity over time. Generates a monthly writing report. Shows on the Brain page as a writing growth timeline.

**Knowledge Graph Builder** — Renders a dynamic, interactive knowledge graph from `brain.knowledge`. Shows the student what they know and how concepts connect across courses.

**Content Connector** — Links content the student consumes outside of school to their coursework. Student shares a YouTube video → agent finds connections to current courses → surfaces: "That SpaceX video uses the same F=ma you're studying in Physics 201."

**Focus Agent v2** — Monitors attention during study sessions. Learns this student's optimal session length. Intervenes: "You've been at it for 35 min and your pace is slowing. Take a 5-min break?"

---

## The Compounding Effect

This is what makes FschoolAI defensible. The brain compounds.

| Milestone | What the Brain Knows |
|---|---|
| **Day 1** | Name, courses, Canvas data |
| **Day 30** | Study patterns, which agents help most, stress triggers, preferred explanation style |
| **Day 100** | Professor grading patterns, optimal study timing, social dynamics, writing evolution, knowledge gaps by topic |
| **Day 365** | Complete cognitive model — the AI knows the student better than any human advisor |

Every day the student uses FschoolAI, the gap between their AI and a generic AI tutor widens. By Day 100, switching to a competitor means starting over. The brain is the moat.

---

## LMS Coverage

| Platform | Support Level | Method |
|---|---|---|
| Canvas | Full | Native API via session cookie |
| Moodle | Full | Native API via session cookie |
| D2L/Brightspace | Full | Valence API via XSRF token |
| Blackboard | Partial | AI scrape fallback (Claude) |
| Any university portal | Basic | Universal content script + Claude parse |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), Tailwind CSS, deployed on Vercel |
| Backend | Node.js / Express, TypeScript |
| Database | Supabase PostgreSQL (two separate projects) |
| AI | Claude (Anthropic) for reasoning, ElevenLabs Turbo for voice |
| Auth | Supabase Auth (JWT) + Canvas OAuth 2.0 |
| Extension | Chrome Manifest v3, background service worker |
| Scheduler | pg_cron (nightly brain jobs), Express cron (30-min Canvas sync) |

---

## Repository Structure

```
FschoolAI-/
├── backend/
│   ├── server/
│   │   ├── agents/          ← 10 specialist agents
│   │   ├── routes/          ← 8 API route files
│   │   ├── services/        ← 20+ brain services
│   │   └── middleware/      ← JWT auth, request context
│   ├── migrations/          ← DB migrations (001–003)
│   ├── neuroagi-sdk/        ← Brain SDK client
│   └── supabase/            ← Brain DB migrations + cron jobs
├── frontend/                ← React app (Vite)
│   └── src/
│       ├── pages/           ← 9 pages
│       ├── components/      ← Reusable UI
│       ├── api/             ← Supabase client, API calls
│       └── hooks/           ← Custom React hooks
├── extension/               ← Chrome extension (Manifest v3)
│   ├── background.js        ← LMS API sync, signal capture
│   ├── content/             ← Universal content script
│   └── popup/               ← Extension popup UI
├── agents/                  ← Agent specs (all 17 agents documented)
├── design/                  ← Design system, page specs, flows
├── ALIVE_PRODUCT_SPEC.md    ← Full product vision
├── CURRENT_ARCHITECTURE.md  ← Architecture decisions and known issues
├── API_DOCUMENTATION.md     ← Full API reference
├── ROADMAP.md               ← Ordered build plan with status
└── CONTRIBUTING.md          ← Branch structure and dev workflow
```

---

## Branch Structure

| Branch | Purpose | Who Pushes |
|---|---|---|
| `main` | Stable, investor-facing. Protected — merge only via PR | Johan (CTO) reviews and merges |
| `backend/dev` | All backend work — agents, brain services, routes | Backend contributors |
| `frontend/dev` | All frontend work — React pages, Vercel API routes | Pratik (frontend) |
| `extension/dev` | Chrome extension stable | Extension contributors |
| `extension/v2-aryan` | Extension v2 rewrite — backend API routing, JWT auth | Aryan |

Never push directly to `main`. Open a Pull Request. Johan reviews and merges.

---

## Current Status

| System | Status |
|---|---|
| Canvas OAuth login | ✅ Live |
| Canvas data sync (courses, assignments, grades) | ✅ Live — 52 users, 84 courses, 926 assignments |
| AI chat with brain context | ✅ Live |
| Token engine (server-side) | ✅ Live |
| Real-time leaderboard | ✅ Live |
| Post-session brain reflection | ✅ Live |
| Hypothesis engine | ✅ Live |
| Intervention engine | ✅ Live |
| Brain scheduler | ✅ Live |
| Agent routing (5 specialist agents) | ✅ Live |
| Signal ingestion | ✅ Live |
| Voice TTS streaming (ElevenLabs) | ✅ Live |
| Chrome extension (Canvas/Moodle/D2L sync) | ✅ Built — v2 in progress |
| Backend extension API routes | ✅ Built — deployment pending |
| Professor Intelligence agent | 🔵 Sprint 2 |
| Exam Predictor agent | 🔵 Sprint 2 |
| Motivation Engine agent | 🔵 Sprint 3 |
| Social Intelligence agent | 🔵 Sprint 3 |
| Leaderboard Agent | 🔵 Sprint 3 |
| Knowledge Graph visualization | 🔵 Sprint 4 |
| Writing Evolution Tracker | 🔵 Sprint 4 |

---

## Contact

| Role | Contact |
|---|---|
| Founder / CEO | FschoolAI Inc. |
| CTO | johannaresh@gmail.com |
| Live product | [fschool-ai.vercel.app](https://fschool-ai.vercel.app) |
