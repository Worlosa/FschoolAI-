# FschoolAI — Product Requirements Document (PRD)
**Version:** 1.3  
**Date:** June 24, 2026  
**Author:** Vincent Yang, FschoolAI  
**Audience:** Engineering team — Tencent engineer, Bytedance engineer, Aryan, Ryan, Vincent

---

## 1. Product Vision

FschoolAI is the **personal academic intelligence** for every student. It is not a generic AI chatbot. It is not a homework helper. It is a persistent, living brain that knows each student individually — their learning style, their knowledge gaps, their deadlines, their stress level, their history — and uses that knowledge to help them from where they are to where they need to be.

The core principle is: **the AI adapts to the student, not the student to the AI.**

Every student is unique. A student at Carleton studying engineering has different gaps, different pressures, and different ways of learning than a student at UCLA studying pre-med. FschoolAI treats each student as a unique individual, not a user type.

At signup, a **student second brain** is created for each user. This brain is theirs. It grows with every session — every question asked, every assignment completed, every lecture attended. When NeuroAGI hardware launches, the student claims their brain on the device. Until then, the brain lives in the cloud and is accessible through FschoolAI.

---

## 2. Target Users

FschoolAI is built for university and college students globally, with initial focus on North America. The product must be immediately useful to an international student who is not a native English speaker, a first-generation university student with no academic support network, and a high-achieving student who wants to go beyond what their institution provides.

The product must be so useful that students are willing to pay for it personally — not wait for their school to buy it.

---

## 3. Core Architecture

### 3.1 The Student Brain

Every student has a brain object stored in the NeuroAGI brain layer. This is a persistent, structured knowledge graph about the student. It is the foundation that every agent reads from and writes to.

```
StudentBrain {
  student_id: string
  learning_style: "visual" | "auditory" | "reading" | "kinesthetic" | "mixed"
  knowledge_nodes: KnowledgeNode[]       // what the student knows and gaps
  course_context: CourseContext[]        // current courses, assignments, deadlines
  stress_level: float (0.0–1.0)         // inferred from behaviour patterns
  session_history: Session[]            // all past interactions
  performance_signals: Signal[]         // quiz scores, time-on-task, confusion events
  preferences: Preferences              // communication style, response length, language
  upcoming_deadlines: Deadline[]        // from Canvas sync
  created_at: timestamp
  last_updated: timestamp
}
```

### 3.2 Agent Architecture

There are two distinct agent patterns. Using the wrong pattern for a given agent is a design error.

**Pattern A — Request/Response (interactive agents)**
Used by: Reggie, Tutor, Canvas, Planner, Lecture, Library, Exam Mode, Audio, Office Hours, Calendar, Terminal.

```
Step 1:  context = brain.read(student_id)
Step 2:  result  = agent_logic(user_input, context)
Step 3:  brain.write(student_id, signal)
```

**Pattern B — Watch/Arbitrate/Deliver (background/proactive agents)**
Used by: Intervention Agent, Reflection Agent, Cohort Agent.
These agents do NOT wait for user input. They watch for events or run on schedule, evaluate whether an intervention is worth sending, and deliver through the Signal Arbiter.

```
Step 1:  watch  — subscribe to brain_signals via Supabase Realtime OR run on cron schedule
Step 2:  evaluate — compute whether an intervention candidate is worth creating
Step 3:  arbitrate — write candidate to proactive_signals queue (Signal Arbiter decides delivery)
```

Agents do not store state themselves. All state lives in the brain. This means any agent can be replaced or upgraded without losing the student's history.

### 3.3 Phase 1 — Mock Brain (Build Now)

During Phase 1, agents use a local mock context object instead of calling the NeuroAGI brain API. This allows all agents to be built and tested immediately without waiting for the brain layer.

```json
{
  "student_id": "mock_001",
  "learning_style": "visual",
  "knowledge_gaps": ["integration by parts", "organic mechanisms"],
  "stress_level": 0.6,
  "upcoming_deadlines": [
    { "course": "CHEM 201", "assignment": "Lab Report 3", "due": "2026-06-25" }
  ],
  "preferred_language": "en",
  "session_count": 14
}
```

### 3.4 Phase 2 — Live Brain (After Ryan's API is ready)

Replace the mock context with:

```typescript
const context = await brain.read(student_id)
// ... agent logic ...
await brain.write(student_id, signal)
```

No other change to any agent is required.

### 3.5 Proactivity Infrastructure

This section defines the infrastructure that allows FschoolAI to act on behalf of the student without waiting for them to open the app. It is the backbone of all background and proactive agents.

#### 3.5.1 Trigger / Event Runtime

Two mechanisms fire background agents. Both must be implemented.

**Event-driven (real-time):** Supabase Realtime listens for `INSERT` events on the `brain_signals` table via `pg_notify`. When a new signal is written (e.g., Canvas Agent writes a `stress_signal` after detecting 3 deadlines in 48 hours), the event runtime fires the relevant background agents immediately. A grade posted at 3pm cannot wait until the 2am Reflection run — it must trigger the Intervention Agent within minutes.

**Scheduler (cron):** Time-based triggers for agents that need to run on a fixed schedule regardless of events. Examples: Reflection Agent at 2am nightly, Canvas sync every 6 hours, spaced-repetition reminders at the student's preferred study time.

```typescript
// Event-driven trigger (Supabase Realtime)
supabase
  .channel('brain_signals')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'brain_signals' }, 
    (payload) => triggerRuntime.dispatch(payload))
  .subscribe()

// Cron trigger (example)
cron.schedule('0 2 * * *', () => reflectionAgent.runForAllStudents())
```

#### 3.5.2 Signal Arbiter

The Signal Arbiter is the most important missing piece in a naive proactive system. Without it, multiple background agents fire simultaneously and the student receives a flood of notifications that they immediately disable.

**How it works:**
1. Every background agent that wants to reach the student writes a **candidate signal** to the `proactive_signals` queue — it does NOT send a notification directly.
2. The Arbiter is **triggered by writes to `proactive_signals`**, not by a polling cron. When a new candidate is written for a student, a 2–3 minute debounce window opens. Any additional candidates for the same student written within that window are batched together. After the window closes, the Arbiter runs once for that student's batch.
3. For each student batch, it reads all pending candidates, then:
   - **Deduplicates** — removes redundant candidates (e.g., two agents both flagging the same deadline)
   - **Ranks** — scores each candidate by `urgency × value`. Urgency = time sensitivity. Value = estimated benefit to the student.
   - **Enforces rate limits** — maximum 3 proactive messages per student per day. Maximum 1 per hour.
   - **Enforces quiet hours** — no delivery between 11pm and 8am unless the student has overridden this.
   - **Selects** — approves the top-ranked candidate(s) and writes them to `notification_queue`.
4. Rejected candidates are discarded or deferred to the next cycle.
5. A **low-frequency safety sweep cron** (once per hour) scans for candidates whose `expires_at` has passed without being processed — this handles edge cases where the event trigger was missed. It does NOT process all students on every run.

The Arbiter is the confidence gate. Nothing reaches the student without passing through it.

**Implementation note:** The debounce is implemented as a short-lived lock per `student_id` in Redis or Supabase. On the first write for a student, set a lock with a 2-minute TTL and schedule the Arbiter run. Subsequent writes within the TTL extend the window by 1 minute (max 3 minutes total). This prevents the all-students sweep that a polling cron would require at scale.

#### 3.5.3 Delivery Layer

Approved notifications in `notification_queue` are delivered through one of four channels based on urgency and student preference:

| Channel | When to use | Service |
|---|---|---|
| In-app banner | Student is active in the app | Supabase Realtime push to frontend |
| Push notification | Student has app installed, not currently active | Firebase Cloud Messaging (FCM) |
| SMS | High-urgency, student not reachable by push | Twilio SMS API |
| Email | Low-urgency summaries, weekly reports | Resend or SendGrid |

**Delivery tracking:** Every notification records `delivered_at`, `opened_at`, and `action_taken` (did the student act on it?). This data feeds the effectiveness feedback loop.

**Quiet hours:** Configurable per student. Default: no delivery 11pm–8am. SMS is never sent during quiet hours regardless of urgency.

#### 3.5.4 Effectiveness Feedback Loop

The hard-coded thresholds in the Intervention Agent (stress > 0.8, 3+ sessions, etc.) are starting values only. They must be tuned per student over time.

**Mechanism:**
- Every `intervention_accepted` signal (student engaged with the notification) is a positive label.
- Every `intervention_delivered` with no action within 2 hours is a negative label.
- After 20 labelled examples per student, the system adjusts that student's thresholds: if they consistently ignore stress-level interventions but respond to deadline interventions, the stress threshold is raised and the deadline threshold is lowered.
- Per-channel tuning: if a student never opens push notifications but always responds to SMS, the delivery layer learns to prefer SMS for that student.

#### 3.5.5 Cold-Start Mode

On Day 1, the brain is empty. Behavioural triggers (stress level, confusion patterns, session history) have no data to fire on. The system must not be silent on Day 1.

**Degraded mode (Day 1 through Day 7):**
- **Deadline-based proactivity is available immediately** — Canvas data is synced at signup. The Intervention Agent can fire deadline reminders from the first hour.
- **Behavioural proactivity is gated** — stress level, confusion detection, and pattern-based triggers are disabled until a baseline exists (minimum: 5 sessions + 7 days of data).
- **Learning style proactivity is gated** — adaptive explanation format is set to a neutral default until the learning style assessment is complete.

The UI must not show empty states as errors. During cold-start, show: "I'm learning how you work. The more you use FschoolAI, the more personalised I become."

### 3.6 Graph-Dependent Behaviours — Gated on Live NeuroAGI Brain

**Critical distinction:** The `StudentBrain` schema in §3.1 describes a typed knowledge graph with `knowledge_nodes`, prerequisite edges, and confidence scores. The Phase 1 mock brain (§3.3) and the `brain_context` Supabase table are flat JSON — a `knowledge_gaps` array and a `stress_level` float. These are not the same thing.

The following behaviours **require the live NeuroAGI graph brain** and are **not buildable in Phase 1** with the flat mock:

| Behaviour | Why it needs the graph | Phase 1 fallback |
|---|---|---|
| Prerequisite checking ("do they understand the product rule before integration by parts?") | Requires typed prerequisite edges between knowledge nodes | Tutor Agent checks for prerequisite by asking the student directly: "Before I explain this, do you know X?" |
| "Prerequisite mastered > 0.85" positive trigger (Intervention Agent) | Requires per-node confidence scores from the graph | **Disable this trigger in Phase 1.** Remove from the Intervention Agent's trigger table until the live brain is available. |
| Knowledge node decay (concepts not revisited in 30+ days lose confidence) | Requires per-node confidence scores and last-reviewed timestamps | Reflection Agent skips decay in Phase 1. Flat mock does not track per-concept recency. |
| Cross-course knowledge graph visualisation (Max tier) | Requires the full graph structure | Defer to Phase 2. Show a placeholder in the Max tier dashboard. |

**Schedule warning:** §8 lists "Replace mock brain with live NeuroAGI API" as a Week 6 task. This is aspirational, not a firm dependency. The NeuroAGI brain is an active research stack — the graph layer, multi-hop traversal, and confidence scoring are not guaranteed to be production-ready on a fixed date. All agents must be designed to function with the flat mock indefinitely. The Phase 2 brain swap is a progressive enhancement, not a hard launch blocker.

**For Ryan:** The flat mock is the contract. Any behaviour that requires more than `learning_style`, `knowledge_gaps[]`, `stress_level`, `upcoming_deadlines[]`, `preferred_language`, and `session_count` must be explicitly flagged as graph-dependent and gated. Do not design agent logic that silently breaks when the graph is unavailable.

---

## 4. Agent Specifications

### Agent 1 — Reggie (Orchestrator)

**Owner:** Vincent  
**Environment:** All — Reggie is the entry point for every student interaction  
**Priority:** P0 — must be built first, all other agents depend on it

**What it does:** Reggie receives the student's message, reads the brain context, decides which specialist agent to call, passes the message and context to that agent, and returns the response to the student. Reggie is the router and the face of FschoolAI.

**Input:** Student message (text, voice, image)  
**Output:** Response from the appropriate specialist agent

**Routing logic:**

| Student message type | Routes to |
|---|---|
| "Explain this concept" / "I don't understand X" | Tutor Agent |
| "What do I have due?" / "Show my schedule" | Canvas Agent + Planner Agent |
| "Help me study for my exam" | Exam Mode Agent |
| "Make a study plan for this week" | Planner Agent |
| "Summarise this lecture" | Lecture Agent |
| "Find me resources on X" | Library Agent |
| "I'm stressed / overwhelmed" | Intervention Agent |
| "Translate this" | Audio Agent |
| Ambiguous | Reggie asks one clarifying question, then routes |

**Brain signals written after each session:**
- `session_type`: what kind of help was requested
- `session_duration`: how long the session lasted
- `topics_discussed`: list of subjects covered

---

### Agent 2 — Canvas Agent

**Owner:** Aryan  
**Environment:** Canvas LMS integration  
**Priority:** P0 — foundational data source for all other agents

**What it does:** Connects to the student's Canvas account via OAuth. Syncs all courses, assignments, due dates, grades, and syllabus documents. Stores this data in FschoolAI's Supabase database. Alerts the student about upcoming deadlines and missing work.

**Canvas data pulled:**
- All enrolled courses (current semester)
- All assignments per course (title, due date, points, submission status)
- All grades (current score, letter grade, course average)
- Syllabus documents (PDF/HTML)
- Announcement feed
- Professor contact information

**Sync schedule:** Every 6 hours automatically. On-demand when student opens FschoolAI.

**Alerts generated:**
- Assignment due in less than 24 hours — push notification
- Assignment due in less than 72 hours — in-app banner
- Grade posted — in-app notification
- Missing assignment — weekly summary

**Brain signals written:**
- `course_list`: current courses
- `upcoming_deadlines`: next 14 days of assignments
- `grade_summary`: current standing per course
- `stress_signal`: if 3+ assignments due within 48 hours → stress_level += 0.2

**Syllabus lookahead (required):** After syncing the syllabus, the Canvas Agent must extract the weekly topic schedule from the syllabus document and store it as structured data in `course_content`. This enables the Planner Agent and Tutor Agent to know what topics are coming up in the next 1–2 weeks — not just what is due, but what will be taught. The Intervention Agent can then fire a proactive trigger: "You have stereochemistry coming up in CHEM 201 next week and your brain shows a gap there. Want to review it now?" Without syllabus lookahead, proactive preparation is impossible.

**Bring-your-own past material:** Students who transfer from another institution or who have past course materials (notes, old exams, textbooks) can upload them to FschoolAI. The Canvas Agent is not responsible for this — it is a separate upload flow in the UI. Uploaded materials are stored in `course_content` with `source = 'student_upload'` and are available to the Tutor Agent and Lesson Generator as grounding context. This is a Phase 1 feature — do not defer it to Phase 2.

**Note for Aryan:** Canvas uses OAuth 2.0. The student authorises FschoolAI to read their Canvas data. FschoolAI never stores the Canvas password. The Canvas API token is stored encrypted in Supabase.

---

### Agent 3 — Tutor Agent

**Owner:** Tencent engineer  
**Environment:** Chat / Study Session  
**Priority:** P0 — core product, primary reason students pay

**What it does:** This is the heart of FschoolAI. The Tutor Agent answers academic questions, explains concepts, identifies what the student does not understand, and adapts its explanation style to the student's learning profile. It does not just answer — it teaches.

**Key behaviours:**

**Adaptive explanation:** The Tutor Agent reads the student's learning style from the brain and adjusts its response format accordingly.

| Learning style | Response format |
|---|---|
| Visual | Diagrams described in text, tables, step-by-step with visual structure |
| Auditory | Conversational, narrative, "imagine you are explaining to a friend" |
| Reading | Dense text, definitions, citations, structured paragraphs |
| Kinesthetic | Examples first, then theory, "try this yourself" prompts |

**Knowledge gap detection:** When the student asks a question, the Tutor Agent identifies whether the question reveals a deeper gap. If the student asks "why does integration by parts work?", the agent checks whether they understand the product rule first. If not, it teaches the prerequisite before answering the original question.

**Socratic mode:** For questions that are clearly graded homework or exam questions, the Tutor Agent does not give the answer directly. It asks guiding questions that lead the student to the answer themselves. **This is NOT configurable for graded assignments** — the student cannot turn off Socratic mode for questions that are identifiable as graded work (i.e., the question matches an open assignment in Canvas with a future due date). Socratic mode can be turned off only for practice problems, past assignments, and conceptual questions that are not tied to a graded deliverable. This is an academic integrity guardrail, not a preference setting.

**Simplification levels:** Content must be adjustable to the student's level. International students and students who are not native English speakers need simpler language. The agent detects this from the student's communication style and adjusts automatically.

**Input:** Student question (text or image of problem)  
**Output:** Explanation, worked example, follow-up question, or resource recommendation

**Brain signals written:**
- `topic_studied`: subject and concept
- `confusion_detected`: boolean — did the student express confusion?
- `gap_identified`: specific knowledge gap found
- `session_quality`: inferred from follow-up questions and engagement
- `explanation_format_used`: which format was used, for future optimisation

---

### Agent 4 — Planner Agent

**Owner:** Bytedance engineer  
**Environment:** Study Planner / Dashboard  
**Priority:** P1

**What it does:** Builds personalised weekly study schedules based on the student's deadlines, available time, subject difficulty, and current stress level. The plan is not generic — it is specific to this student's brain context.

**Planning inputs (all from brain context):**
- Upcoming deadlines (from Canvas Agent)
- Current stress level
- Knowledge gaps (which subjects need more time)
- Historical study patterns (when does this student actually study?)
- Student's stated available hours

**Plan output format:**

```
Monday June 23:
  9:00–10:30  CHEM 201 — Stereochemistry review (gap identified)
  14:00–15:00 MATH 204 — Practice integration by parts (gap identified)
  19:00–20:00 Essay outline for ENGL 301 (due June 26)

Tuesday June 24:
  ...
```

**Adaptive replanning:** If the student misses a study block, the Planner Agent detects this (no activity during scheduled time) and automatically reschedules the missed work into the next available slot. It does not nag — it silently adjusts.

**Brain signals written:**
- `study_plan_created`: date and week covered
- `plan_adherence`: percentage of planned blocks completed
- `reschedule_count`: how many times the plan was adjusted

---

### Agent 5 — Lecture Agent

**Owner:** Aryan  
**Environment:** Chrome Extension / In-class  
**Priority:** P1

**What it does:** Captures lecture audio through the Chrome extension, transcribes it in real time, generates a structured summary, identifies key concepts, and creates flashcards and quiz questions from the lecture content. The student gets a complete lecture package within minutes of the lecture ending.

**Lecture package output:**
- Full transcript (searchable)
- Summary (3–5 key points)
- Concept list (terms defined)
- Flashcard set (auto-generated)
- 5 quiz questions (multiple choice + short answer)
- Connections to existing brain knowledge ("This concept relates to what you studied last week in CHEM 201")

**Note for Aryan:** The Chrome extension captures audio from the student's microphone (in-class) or from a browser tab (online lecture). Audio is processed via Whisper. The transcript and summary are stored in Supabase and linked to the student's brain.

**Brain signals written:**
- `lecture_attended`: course, date, duration
- `concepts_introduced`: list of new concepts from this lecture
- `lecture_summary_generated`: boolean

---

### Agent 6 — Library Agent

**Owner:** Bytedance engineer  
**Environment:** Resource Library  
**Priority:** P2

**What it does:** When the student needs resources — textbook chapters, academic papers, YouTube explanations, practice problems — the Library Agent finds and curates them. It does not return a generic Google search. It returns resources matched to the student's learning style, current knowledge level, and specific gap.

**Search behaviour:**
- Reads the student's learning style from brain context
- Reads the specific knowledge gap being addressed
- Returns 3–5 resources ranked by relevance and quality
- Includes a one-sentence explanation of why each resource was chosen

**Resource types:**
- Khan Academy videos (visual learners)
- Academic papers (reading learners)
- Practice problem sets (kinesthetic learners)
- Podcast episodes / audio explanations (auditory learners)
- YouTube explanations (all types)

**Brain signals written:**
- `resource_recommended`: resource type and topic
- `resource_clicked`: whether the student opened the resource

---

### Agent 6b — Lesson Generator (Brain-Grounded Video)

**Owner:** Aryan (pipeline) + Tencent engineer (script generation)  
**Environment:** Max tier only — gated at $20/month  
**Priority:** P2 (Phase 1 Max tier launch feature)

**What it does:** Generates a short personalised video lesson (2–4 minutes) for a specific concept the student is struggling with. This is not a generic explainer video. The script is built entirely from the student's brain context — their specific knowledge gap, their lecture transcript for the relevant course, their syllabus, and the professor's terminology. "A video built from your CHEM 201 lecture and the exact step you got wrong twice" is the product. A generic explainer is a commodity.

**Brain-grounded script generation (required, not optional):**
The script generator must use all of the following as input context:
- The student's specific knowledge gap (from `brain_context.knowledge_gaps`)
- The lecture transcript for the relevant course (from Lecture Agent output)
- The course syllabus (from Canvas Agent)
- The professor's terminology and examples (extracted from lecture transcript)
- The student's learning style (from `brain_context.learning_style`)
- The specific question or problem the student got wrong (from `session_history`)

A script generated without this context is not acceptable. If the lecture transcript is not available, the Lesson Generator must prompt the student to record a lecture first before generating the video.

**Pipeline (async):**
```
Step 1:  Script generation — GPT-4o/Claude Sonnet, brain-grounded (30–60 seconds)
Step 2:  Animation/visual generation — Manim or similar (60–120 seconds)
Step 3:  TTS voiceover — ElevenLabs (10–20 seconds)
Step 4:  Render and stitch (30–60 seconds)
Step 5:  Deliver via notification_queue: "Your CHEM 201 stereochemistry video is ready"
```

**Async delivery (required):** Video generation takes 2–5 minutes end-to-end. This breaks the 3-second NFR in §9. Video generation is explicitly exempt from the 3-second NFR. The student triggers generation and receives a notification when the video is ready. The UI shows a progress indicator. Latency budget: < 5 minutes from trigger to delivery notification.

**Segment-level regeneration:** The pipeline must be chunked so a single segment can be re-run without rebuilding the whole video. The decision for Phase 1 is: **pre-generated branching** (cheaper, faster to build). The script is divided into 3–5 segments. Each segment is rendered independently. When the student requests a change ("explain this part differently"), only the relevant segment is re-generated and re-rendered. True segment regeneration (re-running the full pipeline for one segment) is the Phase 2 upgrade.

**Cohort amortisation (cost control):** When the Cohort Agent detects that 10+ students in the same course section are confused about the same concept, it triggers a shared video generation job. The core asset (script + animation + voiceover) is generated once. The personalisation layer (intro referencing the student's specific mistake, outro referencing their next deadline) is generated per-student. This reduces the per-video cost from ~$1.00 to ~$0.15 for cohort-triggered videos. The Lesson Generator must support a `cohort_mode: true` flag that separates the core asset generation from the personalisation layer.

**Brain signals written:**
- `video_generated`: concept, course, duration
- `video_watched`: boolean, percentage watched
- `video_segment_regenerated`: which segment was re-run

---

### Agent 7 — Exam Mode Agent

**Owner:** Vincent  
**Environment:** Exam Preparation  
**Priority:** P1

**What it does:** When the student has an exam coming up, Exam Mode Agent creates a personalised exam preparation plan. It identifies the highest-priority topics based on the student's knowledge gaps, generates practice questions, simulates exam conditions, and tracks progress toward exam readiness.

**Exam prep flow:**
1. Student says "I have an exam in CHEM 201 in 3 days"
2. Agent reads brain context: knowledge gaps, past quiz performance, time available
3. Agent generates a 3-day prep plan prioritising the student's weakest areas
4. Agent generates 20 practice questions (mix of difficulty levels)
5. Student completes practice questions — agent evaluates answers
6. Agent updates the plan based on performance: if student struggles with topic X, add more practice on X
7. Day before exam: final review summary — "You are strong on A and B. Focus your last hour on C."

**Brain signals written:**
- `exam_prep_started`: course and exam date
- `practice_questions_completed`: count and score
- `exam_readiness_score`: 0–100 estimated readiness
- `weak_areas_at_exam_time`: final gap list before exam

---

### Agent 8 — Intervention Agent

**Owner:** Vincent  
**Environment:** Background monitor  
**Priority:** P1

**Agent pattern:** Pattern B (Watch/Arbitrate/Deliver). This agent does not respond to user input — it watches `brain_signals` and writes candidates to the Signal Arbiter.

**What it does:** Runs silently in the background. Monitors the student's stress signals, deadline proximity, and engagement patterns. When it detects a student who is overwhelmed, falling behind, or disengaged, it intervenes proactively. It also fires on positive opportunity triggers — not just problems.

**Negative intervention triggers (problems):**

| Signal | Threshold | Intervention |
|---|---|---|
| Stress level | > 0.8 | "You have 3 assignments due in 48 hours. Want me to build a plan?" |
| No study activity | 3+ days before deadline | "Your essay is due in 3 days and I haven't seen you work on it. Want to start now?" |
| Repeated confusion on same topic | 3+ sessions | "You've asked about integration by parts 3 times. Let me try a different explanation." |
| Grade drop | > 10% below course average | "Your CHEM 201 grade dropped this week. Want to review what was covered?" |
| Late night pattern | Study sessions after 1am for 3+ nights | "You've been studying late. A 20-minute review now is more effective than 2 hours at midnight." |

**Positive opportunity triggers (advancement):**

| Signal | Condition | Intervention |
|---|---|---|
| Free study block + quiz tomorrow | Calendar gap detected + assignment due < 24h | "You have 90 free minutes at 3pm and a quiz tomorrow. Want to do a quick review now?" |
| Prerequisite mastered | Brain confidence score on prerequisite > 0.85 | "You've got the product rule down. Ready to tackle integration by parts?" |
| Spaced-repetition due | Concept last reviewed > 7 days ago + exam within 14 days | "It's been 8 days since you reviewed stereochemistry. A 10-minute refresher now will stick better than cramming." |
| Streak opportunity | Student studied 4 days in a row | "4-day streak. One more session today and you'll have your best week this semester." |

**Stress level cap and escalation path (required):**
The Intervention Agent must not escalate indefinitely. If a student's stress level exceeds 0.9 for 3+ consecutive days and the student has not engaged with any intervention, the agent must:
1. Stop sending stress-related notifications (the student is clearly not responding — more notifications make it worse)
2. Show a single in-app message on next open: "It looks like you're going through a tough week. FschoolAI is here when you're ready. Here are some campus mental health resources."
3. Write `stress_escalated: true` to the brain and suppress all stress-triggered notifications for 48 hours
4. After 48 hours, reset to normal monitoring

The agent must never imply a clinical diagnosis, never use the word "anxiety" or "depression", and never suggest the student is failing. Language must be supportive and non-judgmental. The campus mental health resource link is configurable per institution.

**Important:** All triggers — positive and negative — write to the `proactive_signals` queue. The Signal Arbiter (§3.5.2) decides what actually reaches the student. This agent does not send notifications directly.

**Brain signals written:**
- `intervention_triggered`: type and trigger (positive or negative)
- `intervention_accepted`: boolean — did the student engage with the intervention?

---

### Agent 9 — Audio Agent

**Owner:** Aryan  
**Environment:** Audio / Multilingual  
**Priority:** P2

**What it does:** Handles all audio-related tasks. Transcribes lecture recordings, translates content into the student's preferred language, converts text explanations to audio for auditory learners, and processes voice input from the student.

**Capabilities:**
- Speech-to-text (Whisper) — transcribe any audio file or live recording
- Text-to-speech — read explanations aloud
- Translation — translate lecture content, study materials, or AI responses into the student's language
- Language detection — automatically detects the student's preferred language from their messages

**Supported languages (Phase 1):** English, Mandarin Chinese, Hindi, French, Spanish, Arabic

**Brain signals written:**
- `preferred_language`: detected from student's messages
- `audio_sessions`: count of audio-mode interactions

---

### Agent 10 — Office Hours Agent

**Owner:** Tencent engineer  
**Environment:** Office Hours Preparation  
**Priority:** P2

**Academic integrity guardrail — writing feedback only:**
When a student asks for help with a written assignment (essay, report, lab write-up), this agent and the Tutor Agent must provide **feedback and suggestions only — not rewritten text**. Specifically:
- The agent may identify structural weaknesses: "Your thesis statement is unclear — it does not state a position."
- The agent may suggest what to improve: "Your second paragraph lacks a topic sentence."
- The agent may NOT rewrite sentences, paragraphs, or sections for the student.
- The agent may NOT generate a full outline and then write content for each section.
- The agent may generate a **blank structural scaffold** (section headings only, no content) to help the student organise their own writing.

This guardrail applies to all written assignments tied to an open Canvas assignment with a future due date. For past assignments or practice writing, the restriction is lifted.

**What it does:** Helps the student prepare for and follow up on professor office hours. Before office hours, it generates a list of specific questions based on the student's knowledge gaps. After office hours, it helps the student record what was discussed and updates the brain with new knowledge.

**Pre-office hours flow:**
1. Student says "I have office hours with Professor Chen in 30 minutes"
2. Agent reads brain context: current gaps in the relevant course
3. Agent generates 3–5 specific, well-formed questions to ask the professor
4. Agent briefs the student: "Here is what you should ask and why"

**Post-office hours flow:**
1. Student says "Office hours just ended"
2. Agent asks: "What did you learn? What was clarified?"
3. Student describes what happened
4. Agent updates the brain: gaps closed, new concepts added

**Brain signals written:**
- `office_hours_attended`: course and professor
- `questions_prepared`: list of questions generated
- `gaps_closed`: knowledge gaps resolved in the session

---

### Agent 11 — Calendar Agent

**Owner:** Bytedance engineer  
**Environment:** Calendar Integration  
**Priority:** P2

**What it does:** Integrates with Google Calendar and Apple Calendar. Reads the student's existing schedule (classes, work, commitments) and uses this to make the Planner Agent's study plans realistic. It also writes study blocks back to the student's calendar.

**Calendar reads:**
- Class schedule (recurring events)
- Work shifts
- Social commitments
- Existing study blocks

**Calendar writes:**
- Study blocks generated by Planner Agent
- Exam dates (from Canvas)
- Assignment deadlines (from Canvas)

**Brain signals written:**
- `available_hours_per_day`: calculated from calendar gaps
- `calendar_connected`: boolean

---

### Agent 12 — Reflection Agent

**Owner:** Ryan (NeuroAGI)  
**Environment:** Background — runs nightly  
**Priority:** P1

**What it does:** This agent runs every night at 2am for each student. It reviews the day's interactions, synthesises patterns, updates the brain graph, decays stale knowledge nodes, and prepares the brain for the next day. This is the agent that makes the brain smarter over time.

**Nightly tasks:**
- Review all signals written by other agents during the day
- Update knowledge gap confidence scores (did the student show improvement?)
- Decay old knowledge nodes (concepts not revisited in 30+ days lose confidence)
- Identify new patterns (e.g., "student consistently struggles on Mondays after weekend")
- Update stress level based on weekly trajectory
- Generate a "brain health summary" for the student (optional, shown in dashboard)

**Note:** This agent lives inside NeuroAGI, not FschoolAI. Ryan owns it. FschoolAI agents do not call it directly — it runs automatically on the NeuroAGI brain layer.

---

### Agent 13 — Terminal Agent

**Owner:** Vincent  
**Environment:** Developer / Power User Mode  
**Priority:** P3

**What it does:** For advanced students who want to query their own brain directly, run custom workflows, or inspect their data. Think of it as a command-line interface to the student's brain.

**Example commands:**
```
> show my knowledge gaps in CHEM 201
> what topics have I studied this week?
> export my study history as CSV
> set my learning style to visual
> show my stress level trend this month
```

**Brain signals written:**
- `terminal_commands_used`: list of commands executed

---

### Agent 14 — Cohort / Collective Intelligence Agent

**Owner:** Ryan (NeuroAGI) + Vincent (FschoolAI integration)  
**Environment:** Background — runs on event trigger (new confusion signals) and nightly  
**Priority:** P2 — requires canonical entity layer and k-anonymity minimum before activation

**Agent pattern:** Pattern B (Watch/Arbitrate/Deliver). This agent is a **producer into the Signal Arbiter** — its outputs fan out to each cohort member's Intervention Agent and Planner Agent. It does not communicate with students directly.

**What it does:** Aggregates anonymised, de-identified learning signals across students in the same course section. Identifies concept gaps that are widespread in the cohort. Surfaces targeted review recommendations to each individual student based on what their cohort is struggling with collectively.

**The core insight:** If 15 students in one section hit confusion on the same concept this week, that is a *leading* signal available immediately — grades are lagging, sparse, and privacy-sensitive. Confusion clustering is the right signal to build on first.

**What it does NOT do:**
- It does not aggregate grades or grade distributions (privacy-hot, consent-gated, Phase 3 only)
- It does not make claims about professor performance — never "your prof's test was unfair"
- It does not show individual student data to other students — ever
- It does not operate on cohorts smaller than 10 students (k-anonymity minimum)

**Canonical entity layer (required prerequisite):**
Today the `courses` table is keyed by `student_id`, so the same Canvas course is N separate rows with no way to aggregate across them. Before this agent can function, a canonical entity layer must be built:

```sql
-- Canonical course — shared across all students in the same Canvas instance
canonical_courses (
  id                uuid PRIMARY KEY,
  institution_id    text,              -- e.g., "carleton.ca"
  canvas_course_id  text,              -- Canvas's own course ID (shared across students)
  course_name       text,
  semester          text,
  UNIQUE(institution_id, canvas_course_id)
)

-- Canonical assignment — shared across all students in the same course
canonical_assignments (
  id                    uuid PRIMARY KEY,
  canonical_course_id   uuid REFERENCES canonical_courses(id),
  canvas_assignment_id  text,
  title                 text,
  due_date              timestamp,
  UNIQUE(canonical_course_id, canvas_assignment_id)
)
```

Cohorts are grouped by `(institution_id, canvas_course_id)`. These IDs are shared across students in the same Canvas instance.

**Concept taxonomy (required prerequisite — harder than the canonical course layer):**
The confusion clustering algorithm joins on `concept_tag`. If tags are free-text strings written by the Tutor Agent at inference time, the same concept will appear as "stereochem", "stereochemistry", "chirality", "R/S configuration", and "chiral centres" — none of which will reach the k=10 threshold individually.

Two approaches are acceptable. Choose one before building the Cohort Agent:

**Option A — Canonical concept ontology per subject:** A curated taxonomy of concept tags per subject domain (e.g., Organic Chemistry: `[stereochemistry, reaction_mechanisms, functional_groups, ...]`). The Tutor Agent maps its free-text gap identification to the nearest canonical tag at write time. Requires upfront curation per subject. Recommended for Phase 1 subjects (STEM, economics).

**Option B — Embedding-based tag normalisation:** The Tutor Agent writes a free-text concept description. At aggregation time, the Cohort Agent embeds all concept tags and clusters them by cosine similarity (threshold: 0.85). Concepts within the same cluster are merged into a representative tag. No upfront curation, but requires an embedding model call per aggregation run.

Both options must be decided and built before the Cohort Agent is activated. Add the chosen approach to the build order in §8 under Week 7+.

**Confusion clustering algorithm:**
1. Every time the Tutor Agent writes a `confusion_detected` signal, it includes `canonical_course_id` and `concept_tag`.
2. The Cohort Agent aggregates these signals per `(canonical_course_id, concept_tag)` over a rolling 7-day window.
3. If 10+ students in the same cohort show confusion on the same concept within 7 days, a cohort insight is generated.
4. The insight is written to the `proactive_signals` queue for each cohort member: "15 students in your CHEM 201 section are struggling with stereochemistry this week. Here is a targeted 10-minute review."

**Privacy architecture (non-negotiable):**
- All cohort aggregation runs against a **de-identified aggregation store** — a separate table with RLS policies that prevent any per-student data from being exposed.
- **k-anonymity minimum: 10 students.** If a cohort has fewer than 10 students, no insight is computed or shown. If a concept has fewer than 10 confused students, no insight is generated.
- **Per-student consent flag:** Students must opt in to cohort intelligence. Default is opt-out. The consent flag is stored in `students.cohort_consent boolean DEFAULT false`.
- **Legal review required:** This feature requires reconciling §9 (data belongs to student, never aggregated without consent) and §11 (social features deferred). Legal review for PIPEDA and FERPA compliance is required before this agent goes live. Do not ship without legal sign-off.

**Framing rule:** Insights are always framed as concept-gap recommendations for the individual student, never as commentary on the professor or course quality.

| Correct framing | Prohibited framing |
|---|---|
| "Many students in your section are finding stereochemistry difficult. Here's a targeted review." | "Your professor didn't explain this well." |
| "This concept is commonly misunderstood in CHEM 201. Let me break it down differently." | "Your class average on this topic is low." |

**Brain signals written (to de-identified aggregation store only):**
- `cohort_insight_generated`: concept tag, cohort size, confusion count
- `cohort_insight_delivered`: how many students received the insight

---

### Agent 15 — Podcast / Audio Overview Agent

**Owner:** Aryan (pipeline) + Tencent engineer (dialogue script)  
**Environment:** Async background pipeline — delivers via `notification_queue`  
**Priority:** P2  
**Tier:** Pro (10 episodes/month cap) + Max (unlimited)

**What it does:** Generates a 5–15 minute, two-host conversational audio episode from a student-selected source set. The episode is brain-grounded — the script uses the student's knowledge gaps, their lecture transcript, and the professor's terminology, exactly as the Lesson Generator does. A podcast generated only from raw uploaded text without brain context is not acceptable.

**Source set (student selects one or more):**
- Lecture transcript (from Lecture Agent)
- Uploaded notes or PDF
- Syllabus document (from Canvas Agent)
- A concept the student is weak on (pulled from `knowledge_gaps` in brain context)

**Episode formats:**

| Format | Description |
|---|---|
| `deep-dive` | Extended exploration of one concept or topic |
| `brief` | 5-minute high-density summary |
| `debate` | Two hosts argue opposing interpretations or approaches |
| `exam-cram` | Fast-paced review of high-yield exam topics based on the student's gaps |

**Pipeline (Pattern B — async, reuses Lesson Generator plumbing):**

```
Step 1:  context = brain.read(student_id)          // knowledge_gaps, professor terminology, lecture transcript
Step 2:  script  = dialogue_script_agent(source_set, context, format)
             — Two distinct host personas (Host A: explainer, Host B: questioner/challenger)
             — Turn-taking structure with natural transitions
             — Brain-grounded: gaps and professor terms woven into the dialogue
Step 3:  audio_a = elevenlabs.tts(host_a_lines, voice_id="host_a")
         audio_b = elevenlabs.tts(host_b_lines, voice_id="host_b")
Step 4:  episode = stitch(audio_a, audio_b)         // interleave turns in order
Step 5:  store episode at audio_url (Supabase Storage)
Step 6:  write to audio_overviews table
Step 7:  write to notification_queue: "Your CHEM 201 podcast is ready"
```

**LLM for script generation:** GPT-4o or Claude Sonnet (same routing as Lesson Generator — quality is the moat, do not downgrade to mini for the script).

**TTS:** ElevenLabs multi-voice. Two distinct voice IDs — one per host persona. Voice IDs are configurable per deployment.

**Latency budget:** < 3 minutes end-to-end for a 10-minute episode. This agent is **exempt from the 3-second NFR** (§9). The student is notified when the episode is ready — they do not wait at a loading screen.

**Brain signals written:**
- `podcast_generated`: `{ source_set: string[], format: string, duration_seconds: int }`
- `podcast_listened`: `{ episode_id: uuid, completed: boolean, percent_completed: float }`

**Academic integrity:** Podcast scripts are explanatory and review-oriented. They do not write assignments, generate essay content, or produce any output that could be submitted as academic work.

---

## 4.1 Studio Surface

**Owner:** Vincent  
**Priority:** P2  
**Tier:** Pro and Max (source selection and generation are Pro+ features)

**What it is:** A single consolidated panel where the student selects a source set once and generates any supported learning format on demand — NotebookLM-style, but grounded in the student's brain context. The Studio is primarily a **UI router over existing agents** — it does not introduce new generation logic.

**Source set selection (shared across all formats):**
The student picks one or more sources:
- A lecture transcript (from Lecture Agent)
- Uploaded notes or PDF
- A Canvas assignment or syllabus
- A concept from their knowledge gap list

**Formats available from the Studio:**

| Format | Powered by | Tier |
|---|---|---|
| Podcast (Audio Overview) | Agent 15 | Pro (10/month), Max (unlimited) |
| Summary | Lecture Agent | Pro+ |
| Flashcards | Lecture Agent | Pro+ |
| Quiz | Lecture Agent | Pro+ |
| Mind Map | §3.6 Graph Visualisation | Max |
| Brain-grounded Video | Lesson Generator (Agent 6) | Max |

**Design principle:** One source selection → many on-demand formats. The student does not need to re-upload or re-describe their material for each format. The Studio passes the same source set and brain context to each agent.

**What the Studio is NOT:**
- It is not a new generation engine — it routes to existing agents.
- It does not generate slide decks, infographics, or data tables (see §11 — out of scope).
- It is not a real-time interactive experience — all heavy formats (podcast, video) are async with notification delivery.

**UI requirements:**
- Source set picker (multi-select, shows available sources from Canvas + Lecture Agent)
- Format selector (cards, one per format, greyed out if not available on current tier)
- "Generate" button — triggers the appropriate agent pipeline
- Status tracker — shows in-progress generations with estimated completion time
- History panel — past generated items, playable/viewable inline

---

## 5. User Flows

### 5.1 Onboarding Flow

The onboarding is the "identity card" session — a one-on-one setup with FschoolAI that builds the student's initial brain profile.

**Step 1 — Account creation**
Student signs up with email or Google. A blank brain object is created with their student_id.

**Step 2 — Canvas connection**
Student connects their Canvas account via OAuth. Canvas Agent syncs all courses, assignments, and grades. The brain is populated with course context and upcoming deadlines.

**Step 3 — Learning style assessment**
Reggie asks 5 quick questions to determine the student's learning style. These are conversational, not a formal test. Example: "When you are trying to understand something new, do you prefer to see a diagram, hear an explanation, read about it, or try it yourself?"

**Step 4 — First brain summary**
FschoolAI shows the student their initial brain: "Here is what I know about you so far. You are taking 4 courses. Your next deadline is in 2 days. I think you learn best visually. Is this right?"

**Step 5 — First interaction**
Reggie asks: "What do you want to work on today?" The student is now in the product.

---

### 5.2 Daily Use Flow

```
Student opens FschoolAI
  → Reggie shows a personalised daily brief:
    "Good morning. You have 2 assignments due this week.
     You have a study block for CHEM 201 at 2pm.
     Your exam readiness for MATH 204 is 62% — want to practice?"

Student asks a question or picks a task
  → Reggie routes to the appropriate agent
  → Agent reads brain context
  → Agent responds
  → Agent writes signal to brain

End of session
  → Reflection Agent (nightly) synthesises the day
  → Brain is updated
  → Tomorrow's brief is prepared
```

---

### 5.3 Exam Preparation Flow

```
Student: "I have a CHEM 201 exam on Friday"
  → Reggie routes to Exam Mode Agent
  → Exam Mode Agent reads brain: gaps in stereochemistry and reaction mechanisms
  → Agent creates 3-day prep plan
  → Day 1: stereochemistry practice (student's weakest area)
  → Day 2: reaction mechanisms + mixed practice
  → Day 3: full mock exam + review
  → Each day: agent evaluates student's answers, updates readiness score
  → Thursday night: "You are at 78% readiness. Focus on reaction mechanisms tonight."
```

---

## 6. Data Model

### 6.1 Core Tables (Supabase)

**students**
```sql
id              uuid PRIMARY KEY
email           text UNIQUE NOT NULL
name            text
canvas_token    text (encrypted)
created_at      timestamp
last_active     timestamp
```

**brain_context** (Phase 1 mock — later replaced by NeuroAGI API)
```sql
id              uuid PRIMARY KEY
student_id      uuid REFERENCES students(id)
learning_style  text
stress_level    float
knowledge_gaps  jsonb
preferences     jsonb
updated_at      timestamp
```

**courses**
```sql
id              uuid PRIMARY KEY
student_id      uuid REFERENCES students(id)
canvas_course_id text
name            text
professor       text
semester        text
```

**assignments**
```sql
id              uuid PRIMARY KEY
course_id       uuid REFERENCES courses(id)
canvas_assignment_id text
title           text
due_date        timestamp
points_possible float
points_earned   float
submitted       boolean
```

**sessions**
```sql
id              uuid PRIMARY KEY
student_id      uuid REFERENCES students(id)
agent_used      text
input_text      text
output_text     text
topics          text[]
duration_seconds int
created_at      timestamp
```

**brain_signals**
```sql
id              uuid PRIMARY KEY
student_id      uuid REFERENCES students(id)
signal_type     text
signal_data     jsonb
created_at      timestamp
```

**proactive_signals** (candidate interventions awaiting Signal Arbiter decision)
```sql
id              uuid PRIMARY KEY
student_id      uuid REFERENCES students(id)
agent_source    text              -- which agent wrote this candidate
urgency_score   float             -- 0.0–1.0, time sensitivity
value_score     float             -- 0.0–1.0, estimated benefit
message_text    text              -- the message to deliver if approved
channel_hint    text              -- preferred channel (push, sms, email, in_app)
status          text DEFAULT 'pending'  -- pending | approved | rejected | delivered
created_at      timestamp
expires_at      timestamp         -- candidate is discarded after this time
```

**notification_queue** (approved interventions ready for delivery)
```sql
id                  uuid PRIMARY KEY
student_id          uuid REFERENCES students(id)
proactive_signal_id uuid REFERENCES proactive_signals(id)
channel             text              -- actual delivery channel chosen by Arbiter
message_text        text
scheduled_for       timestamp         -- when to deliver (respects quiet hours)
delivered_at        timestamp
opened_at           timestamp
action_taken        boolean           -- did the student act on it?
created_at          timestamp
```

**canonical_courses** (shared across students in the same Canvas instance)
```sql
id                  uuid PRIMARY KEY
institution_id      text              -- e.g., "carleton.ca"
canvas_course_id    text              -- Canvas's own course ID
course_name         text
semester            text
UNIQUE(institution_id, canvas_course_id)
```

**canonical_assignments** (shared across students in the same course)
```sql
id                      uuid PRIMARY KEY
canonical_course_id     uuid REFERENCES canonical_courses(id)
canvas_assignment_id    text
title                   text
due_date                timestamp
UNIQUE(canonical_course_id, canvas_assignment_id)
```

**cohort_confusion_signals** (de-identified aggregation store — separate RLS, no per-student data)
```sql
id                      uuid PRIMARY KEY
canonical_course_id     uuid REFERENCES canonical_courses(id)
concept_tag             text
confusion_count         int               -- number of students confused (never < 10 when shown)
week_start              date
updated_at              timestamp
```

**flashcard_reviews** (SRS state — required for spaced-repetition trigger)
```sql
id                  uuid PRIMARY KEY
student_id          uuid REFERENCES students(id)
flashcard_id        uuid              -- references the flashcard generated by Lecture Agent
concept_tag         text
ease_factor         float DEFAULT 2.5 -- FSRS ease factor
interval_days       int DEFAULT 1     -- current review interval in days
repetitions         int DEFAULT 0     -- number of times reviewed
next_review_at      timestamp         -- when this card is next due
last_reviewed_at    timestamp
rating              int               -- last review rating: 1 (again) 2 (hard) 3 (good) 4 (easy)
created_at          timestamp
```

**SRS engine:** The spaced-repetition scheduling uses the **FSRS algorithm** (Free Spaced Repetition Scheduler — open-source, more accurate than SM-2). It runs client-side in the browser/app. On each flashcard review, the student rates their recall (1–4). The FSRS algorithm updates `ease_factor`, `interval_days`, and `next_review_at`. The "spaced-repetition due" trigger in the Intervention Agent reads `next_review_at` to determine when to send a reminder. **This table and scheduling engine must be built before the spaced-repetition trigger is activated.** Remove the trigger from the Intervention Agent's positive trigger table until `flashcard_reviews` is populated with real data.

**audio_overviews** (generated podcast episodes)
```sql
id                  uuid PRIMARY KEY
student_id          uuid REFERENCES students(id)
source_refs         jsonb             -- array of source identifiers (transcript IDs, note IDs, concept tags)
format              text              -- 'deep-dive' | 'brief' | 'debate' | 'exam-cram'
duration_seconds    int
audio_url           text              -- Supabase Storage URL
created_at          timestamp
```

---

## 7. Technical Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Tailwind CSS 4, shadcn/ui |
| Mobile | React Native (Phase 2) |
| Backend | Supabase (database + auth + storage) |
| Brain layer | NeuroAGI API (Phase 2) / local mock JSON (Phase 1) |
| LLM | GPT-4o via OpenAI API (Phase 1) |
| Speech-to-text | OpenAI Whisper |
| Canvas integration | Canvas LMS REST API + OAuth 2.0 |
| Calendar integration | Google Calendar API + Apple CalDAV |
| Chrome extension | Manifest V3, React |
| Hosting | Manus (FschoolAI frontend) |
| Notification delivery | Firebase Cloud Messaging (push), Twilio (SMS), Resend (email) |
| SRS engine | FSRS algorithm (open-source, client-side) |
| Podcast TTS | ElevenLabs multi-voice API (Agent 15) |
| Stripe | Payment processing (Phase 1 launch requirement) |

---

### 7.1 Cost Envelope and Model Routing

This section is a launch blocker. With 14 agents, nightly Reflection, cohort aggregation, an arbiter, and video generation, the default "use GPT-4o for everything" approach is not economically viable. The following routing rules are required before launch.

**Per-active-user cost target:** < $1.50/month for a Free user, < $3.00/month for a Pro user, < $5.00/month for a Max user. Gross margin targets: Free (0% — acquisition cost), Pro (~75%), Max (~70% including video).

**Model routing rules:**

| Task | Model | Rationale |
|---|---|---|
| Intent classification (Reggie routing) | GPT-4o-mini or Claude Haiku | Sub-100ms, < $0.001/call, runs on every message |
| Signal evaluation (Intervention Agent, Arbiter scoring) | GPT-4o-mini | Structured JSON output, no long context needed |
| Summarisation (Lecture Agent summary, Planner output) | GPT-4o-mini | High volume, quality threshold is moderate |
| Flashcard and quiz generation | GPT-4o-mini | Template-driven, low creativity requirement |
| **Tutoring (Tutor Agent, Exam Mode)** | **GPT-4o or Claude Sonnet** | Core product, quality is the moat — do not downgrade |
| **Video script generation (Lesson Generator)** | **GPT-4o or Claude Sonnet** | Max-tier feature, brain-grounded, quality matters |
| **Podcast dialogue script (Agent 15)** | **GPT-4o or Claude Sonnet** | Pro/Max feature, brain-grounded two-host script — same quality bar as Lesson Generator |
| Reflection synthesis (Reflection Agent) | GPT-4o-mini | Runs nightly, structured signal processing |
| Cohort insight generation | GPT-4o-mini | Templated output, low creativity |

**Prompt caching:** The brain context object (`learning_style`, `knowledge_gaps`, `stress_level`, `upcoming_deadlines`) is stable within a session. Cache it as a system prompt prefix using OpenAI's prompt caching feature. Estimated saving: 40–60% of token cost for multi-turn sessions.

**Cost per active user per day (estimated at launch):**

| User type | Sessions/day | Est. LLM cost/day | Est. LLM cost/month |
|---|---|---|---|
| Free (casual, 20 msg cap) | 1 session, ~15 messages | $0.02 | $0.60 |
| Pro (regular, unlimited) | 2–3 sessions, ~40 messages | $0.06 | $1.80 |
| Max (power user, video) | 3+ sessions + 1 video/week | $0.12 | $3.60 |

These are estimates based on GPT-4o-mini for routing/evaluation and GPT-4o for tutoring at current API pricing. Validate against actual usage in the first 30 days and adjust routing rules accordingly.

**Video cost note (Max tier):** A single brain-grounded video (script + ElevenLabs TTS + animation render) costs approximately $0.80–1.20 per video. At 4 videos/month per Max user, this is $3.20–4.80/month in video costs alone. Cohort amortisation (see Agent 14) reduces this when the same core video is reused across cohort members with only the framing layer personalised.

**Podcast cost note (Agent 15):** ElevenLabs multi-voice TTS for a 10-minute two-host episode costs approximately $0.15–0.40 per episode (dependent on character count and voice tier). At 10 episodes/month for a Pro user, this is $1.50–4.00/month in TTS costs alone before LLM script generation. **This cost must be validated against actual ElevenLabs pricing and usage before the Pro tier cap is finalised.** The 10/month cap is a conservative starting point — adjust based on observed cost per episode in the first 30 days. Max tier (unlimited) requires cohort amortisation or a per-episode cost ceiling to remain within the $5.00/month gross margin target.

---

## 8. Build Order and Ownership

The build order is designed so no engineer blocks another. Ryan's brain mock is available from Day 1 so all agents can develop against it.

| Week | What gets built | Owner |
|---|---|---|
| Week 1 | Brain mock JSON + `brain.read()` / `brain.write()` stub | Ryan |
| Week 1 | Canvas Agent — OAuth + sync | Aryan |
| Week 1 | Reggie — basic routing | Vincent |
| Week 1 | Supabase schema — all tables including `proactive_signals`, `notification_queue`, `canonical_courses` | Ryan |
| Week 2 | Tutor Agent — core explanation logic | Tencent engineer |
| Week 2 | Planner Agent — study schedule generation | Bytedance engineer |
| Week 2 | Lecture Agent — transcription + summary | Aryan |
| Week 2 | Trigger / Event Runtime — Supabase Realtime + cron scaffold | Ryan |
| Week 3 | Exam Mode Agent | Vincent |
| Week 3 | Intervention Agent (Pattern B, writes to Arbiter) | Vincent |
| Week 3 | Library Agent | Bytedance engineer |
| Week 3 | **Signal Arbiter** — dedup, rank, rate-limit, quiet hours | Ryan |
| Week 3 | **Delivery Layer** — FCM push + Twilio SMS + email (Resend) + in-app | Aryan |
| Week 4 | Audio Agent | Aryan |
| Week 4 | Office Hours Agent | Tencent engineer |
| Week 4 | Calendar Agent | Bytedance engineer |
| Week 4 | Effectiveness feedback loop — per-student threshold tuning | Ryan |
| Week 4 | **Lesson Generator async plumbing** — job queue, Supabase Storage, notification delivery | Aryan |
| Week 5 | Reflection Agent (NeuroAGI) | Ryan |
| Week 5 | Terminal Agent | Vincent |
| Week 5 | Cold-start mode — deadline-only proactivity until baseline exists | Vincent |
| Week 5 | **Agent 15 — Podcast / Audio Overview Agent** — dialogue script (GPT-4o/Sonnet) + ElevenLabs multi-voice TTS + stitch + notify | Aryan (pipeline) + Tencent engineer (script) |
| Week 5 | **Studio UI surface** — source set picker, format cards, async status tracker, history panel | Vincent |
| Week 6 | Replace mock brain with live NeuroAGI API | Ryan + all |
| Week 7+ | **Cohort Agent** — requires canonical layer + 10+ students + legal sign-off | Ryan + Vincent |
| Week 7+ | Canonical entity layer (`canonical_courses`, `canonical_assignments`) | Ryan |

---

## 9. Non-Functional Requirements

**Response time:** Every agent must respond within 3 seconds for standard queries. Lecture transcription and exam prep plan generation may take up to 10 seconds with a loading indicator.

**Privacy:** Student data is never used to train models. Canvas tokens are stored encrypted. Brain data belongs to the student — they can export or delete it at any time.

**Language:** All agents must support English by default. Mandarin Chinese support is required for Phase 1 (Chinese student market). Additional languages via Audio Agent in Phase 2.

**Offline mode:** Core brain context is cached locally. Students can view their study plan and upcoming deadlines without internet. Active agent sessions require internet.

**Accessibility:** All UI must meet WCAG 2.1 AA. Voice input must be available for all agent interactions.

---

## 10. Success Metrics

| Metric | Target (Month 3) |
|---|---|
| Daily active users | 500+ |
| Session length | > 8 minutes average |
| Canvas connections | > 70% of users connect Canvas |
| Agent interactions per session | > 2 agents used per session |
| Student-reported grade improvement | > 40% of users report improvement |
| Retention (Day 30) | > 45% |
| NPS | > 50 |
| Free → Pro conversion rate | > 8% within 30 days of signup |
| Pro → Max upgrade rate | > 15% of Pro users within 60 days |
| **LLM cost per active Pro user/month** | **< $3.00** |
| **LLM cost per active Max user/month** | **< $5.00** |
| Proactive notification open rate | > 35% |
| Proactive notification disable rate | < 5% (measures Arbiter quality) |
| Video completion rate (Lesson Generator) | > 60% of generated videos watched to completion |

---

## 11. Out of Scope (Phase 1)

The following are explicitly out of scope for Phase 1 and should not be built until Phase 2:

- NeuroAGI hardware integration (Neural Card)
- School/institution-facing dashboard
- Professor tools
- Native mobile app (iOS/Android)
- Social features (study groups, leaderboard)
- EducAI integration

**Payment processing is IN scope for Phase 1.** FschoolAI launches with a Free tier and two paid tiers:

| Tier | Price | Key Phase 1 features |
|---|---|---|
| Free | $0 | 20 messages/day, basic brain, Canvas sync |
| Pro | $12/month | Unlimited chat, nightly reflection, proactive interventions, Lesson Generator (10/month), Exam Predictor, **Podcast / Audio Overview (10 episodes/month)**, **Studio panel** |
| Max | $20/month | Everything in Pro + unlimited Lesson Generator, **unlimited Podcast / Audio Overview**, Brain export, Brain API access, cross-course knowledge graph |

Stripe integration is required before public launch. The Lesson Generator (video generation feature) is a **Max-tier feature** — it is gated behind $20/month and must not be accessible to Free or Pro users. See §7.1 for cost envelope and model routing. See TOKEN_ECONOMY.md for full tier feature breakdown.

**Video generation (Lesson Generator) is Phase 1 Max-tier only.** It is not a generic explainer — see Agent 6 (Library Agent) and the Lesson Generator spec for the brain-grounded video pipeline.

**Podcast / Audio Overview (Agent 15) is Pro+ only.** Free users do not have access to podcast generation. Pro users are capped at 10 episodes/month. Max users have unlimited episodes. See §7.1 for ElevenLabs cost validation requirements before the cap is finalised.

**Studio panel is a Pro+ feature.** Free users do not see the Studio surface. The Studio is the single entry point for all on-demand format generation (podcast, summary, flashcards, quiz, mind map, video).

---

### Explicitly Out of Scope — Do Not Build in Phase 1

The following output formats are **explicitly out of scope for Phase 1** and must not be added to the Studio or any agent pipeline. They are document-productivity formats, not learning formats. FschoolAI is a learning intelligence product, not a document generator.

| Out-of-scope format | Reason | Phase |
|---|---|---|
| **Slide Deck generation** | Document-productivity format. NotebookLM has this. Not a learning format. | Phase 2 at earliest |
| **Infographic generation** | Document-productivity format. Requires design tooling outside the learning pipeline. | Phase 2 at earliest |
| **Data Table generation** | Document-productivity format. Not a learning format. | Phase 2 at earliest |
| **Real-time interactive podcast** (conversing with hosts live) | Technically complex, high latency, requires streaming TTS + dialogue management. Ship one-way podcast first and validate demand. | Phase 2 flag |

Any engineer who receives a request to add slide deck, infographic, or data table generation should escalate to Vincent before building. These are not scope creep — they are a different product category.

---

*This document is the source of truth for FschoolAI Phase 1 engineering. Any questions, contact Vincent Yang.*
