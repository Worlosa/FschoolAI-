# FschoolAI — Current Architecture

**Last updated:** June 4, 2026  
**FschoolAI Production DB:** `wqgxpouhbwhwpzudrptp.supabase.co`  
**NeuroAGI Brain DB:** `qiolhlvqfzujnkwnymft.supabase.co`  
**Repo:** `vincentyang0702-pixel/FschoolAI-`  
**Status:** Backend built. Canvas sync working. Brain connection wired. Not yet deployed to students.

---

## What FschoolAI Is

FschoolAI is a **separate entity** — an educational product company that uses the NeuroAGI Brain as its intelligence layer. It is not NeuroAGI. It is a product built on top of NeuroAGI.

Think of it this way:
- **NeuroAGI Brain** = the iOS operating system
- **FschoolAI** = an app that runs on iOS

FschoolAI owns the student-facing product: the chat interface, Canvas integration, assignment help, study plans. The brain (intelligence, memory, patterns, hypotheses, interventions) lives in NeuroAGI Brain DB and is accessed via the FschoolAI backend.

```
Student (browser/mobile)
        │
        ▼
FschoolAI Frontend (React)
        │
        ▼
FschoolAI Backend (Node.js/Express, port 5000)
        │
        ├──► FschoolAI Production DB (wqgxpouhbwhwpzudrptp)
        │    └── public.* (users, courses, assignments, Canvas data)
        │
        └──► NeuroAGI Brain DB (qiolhlvqfzujnkwnymft)  ← SUPABASE_URL
             └── neuro.*, brain.*, agents.*, fschool.*
```

---

## Two Databases — Clear Separation

### FschoolAI Production DB (`wqgxpouhbwhwpzudrptp`)

**Purpose:** Raw operational data. Canvas sync. User accounts. Academic records.

| Table | Rows | Purpose |
|---|---|---|
| `public.users` | 52 | Student accounts (Canvas OAuth users) |
| `public.courses` | 84 | Courses synced from Canvas |
| `public.assignments` | 926 | Assignments synced from Canvas |
| `public.canvas_data` | 57 | Raw Canvas API payloads |
| `public.sessions` | 0 | Chat sessions (old schema, not in use) |
| `public.messages` | 0 | Messages (old schema, not in use) |
| `public.students` | 0 | Student profiles (old schema, not in use) |
| `public.chat_sessions` | 0 | Chat sessions (old schema, not in use) |
| `public.flashcard_attempts` | 0 | Flashcard usage |
| `public.lecture_recordings` | 0 | Lecture recordings |
| `public.reggie_arc` | 1 | Reggie relationship arc config (legacy) |
| `public.reggie_config` | 1 | Reggie orientation prompt (legacy) |
| `public.reggie_founding_record` | 3 | Founding session quotes (legacy, keep) |
| `public.reggie_impressions` | 0 | Legacy impressions (migrated to Brain DB) |
| `public.reggie_session_notes` | 0 | Legacy session notes |
| `public.session_close_queue` | 0 | Session close processing queue |
| `public.schools` | 0 | School registry |
| `public.deploy_log` | 0 | Deployment history |

**Key columns in `public.users`:**
```
id (text, Canvas user ID), name, email, school, city, country,
canvas_token, canvas_base_url, ring_name, study_time, streak,
gpa, leaderboard_opt_in, canvas_synced_at, age
```

**Foreign keys:**
- `assignments.user_id → users.id`
- `assignments.course_id → courses.id`
- `courses.user_id → users.id`
- `canvas_data.user_id → users.id`

### NeuroAGI Brain DB (`qiolhlvqfzujnkwnymft`)

**Purpose:** Intelligence layer. Everything the brain knows, feels, and plans. See `neuroagi-core/docs/CURRENT_ARCHITECTURE.md` for full detail.

FschoolAI backend connects here via `SUPABASE_URL` env var (must point to Brain DB).

---

## Backend Service Map

### Core Chat Services

| File | Purpose | DB | Status |
|---|---|---|---|
| `brain-chat-session.ts` | Main chat handler — reads brain context, calls Claude, saves messages | Brain DB | ✅ Working |
| `brain-claude-client.ts` | Claude API wrapper with fallback (Opus → Sonnet) | — | ✅ Working |
| `brain-context-window.ts` | Pre-computes intelligence snapshot before each session | Brain DB | ✅ Working |

### Brain Intelligence Services

| File | Purpose | DB | Status |
|---|---|---|---|
| `brain-reflection-engine.ts` | Post-session reflection — extracts signals, patterns, insights | Brain DB | ✅ Working |
| `autonomous-reflection-engine.ts` | Autonomous (non-session) reflection and synthesis | Brain DB | ✅ Working |
| `brain-scheduler.ts` | Scheduled thinking tasks (cron-style) | Brain DB | ✅ Working |
| `brain-scheduler-init.ts` | Initializes scheduler on server start | — | ✅ Working |
| `hypothesis-engine.ts` | Generates and tracks hypotheses about the person | Brain DB | ✅ Working |
| `intervention-engine.ts` | Generates proactive interventions | Brain DB | ✅ Working |
| `proactive-intervention-engine.ts` | Delivers interventions at the right moment | Brain DB | ✅ Working |
| `brain-intervention-delivery.ts` | Formats and delivers queued interventions | Brain DB | ✅ Working |
| `brain-realtime.ts` | Supabase Realtime subscription for live brain updates | Brain DB | ✅ Working |
| `signal-ingestion.ts` | Ingests signals from all sources into `brain.signals` | Brain DB | ✅ Working |
| `pattern-recognition.ts` | Detects behavioral patterns | Brain DB | ✅ Working |
| `causal-inference.ts` | Root cause analysis | Brain DB | ⚠️ Partial — some flat table refs |
| `knowledge-graph.ts` | Knowledge graph management | Brain DB | ⚠️ BROKEN — flat table refs |
| `brain-compounding.ts` | Signal processing and knowledge graph updates | Brain DB | ⚠️ BROKEN — flat table refs |
| `neuro-agi.ts` | Unified brain manager | Brain DB | ⚠️ BROKEN — flat table refs |
| `prediction-engine.ts` | Outcome prediction | Brain DB | ⚠️ BROKEN — flat table refs |

### Canvas Integration Services

| File | Purpose | DB | Status |
|---|---|---|---|
| `canvas-sync.ts` | Full Canvas data sync (courses, assignments, grades) | FschoolAI DB | ✅ Working |
| `canvas-api.ts` | Canvas API client | — | ✅ Working |
| `canvas-oauth.ts` | Canvas OAuth flow | FschoolAI DB | ✅ Working |
| `canvas-sync-patch.ts` | Emits brain signals after Canvas events | Brain DB | ⚠️ BROKEN — `brain_signals` table ref |

### Agent Services

| File | Purpose | DB | Status |
|---|---|---|---|
| `agent-orchestrator.ts` | Routes requests to appropriate agents | Brain DB | ✅ Working |
| `agent-coordinator.ts` | Coordinates multi-agent responses | Brain DB | ✅ Working |
| `agent-feedback.ts` | Records agent feedback ratings | Brain DB | ⚠️ BROKEN — `brain_signals` table ref |
| `agent-evolution.ts` | Tracks agent performance over time | Brain DB | ⚠️ Partial |

### Specialized Agents (`agents/`)

| File | Agent | Status |
|---|---|---|
| `study-agent.ts` | Study help and explanations | ✅ Working |
| `assignment-agent.ts` | Assignment-specific help | ✅ Working |
| `canvas-agent.ts` | Canvas data queries | ✅ Working |
| `focus-agent.ts` | Focus mode and distraction help | ✅ Working |
| `citation-agent.ts` | Citation and research help | ✅ Working |
| `core-agents.ts` | Core agent definitions | ✅ Working |
| `agent-router.ts` | Intent routing | ✅ Working |

---

## API Routes

| Route | Handler | Purpose |
|---|---|---|
| `POST /api/chat` | brain-chat-session | Main chat endpoint |
| `GET /api/brain/*` | brain route | Brain data queries |
| `GET /api/canvas/*` | canvas route | Canvas data |
| `POST /api/feedback` | feedback route | Agent feedback |
| `POST /api/signals` | signals route | Signal ingestion |
| `GET /api/agents` | agents route | Agent registry |

---

## Architecture Problems Found

### Problem 1: `brain_signals` table does not exist
**Severity: HIGH — Blocks agent feedback and Canvas brain sync**

`agent-feedback.ts` and `canvas-sync-patch.ts` both write to `.from('brain_signals')`. This table does not exist in either database.

**Fix:**
```typescript
// WRONG:
await supabase.from('brain_signals').insert({ user_id: ..., signal_type: ... });

// CORRECT:
await supabase.schema('brain').from('signals').insert({
  person_id: ...,   // not user_id
  signal_type: ...,
  source: 'fschoolai',
  occurred_at: new Date().toISOString(),
  metadata: { ... }
});
```

**Files to fix:** `agent-feedback.ts`, `canvas-sync-patch.ts`

### Problem 2: `brain-compounding.ts`, `knowledge-graph.ts`, `neuro-agi.ts` reference flat tables
**Severity: HIGH — These services cannot run**

These files reference `behavioral_signals`, `emotional_signals`, `knowledge_signals`, `concept_progress`, `concept_connections` — none of which exist.

**Fix:** Rewrite to use `brain.signals` with `signal_type` filtering, and `brain.knowledge` / `brain.knowledge_graph`.

### Problem 3: Single `SUPABASE_URL` for two databases
**Severity: HIGH — Architectural confusion risk**

FschoolAI backend uses a single `SUPABASE_URL` env var. Some services need to read from FschoolAI Production DB (Canvas data, user accounts), others need to read/write Brain DB (signals, reflections, sessions).

Currently, `SUPABASE_URL` points to the Brain DB. Services that need Canvas data (`canvas-sync.ts`) use `VITE_SUPABASE_URL` (which should point to FschoolAI Production DB) — but `VITE_` prefix is for frontend only, not backend.

**Fix:** Use two explicit env vars:
```
BRAIN_SUPABASE_URL=https://qiolhlvqfzujnkwnymft.supabase.co
BRAIN_SUPABASE_KEY=...

FSCHOOL_SUPABASE_URL=https://wqgxpouhbwhwpzudrptp.supabase.co
FSCHOOL_SUPABASE_KEY=...
```
Update all services to use the correct client.

### Problem 4: `public.users.id` is `text` (Canvas ID), but Brain DB uses `uuid`
**Severity: HIGH — Person identity mismatch**

FschoolAI Production DB uses Canvas user IDs (text strings like `"12345"`) as the primary key for `public.users`. The Brain DB uses UUIDs for `neuro.persons.id`.

There is currently no mapping table between Canvas user ID and Brain person UUID. When a student logs in via Canvas OAuth, FschoolAI needs to look up their Brain UUID to read/write brain data.

**Impact:** If this mapping is not handled, the brain cannot be linked to the correct Canvas user.

**Fix:** Add a `canvas_user_id` column to `neuro.persons` (already exists!) and create a lookup function:
```typescript
// On Canvas login, find or create brain person
const { data: person } = await brainSupabase
  .schema('neuro')
  .from('persons')
  .select('id')
  .eq('canvas_user_id', canvasUserId)
  .single();
```

### Problem 5: `public.sessions` and `public.messages` are dead tables
**Severity: MEDIUM — Confusion for developers**

FschoolAI Production DB has `public.sessions` (0 rows) and `public.messages` (0 rows). These are old schema tables from before the brain migration. All sessions and messages now live in `agents.sessions` and `agents.messages` in the Brain DB.

**Fix:** Either drop these tables or add a comment clarifying they are deprecated.

### Problem 6: `reggie_*` tables in FschoolAI Production DB
**Severity: LOW — Legacy clutter**

`public.reggie_arc`, `public.reggie_config`, `public.reggie_session_notes`, `public.reggie_impressions` are legacy tables from when FschoolAI used Reggie directly. The data has been migrated to Brain DB.

**Keep:** `public.reggie_founding_record` (3 rows) — these are founding quotes, historical record, keep forever.  
**Can drop:** `public.reggie_arc`, `public.reggie_config`, `public.reggie_session_notes`, `public.reggie_impressions` (all empty).

### Problem 7: No latency optimization for brain context reads
**Severity: MEDIUM — Will cause slow chat responses**

`brain-chat-session.ts` reads the brain context window at the start of every chat message. If `brain.context_window` is empty (it currently is), it falls back to `refresh()` which makes 10 parallel DB queries + a Claude call — this could take 3-8 seconds before the student even gets a response.

**Fix:** 
1. Populate `brain.context_window` via the scheduler (refresh every 30 min per person).
2. Return a fast fallback response while context loads in background.
3. Add Redis/in-memory cache for context window (avoid DB read on every message).

### Problem 8: Canvas data not flowing into Brain DB
**Severity: MEDIUM — Brain cannot reason about academics**

Canvas data (assignments, grades, courses) lives in FschoolAI Production DB (`public.assignments`, `public.courses`). The Brain DB has a `fschool.*` schema for this data, but it is empty.

`brain-context-window.ts` reads upcoming deadlines from `fschool.assignments` in the Brain DB — but since that table is empty, the brain has no awareness of academic deadlines.

**Fix:** `canvas-sync.ts` should write to both:
1. `public.assignments` in FschoolAI Production DB (operational data)
2. `fschool.assignments` in Brain DB (brain's academic view)

Or alternatively, `brain-context-window.ts` should read from FschoolAI Production DB for academic data.

---

## What Is Working Right Now

| Feature | Status |
|---|---|
| Canvas OAuth login | ✅ Working |
| Canvas data sync (courses, assignments, grades) | ✅ Working — 52 users, 84 courses, 926 assignments |
| Chat with brain (brain-chat-session) | ✅ Working |
| Post-session reflection | ✅ Working |
| Hypothesis engine | ✅ Working |
| Intervention engine | ✅ Working |
| Brain scheduler | ✅ Working |
| Agent routing (study, assignment, canvas, focus, citation) | ✅ Working |
| Signal ingestion | ✅ Working |
| Agent feedback | ❌ BROKEN — `brain_signals` table ref |
| Canvas → Brain signal emission | ❌ BROKEN — `brain_signals` table ref |
| Brain compounding (knowledge graph) | ❌ BROKEN — flat table refs |
| Context window pre-computation | ❌ Not running — `brain.context_window` empty |
| Academic deadlines in brain context | ❌ Not working — `fschool.assignments` empty |
| Canvas user ↔ Brain person mapping | ⚠️ Partial — `canvas_user_id` exists in `neuro.persons` but mapping logic needs verification |

---

## The Right Connection Architecture

```
Student logs in via Canvas OAuth
        │
        ▼
FschoolAI Backend looks up brain person:
  SELECT id FROM neuro.persons WHERE canvas_user_id = $canvasId
        │
        ▼
All brain operations use brain_person_id (UUID)
  - Chat: agents.sessions, agents.messages
  - Signals: brain.signals
  - Context: brain.context_window
  - Reflections: brain.reflections
        │
        ▼
Canvas data sync writes to TWO places:
  1. FschoolAI Production DB: public.assignments (operational)
  2. Brain DB: fschool.assignments (brain's academic view)
```

---

## Handoff Notes for Tech Intern

### What to build first (in order):

**Week 1 — Fix broken references**
1. Fix `agent-feedback.ts`: change `brain_signals` → `schema('brain').from('signals')`
2. Fix `canvas-sync-patch.ts`: same fix
3. Fix env vars: replace `VITE_SUPABASE_URL` with `FSCHOOL_SUPABASE_URL` in backend services
4. Add `BRAIN_SUPABASE_URL` and `FSCHOOL_SUPABASE_URL` as two separate env vars

**Week 2 — Populate the brain**
5. Add Canvas → Brain DB sync: after every Canvas sync, write to `fschool.assignments` in Brain DB
6. Start the brain scheduler: ensure `brain-scheduler.ts` runs on server start and populates `brain.context_window`
7. Verify Canvas user ↔ Brain person mapping works for all 52 users

**Week 3 — Performance**
8. Add database indexes (see neuroagi-core CURRENT_ARCHITECTURE.md)
9. Add in-memory cache for `brain.context_window` reads
10. Test chat response latency end-to-end

### What NOT to touch:
- `brain-chat-session.ts` — working correctly, do not change
- `brain-context-window.ts` — working correctly, do not change
- `brain-reflection-engine.ts` — working correctly, do not change
- `public.reggie_founding_record` — historical record, never delete
- Any data in `neuro.*`, `brain.signals`, `brain.reflections`, `agents.*` in Brain DB

### Architecture rule to always follow:
> FschoolAI owns the product. NeuroAGI Brain owns the person.  
> FschoolAI never stores intelligence. It only reads intelligence from the Brain and writes signals back.  
> The Brain never stores Canvas operational data. It only stores the brain's view of that data.
