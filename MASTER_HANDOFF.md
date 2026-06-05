# FschoolAI — Master Handoff Document
## For CTO & Tech Intern

**Last updated:** June 4, 2026  
**Written by:** Vincent Yang (Founder)  
**Status:** Pre-launch. Backend is partially working. Frontend exists on Vercel. Read this entire document before touching any code.

---

## 1. The Big Picture (Read This First)

There are two companies and two systems. They are separate but connected.

**NeuroAGI** is the operating system and the brain. It is the parent company. It will eventually run on hardware (NeuroGlass). Right now it exists as a cloud database — the NeuroAGI Brain DB. Every person who uses any NeuroAGI product gets a "brain" — a persistent, growing intelligence profile that belongs to them and travels with them across all products.

**FschoolAI** is the first product built on top of NeuroAGI. It is a student academic intelligence platform. It connects to Canvas (the university LMS), gives students an AI tutor, tracks their academic work, and builds their brain over time. When NeuroAGI hardware launches, students who used FschoolAI already have a brain ready to claim.

The relationship is: **FschoolAI is a super-agent that runs on the NeuroAGI brain.**

> The brain adapts to the student. The student does not adapt to the brain.

This is the core design principle. Every feature you build must serve this principle.

---

## 2. What Exists Right Now

### Two Supabase Databases

| Database | Project Name | What It Stores |
|---|---|---|
| NeuroAGI Brain DB | NeuroAGI Brain | Intelligence: signals, reflections, sessions, patterns, memory, context window |
| FschoolAI Production DB | FschoolAI Production | Canvas data: users, courses, assignments, grades, OAuth tokens |

See `CURRENT_ARCHITECTURE.md` for the full table list. See `ENVIRONMENT_SETUP.md` for credentials.

### The Vercel Frontend (neuro-agi.vercel.app)

The intern built a landing page and sign-in flow. It is a **marketing site + auth shell** — not the full product. It has:
- Landing page with feature descriptions (Canvas sync, AI tutor, in-class recording, study rooms)
- Sign-in and sign-up forms
- Pricing page (Free + Pro coming soon)
- FAQ section

It does **not** have a working dashboard, AI tutor chat, Canvas sync UI, or any of the core product features. Those need to be built.

This frontend code **should be added to the FschoolAI- repo** under a `frontend/` folder (the `frontend/` folder already exists but is empty). Do not keep it only on Vercel — it needs to be version-controlled.

### The Backend (FschoolAI- repo, `backend/` folder)

The backend has most of the intelligence services already written. The following are working and tested:

| Service | What It Does | Status |
|---|---|---|
| `brain-chat-session.ts` | AI tutor chat with context | ✅ Working |
| `brain-context-window.ts` | Assembles student context before AI responds | ✅ Working |
| `brain-reflection-engine.ts` | Generates reflections from signals | ✅ Working |
| `hypothesis-engine.ts` | Generates learning hypotheses | ✅ Working |
| `intervention-engine.ts` | Recommends interventions | ✅ Working |
| `canvas-sync.ts` | Syncs Canvas courses, assignments, grades | ✅ Working |
| `canvas-oauth.ts` | Canvas OAuth login flow | ✅ Working |
| `agent-coordinator.ts` | Routes requests to the right agent | ✅ Working |

The following were broken and have now been fixed (commit `c30fa9e`):

| Service | What Was Broken | Fixed |
|---|---|---|
| `agent-feedback.ts` | Wrote to `brain_signals` (doesn't exist) | Now writes to `brain.signals` |
| `canvas-sync-patch.ts` | Same issue | Fixed |
| All 14 backend services | Used `VITE_SUPABASE_URL` (frontend prefix, never read by Node.js) | Now use `BRAIN_SUPABASE_URL` or `FSCHOOL_SUPABASE_URL` |

---

## 3. The Agent Manager Architecture

This is what you are building. Read this carefully.

### The Concept

The AI tutor the student talks to is not a single AI. It is an **Agent Manager** — a coordinator that sits on top of the NeuroAGI Brain and routes each student request to the right specialist agent. The student names their tutor on first login (it becomes their personal AI). Under the hood, the tutor is orchestrating a team.

```
Student
  │
  ▼
[AI Tutor — named by student, e.g. "Alex"]
  │  (Agent Manager — reads brain context, decides which agent to use)
  │
  ├─► Study Agent        — explains concepts, answers questions from lecture notes
  ├─► Assignment Agent   — breaks down assignments, tracks deadlines
  ├─► Writing Agent      — helps draft and improve essays
  ├─► Research Agent     — finds and summarizes sources
  ├─► Focus Agent        — detects distraction, recommends study sessions
  ├─► Memory Agent       — surfaces forgotten concepts, spaced repetition
  ├─► Reflection Agent   — generates weekly learning summaries
  └─► Intervention Agent — flags when student is falling behind
```

The Agent Manager (the tutor) does not do the work itself. It reads the student's brain context, understands what the student needs, and delegates to the right agent. The result comes back through the tutor, so the student always feels like they are talking to one consistent AI.

### What Already Exists in Code

The `agent-coordinator.ts` and `agent-orchestrator.ts` files already implement the routing logic. The individual agents (`study`, `assignment`, `writing`, `research`, `focus`, `memory`, `reflection`, `intervention`) are registered in `agent-registry` in the Brain DB. The `brain-chat-session.ts` service already calls the coordinator.

**What is missing:** The agents are registered but most are not fully implemented. The coordinator routes to them but the agent logic is either a stub or incomplete. This is the primary build task.

### The Brain Context Window

Before the Agent Manager responds to any student message, `brain-context-window.ts` assembles a context package from the Brain DB:

- Student's current courses and upcoming deadlines
- Recent signals (what they have been working on)
- Active patterns (how they learn best)
- Recent reflections and hypotheses
- Any active interventions
- Tutor name and personality preferences

This context is passed to the Agent Manager so the AI always knows who it is talking to. The context window is pre-computed every 30 minutes by the brain scheduler and cached in `brain.context_window`. This is what makes responses fast.

---

## 4. What to Build — In This Order

### Phase 1: Foundation (Do This Before Anything Else)

**1a. Run the FschoolAI Production DB migration**

Open Supabase → FschoolAI Production → SQL Editor and run:

```sql
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS brain_person_id UUID;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS canvas_user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_users_canvas_user_id ON public.users (canvas_user_id);
```

This is in `backend/migrations/001_add_brain_person_id.sql`.

**1b. Set the environment variables on your deployment server**

```
BRAIN_SUPABASE_URL=https://qiolhlvqfzujnkwnymft.supabase.co
BRAIN_SUPABASE_SERVICE_KEY=<Vincent has this>
FSCHOOL_SUPABASE_URL=https://wqgxpouhbwhwpzudrptp.supabase.co
FSCHOOL_SUPABASE_ANON_KEY=<from FschoolAI Production Supabase → Settings → API>
ANTHROPIC_API_KEY=<your key>
CANVAS_CLIENT_ID=<from Canvas developer keys>
CANVAS_CLIENT_SECRET=<from Canvas developer keys>
CANVAS_REDIRECT_URI=https://your-domain.com/api/canvas/callback
JWT_SECRET=<run: openssl rand -hex 32>
```

**1c. Add the Vercel frontend code to the FschoolAI- repo**

The intern's frontend at `neuro-agi.vercel.app` needs to be pulled into the `frontend/` folder of the FschoolAI- repo. Ask Vincent for access to the Vercel project or the source code. Once it is in the repo, it is version-controlled and the team can build on it.

**1d. Start the brain scheduler**

The brain scheduler pre-computes context windows. Without it, every student chat is slow (3–8 seconds for context assembly). With it running, context is ready in under 1 second. The scheduler is in `backend/server/services/brain-compounding.ts`. It needs to run as a persistent background process — not a serverless function. Set it to run every 30 minutes.

---

### Phase 2: Core AI Tutor (The Main Feature)

This is the product. Everything else is secondary.

**2a. Implement the custom tutor naming flow**

`brain-person-service.ts` already handles this. When a student logs in via Canvas for the first time, `needsOnboarding: true` is returned. The frontend must show a screen asking: "What would you like to name your AI tutor?" The name is stored in `neuro.memory` as `key='tutor_name'`. The backend already reads this name and uses it in all responses.

**2b. Implement the Study Agent fully**

This is the most-used agent. It answers questions grounded in the student's lecture notes and course materials. The agent receives:
- The student's question
- Their course context (from `fschool.courses` and `fschool.assignments`)
- Their recent signals (what they have been studying)
- Any uploaded lecture notes

It responds with an answer that references their specific course content, not generic internet answers.

**2c. Implement the Assignment Agent**

Reads `fschool.assignments` and `brain.signals` to understand what is due, what the student has started, and what they are stuck on. Helps break down assignments into steps and tracks progress.

**2d. Wire the chat UI to the backend**

The Vercel frontend has a chat UI mockup. Connect it to `POST /api/brain/chat` (or the equivalent route in the backend). The response should stream back so the student sees the tutor typing.

---

### Phase 3: Signal Collection (Makes the Brain Smarter Over Time)

Every time a student does something in FschoolAI, a signal should be written to `brain.signals`. This is what makes the brain grow. Current signal types in the schema:

- `study_session` — student opened a course or assignment
- `question_asked` — student asked the tutor something
- `assignment_submitted` — Canvas sync detected a submission
- `grade_received` — Canvas sync detected a grade
- `reflection_read` — student read a weekly reflection
- `note_added` — student added a note

The `agent-feedback.ts` service writes signals. Make sure every user action in the frontend triggers the appropriate signal. This is passive — the student does not need to do anything.

---

### Phase 4: In-Class Recording

This is the "never miss what's said in class" feature shown on the landing page. It is marked "coming soon" in the pricing tier. Build it after the AI tutor is working.

The flow: student taps record → audio is transcribed in real time (use Whisper or Deepgram) → transcript is chunked and stored as signals in `brain.signals` with `signal_type='lecture_transcript'` → the Study Agent can now answer questions from that lecture.

---

### Phase 5: Study Rooms

Social feature. Students create rooms, invite friends, study together. Shown on the landing page. Build this last — it requires real-time infrastructure (WebSockets or Supabase Realtime).

---

## 5. What NOT to Build Yet

These are in the docs and in the codebase but are explicitly **not for this launch**:

| Feature | Why Not Now |
|---|---|
| Blockchain agent evolution | Requires infrastructure that does not exist yet. The `BLOCKCHAIN_AGENT_EVOLUTION.md` doc is a future vision document. |
| Prediction engine | `prediction-engine.ts` exists but has no training data yet. It needs months of signal data before it can make meaningful predictions. |
| NeuroGlass hardware integration | Hardware does not exist yet. |
| Instagram/social signal integration | The `INSTAGRAM_SOCIAL_SIGNAL_INTEGRATION.md` doc describes a future feature. Do not build it now. |
| Multi-university admin dashboard | Build for students first. Institutions come later. |
| Knowledge graph visualization | `knowledge-graph.ts` is a stub. The data model is not ready. |

---

## 6. The Frontend (Vercel Site)

The site at `neuro-agi.vercel.app` is a good starting point. Here is an honest assessment:

**What is good:**
- Dark theme, clean typography, professional look
- Landing page clearly communicates the value proposition
- Pricing structure (Free + Pro) is correct
- FAQ covers the right questions
- Sign-in / sign-up forms exist

**What needs work:**
- There is no dashboard — after sign-in, there is a 404. The entire product UI needs to be built.
- The "Sign in" button uses email/password but the actual auth should be Canvas OAuth. These need to be reconciled.
- The landing page says "50+ languages supported" — this is not verified. Do not make claims that are not true.
- The "App Store — Soon" badge is fine to keep as a placeholder.

**The student-facing product UI needs:**
- Dashboard: upcoming assignments, GPA, streak, recent AI tutor conversations
- AI tutor chat interface (the main screen)
- Course list (from Canvas sync)
- Assignment detail view
- Weekly reflection view
- Tutor naming screen (first login)

---

## 7. GitHub Doc Map

Here is what every doc in this repo is for, so you do not get confused:

### Root level docs (operational — read these)

| Doc | Read When |
|---|---|
| `CURRENT_ARCHITECTURE.md` | Understanding what tables exist and how they connect |
| `HANDOFF_PLAN.md` | Week-by-week build plan (this doc supersedes it for detail) |
| `ENVIRONMENT_SETUP.md` | Setting up env vars |
| `CTO_SETUP.md` | Quick start for new developer |
| `DEPLOYMENT_GUIDE.md` | Deploying to production |
| `API_DOCUMENTATION.md` | Backend API endpoints |

### Root level docs (historical — for context, not instructions)

| Doc | What It Is |
|---|---|
| `ARCHITECTURE_ANALYSIS.md` | Earlier analysis, partially outdated |
| `AUDIT_CHECKLIST.md` | Pre-migration checklist, done |
| `REVERT_GUIDE.md` | How to roll back changes |
| `GITHUB_TRACKING.md` | Tracking CTO changes |

### docs/ folder (vision and deep design — read when building specific features)

| Doc | Read When Building |
|---|---|
| `CURRENT_ARCHITECTURE.md` | Always |
| `BRAIN_INTEGRATION_GUIDE.md` | AI tutor and brain connection |
| `CANVAS_TO_BRAIN_DATA_FLOW.md` | Canvas sync and signal ingestion |
| `FSCHOOLAI-MASTER-SPECIFICATION.md` | Full product specification |
| `FSCHOOLAI_BRAIN_LAUNCH_STRATEGY.md` | Launch strategy |
| `ECOSYSTEM_COMPLETE_WALKTHROUGH.md` | How NeuroAGI and FschoolAI connect |
| `BEST_UNIFIED_ARCHITECTURE_FOR_AGI.md` | Long-term architecture vision |
| `NEUROAGI_PRODUCT_STRATEGY.md` | NeuroAGI roadmap |
| `NEUROOS_AGI_CORE_ARCHITECTURE.md` | NeuroOS hardware architecture (future) |
| `TWO_COMPANY_BUILDING_PLAN.md` | Two-company strategy |

### docs/ folder (do not act on these yet)

`BLOCKCHAIN_AGENT_EVOLUTION.md`, `INSTAGRAM_SOCIAL_SIGNAL_INTEGRATION.md`, `NEUROGLASS_*`, `NEUROOS_ON_DEVICE_ARCHITECTURE.md` — these are future vision documents. Read for context but do not build.

---

## 8. Five Questions to Ask Vincent Before Starting

1. Where is the backend currently deployed? (Railway, Render, Heroku, or not deployed yet?) The brain scheduler needs a persistent server — not Vercel.
2. Do you have access to the Vercel project for `neuro-agi.vercel.app`? We need to pull that code into the repo.
3. What is the Canvas OAuth redirect URI set to in the Canvas developer key? It must match `CANVAS_REDIRECT_URI` exactly.
4. Is there an Anthropic API key already, or do we need to create one?
5. What is the target launch date? This determines which phases to prioritize.

---

## 9. The One Rule

> **FschoolAI owns the Canvas account. NeuroAGI Brain owns the person.**

Never write student intelligence data (signals, reflections, patterns, memory) to the FschoolAI Production DB. Never write Canvas account data (users, courses, assignments) to the Brain DB. The bridge between them is a single UUID (`brain_person_id`) stored in the FschoolAI `users` table. That is the only connection point.

If you are ever unsure which database to write to, ask: is this data about who the student is on Canvas, or is this data about how the student thinks and learns? Canvas data goes to FschoolAI Production. Intelligence data goes to NeuroAGI Brain.

---

*This document is the single source of truth for the current state of FschoolAI. If something in another doc contradicts this, this document is correct. Update this document whenever the architecture changes.*
