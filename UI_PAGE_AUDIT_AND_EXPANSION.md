# FschoolAI — Complete UI Audit, Page Expansion, and Chat Spec
*Based on live inspection of neuro-agi.vercel.app — June 2026*

---

## The 7 Pages That Exist Right Now

### Navigation Map (Swipe-Based)
```
                    [IDENTITY]
                        ↕
[CANVAS] ←→ [WORK] ←→ [ASSIGNMENT]
                        ↓
                     [STUDY]

[TOOLKIT] ↕ WORK (down from work)
[LEADERBOARD] ←→ IDENTITY (right from identity)
```

---

### Page 1: WORK (Home)
**What is built:**
- Greeting: "Good morning, Vincent" + date + assignment count
- Upcoming assignments list with status (Overdue / Today / Tomorrow / In X days)
- Stats bar: GPA, Streak, Completed count
- Neural Ring button (bottom right) — opens the AI tutor chat

**What is missing / needs improvement:**
- GPA shows "—" (not connected to Brain DB grade data)
- Streak shows "0d" (not tracked)
- No AI-generated situation summary ("You have 3 overdue assignments and an exam in 2 days. Here's what matters most today.")
- Neural Ring click does not open chat panel visibly in current build (the panel exists in the bundle but may not be triggering correctly)

---

### Page 2: ASSIGNMENT
**What is built:**
- Full assignment list with due dates and status badges (Past due / Today / Tomorrow / In X days)
- 20 assignments showing across 4 courses
- Tap an assignment → opens detail with AI nudge (via `/api/monitor-agent`)

**What is missing:**
- "Help me start" button per assignment (calls AI to generate a starting outline)
- Grade prediction per assignment
- Submission timing intelligence ("You tend to submit GGRC assignments 2 days late")
- Filter by course is not visible

---

### Page 3: STUDY
**What is built:**
- Course selector dropdown (4 courses)
- Flashcards tab (empty — no flashcards generated yet)
- Study Guide tab (empty)
- "Study ✦" button (AI study session)
- "Add New Flashcards ✦" button (AI flashcard generation)

**What is missing:**
- Flashcard content (needs to be generated from uploaded notes or Canvas content)
- Study Guide content (needs AI generation from course materials)
- Study session timer / focus mode
- "Explain this concept" inline AI within flashcards

---

### Page 4: CANVAS
**What is built:**
- 4 courses listed with sync status ("Synced" badge)
- "7 missing" badge on GGRC25H3 (assignments not yet synced)
- Refresh button
- Past Courses section
- "+ Add manually" and "+ Add course manually" buttons

**What is missing:**
- Expanding a course to see its assignments inline
- Grade breakdown per course
- Professor profile ("This professor weights participation heavily")
- Missing assignments explanation ("7 missing — these were added after your last sync")

---

### Page 5: TOOLKIT
**What is built:**
- Knowledge Graph visualization (canvas-based, interactive dot graph)
  - Shows: Working Memory, Cognitive Load, Dynamic Prog., Memoization, Five Forces, Comp. Advantage, Linear ODEs, Int. Factor
  - Categorized by: PSYC, CS, BUS, MATH
  - "Tap or hover a concept to trace connections"
- 4 tabs: Notes, Recordings, Reminders, Submitted
- Per-course file upload sections (0 files each currently)
- "+ Upload" button per course

**What is missing:**
- Notes tab content (no notes uploaded)
- Recordings tab (no recordings)
- Reminders tab (no reminders set)
- Submitted tab (past submissions)
- The knowledge graph nodes are HARDCODED (Working Memory, Five Forces etc.) — they should be DYNAMIC, pulled from `neuro.patterns` in the Brain DB
- Upload flow needs to connect to the backend (currently likely hitting the intern's personal Supabase)

---

### Page 6: IDENTITY
**What is built:**
- Student name (editable — "Tap to edit name")
- Stats: GPA (3.87), Assignments (7), Streak (0d), Study Time (0h)
- Grade Trends chart (line chart per course over time)
- Course Performance bars (GGRC: 94%, MDSB: 94%, VPAC: 95%, UTSC: 74%)
- "Your Card" section — shareable student card with GPA, Streak, Study Time
- "Now Playing" music section with "Show on Leaderboard" toggle
- "Share Card 🖼️" button
- Sign Out button

**What is missing:**
- Brain insights ("You perform best in the morning", "Your writing quality improves under pressure")
- Intellectual portrait (what the brain knows about this student's learning style)
- Writing evolution tracker
- The "Now Playing" music is a nice touch but needs to actually connect to Spotify or similar

---

### Page 7: LEADERBOARD
**What is built:**
- University / City / Country / Continent / Global scope tabs
- GPA / Streak / Study Time sort tabs
- 11 students listed (University of Toronto)
- Vincent shown at rank 11 with "—" GPA
- Student names appear to be placeholder/test data (Aisha Kamara, Mei Lin, etc.)

**What is missing:**
- Real student data (all 11 are test/placeholder)
- Opt-in/opt-out privacy control (currently "Show on Leaderboard" toggle is on Identity page)
- Friends list / follow system (Aryan's Phase 1 feature)
- Study room access from leaderboard ("Study with Aisha →")

---

## The Chat (Neural Ring) — Full Capability Audit

### What It Does Right Now (from bundle analysis)

The Neural Ring is the most sophisticated part of the app. Here is exactly what it does:

**On open:**
1. Fetches last 10 `tutor_impressions` from Supabase (the intern's personal DB)
2. Fetches last chat messages from `chat_logs` table
3. Loads `ring_name` from user profile (the custom tutor name)

**On each message sent:**
1. Calls `/api/tutor-context` → fetches context about the user (assignments, brain state)
2. Calls `/api/claude` → sends message + context to Claude for response
3. Streams the response back with TTS via `/api/tts` (voice output)
4. Every 6 messages → calls `/api/self-write` → updates the tutor's understanding of the student
5. On close → calls `/api/session-close` → saves the session

**On assignment tap:**
- Calls `/api/monitor-agent` → generates a nudge/insight about that specific assignment

**Tables it reads/writes (currently on intern's personal Supabase):**
- `users` — student profile + ring_name
- `chat_logs` — message history
- `tutor_impressions` — AI impressions of the student
- `tutor_mind` — the tutor's evolving understanding
- `canvas_data` — Canvas assignments
- `courses` — course list
- `assignments` — assignment details
- `flashcards` — study flashcards
- `uploads` — uploaded files
- `beta_sessions` — session tracking
- `schools` — school data

### What the Chat Needs to Do (Expanded)

The current chat is a good foundation but it is **not yet compounding** because:
1. It reads from `tutor_impressions` and `chat_logs` in the intern's personal Supabase — not the Brain DB
2. `/api/tutor-context` likely returns shallow context, not the full `brain.context_window`
3. `self-write` updates `tutor_mind` in the personal DB, not `brain.signals` in the Brain DB

**What needs to change:**

| Current | Should Be |
|---|---|
| Reads `tutor_impressions` from personal DB | Reads `brain.reflections` from Brain DB |
| Reads `chat_logs` from personal DB | Reads `agents.messages` from Brain DB |
| Writes to `tutor_mind` | Writes to `brain.signals` (signal_type='self_model_update') |
| `/api/tutor-context` → shallow context | `/api/tutor-context` → reads `brain.context_window` |
| `/api/session-close` → saves to personal DB | `/api/session-close` → saves to `agents.sessions` + `agents.messages` in Brain DB |

**New capabilities the chat should have (not built yet):**

1. **Context awareness per page** — when student is on Assignment page and opens chat, the tutor already knows which assignment they were looking at and opens with "I see you're looking at Reflection 8 — want help starting it?"

2. **Proactive nudges** — tutor speaks first (not just responds). "You have an exam in 2 days and haven't started. Want to make a study plan?"

3. **Voice input** — student can speak to the tutor, not just type

4. **Artifact generation** — tutor can generate study guides, outlines, flashcard sets inline in the chat as interactive artifacts (the bundle already has artifact parsing code: `<artifact>` tags)

5. **Assignment mode** — when student taps "Help me start" on an assignment, the chat opens in assignment mode with the full assignment brief pre-loaded

6. **Study session mode** — when student starts a study session on the Study page, the chat becomes a Socratic tutor for that specific course

7. **Memory acknowledgment** — tutor references past conversations: "Last week you said you were struggling with ODEs — how did the exam go?"

---

## New Pages That Should Be Built

### NEW PAGE: SOCIAL / FRIENDS
**Why:** Aryan is already building this. It belongs between Identity and Leaderboard in the nav.
**Nav position:** Right of Identity, Left of Leaderboard
**What it contains:**
- Friends list (add by username or Canvas classmate)
- Friend's public stats (GPA, streak, study time — if they opted in)
- "Study together" button → creates a Study Room
- Activity feed ("Aisha completed 3 assignments today")

### NEW PAGE: ROOMS (Study Rooms)
**Why:** Aryan's Phase 2. Real-time collaborative study with peers + in-room AI tutor.
**Nav position:** Below Social, or accessible from Social page
**What it contains:**
- Active rooms list
- Create room (choose course, set focus topic)
- In-room: live presence, shared timer, chat, in-room AI tutor
- Post-session: brain signals written for social learning

### CONSIDER MERGING: TOOLKIT → split into two pages

The Toolkit page is doing two very different things:
1. **Knowledge Graph** (intellectual portrait of what the student knows)
2. **Files** (notes, recordings, uploads)

These should be separate:
- **BRAIN page** = Knowledge Graph + intellectual portrait + patterns from Brain DB
- **FILES page** = Notes, Recordings, Reminders, Submitted (within Toolkit or merged into Canvas)

The current Toolkit knowledge graph is hardcoded. The BRAIN page should pull live from `neuro.patterns` in the Brain DB and show the student's actual intellectual fingerprint.

### CONSIDER: ONBOARDING page (not a nav page, a one-time flow)
**Why:** First-time students need to:
1. Name their AI tutor
2. Connect Canvas
3. See a brief explanation of what the brain does
This should be a 3-step onboarding flow that runs once on first login, then never again.

---

## Summary: What the Team Needs to Build

### Immediate (before launch)
| Item | Page | Type |
|---|---|---|
| Wire chat to Brain DB (not personal Supabase) | All pages | Backend |
| Wire `/api/tutor-context` to `brain.context_window` | Chat | Backend |
| Wire `/api/session-close` to `agents.sessions` + `agents.messages` | Chat | Backend |
| Make knowledge graph dynamic (pull from `neuro.patterns`) | Toolkit | Frontend |
| Fix GPA and Streak to show real data | Work, Identity | Frontend |
| Tutor naming onboarding flow | New | Frontend |
| Run SQL migration (add brain_person_id to users table) | — | DB |

### Phase 1 (first 2 weeks after launch)
| Item | Page | Type |
|---|---|---|
| "Help me start" button per assignment | Assignment | Frontend + Backend |
| Flashcard generation from course materials | Study | Frontend + Backend |
| Study Guide generation | Study | Frontend + Backend |
| Context-aware chat opening (knows which page student is on) | Chat | Frontend |
| Proactive nudges from tutor | Chat | Backend |
| Friends page | New | Frontend + Backend (Aryan) |

### Phase 2 (weeks 3-4)
| Item | Page | Type |
|---|---|---|
| Study Rooms with real-time presence | New | Frontend + Backend (Aryan) |
| In-room AI tutor | Rooms | Backend |
| Brain page (dynamic knowledge graph from neuro.patterns) | New | Frontend |
| Voice input for chat | Chat | Frontend |
| Artifact generation in chat (study guides, outlines) | Chat | Frontend |
| Professor intelligence per course | Canvas | Backend |

### Phase 3 (post-launch)
| Item | Page | Type |
|---|---|---|
| Lecture recording + transcription | Toolkit/Files | Backend |
| Writing intelligence (draft analysis) | Assignment | Backend |
| Memory acknowledgment in chat | Chat | Backend |
| Shareable student card (already partially built) | Identity | Frontend |
| Spotify integration for "Now Playing" | Identity | Frontend |
