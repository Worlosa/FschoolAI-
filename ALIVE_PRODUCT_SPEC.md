# FschoolAI — The Alive Product Specification

**The single document that defines what makes FschoolAI feel alive, not dead.**

This spec answers: Why would a student open FschoolAI every day instead of ChatGPT, StudyFetch, Focus Town, or nothing at all? What makes it impossible to leave? What makes Day 100 fundamentally different from Day 1?

---

## Part 1: Why Every Other App Feels Dead

### StudyFetch (Raised $11.5M, backed by College Board)

StudyFetch lets students upload PDFs and generates flashcards. That is all it does. Students on Reddit call it "practically unusable," "buggy," "turned to shit," and "feels like a scam." The core architectural failure: it has no memory. Upload a PDF today, get flashcards. Come back tomorrow — it does not know you struggled with Chapter 4. Come back in a month — same generic experience. Day 1 and Day 100 are identical. The AI tutor is just ChatGPT with your notes as context. No compounding. No adaptation. No life.

### Focus Town (4.8 stars, gamified study timer)

Focus Town gives you a cozy 3D cafe where you sit next to real people studying globally. You earn coins. You customize your character. It works for motivation — seeing others study makes you study. But it does nothing to help you actually learn. No AI. No course material. No knowledge of what you are studying or why. It is a timer with a social skin. The moment you close it, it forgets you exist. The gamification is cosmetic — coins buy hats, not knowledge.

### Units.school (YC X25, backed by OpenAI researchers)

Units is the most impressive competitor. Their three-layer assessment (Create, Defend, Critique) is genuinely innovative. AI is required, not banned. Every unit produces a real artifact. But Units IS the school — it replaces your education entirely. FschoolAI augments your existing school. A student at UCLA cannot use Units. They can use FschoolAI. Units also has no social layer, no gamification, no second brain that follows you after graduation.

### What They All Miss

Every one of these apps treats the student as a generic input. Upload your material, here are your flashcards. Set a timer, here is your coin. Take our course, here is your grade. None of them build a persistent model of WHO you are, HOW you learn, WHAT you struggle with, and WHY. None of them get smarter over time. None of them speak first. None of them connect the dots between your Monday lecture and your Friday assignment and your study session with your friend.

---

## Part 2: What Makes FschoolAI Alive

### The 7 Properties of an Alive Product

| Property | Dead App | Alive App (FschoolAI) |
|---|---|---|
| **Memory** | Forgets you between sessions | Remembers every interaction, builds on them |
| **Proactivity** | Waits for you to ask | Speaks first when it detects something |
| **Adaptation** | Same interface for everyone | Interface changes based on who you are |
| **Consequence** | No visible effect of using it | Your brain visibly grows, your tokens accumulate |
| **Social proof** | Isolated experience | See friends studying, competing, growing |
| **Surprise** | Predictable every time | Unexpected insights that delight |
| **Compounding** | Day 100 = Day 1 | Day 100 is exponentially more powerful |

---

## Part 3: The AI-Generated Interface

### The Concept

No settings page. No preferences menu. The student tells the AI what they want and the interface changes.

> "Make my background darker"
> "Show my assignments as a timeline instead of a list"
> "I want to see my GPA trend on the home page"
> "Hide the leaderboard, I find it stressful"
> "Make the font bigger"
> "I want a minimalist layout"
> "Show me a study timer on every page"

The AI modifies the interface in real-time. The interface itself becomes a signal — what the student customizes tells the brain about their personality, preferences, and mental state. A student who asks for "darker, minimal, no distractions" is different from one who asks for "colorful, show me everything, add animations."

### How It Works (Technical)

```
Student says: "Make my home page show only today's deadlines"
        ↓
Chat agent parses intent → identifies UI modification request
        ↓
Writes to neuro.memory: { key: "ui_preferences", value: { home_layout: "deadlines_only" } }
        ↓
Frontend reads preferences from brain → renders personalized layout
        ↓
Brain logs this as a signal: { signal_type: "ui_customization", data: { preference: "minimal" } }
        ↓
Reflection engine notices: "Student prefers minimal UI → likely overwhelmed → reduce notification frequency"
```

### What This Means for Development

The frontend is not a fixed set of pages. It is a **component library** that the brain assembles differently for each student. The base layout exists (the 7 pages), but within each page, the arrangement, visibility, and style of components is driven by the student's brain profile.

This is not a v1 feature. This is a v2/v3 feature. But the architecture must support it from Day 1 — which means every UI component must be independently renderable and every layout decision must be stored in `neuro.memory`.

---

## Part 4: FschoolAI Token Economy

### The Core Loop

Every meaningful action earns tokens. Tokens are not cosmetic — they unlock real capabilities.

| Action | Tokens Earned | Why It Matters |
|---|---|---|
| Submit an assignment on time | 50 | Rewards follow-through |
| Submit early (before 80% of deadline elapsed) | 100 | Rewards proactivity |
| Complete a study session (25+ min) | 30 | Rewards focus |
| Study with a friend (both active) | 50 each | Rewards social learning |
| Ask the tutor a question | 5 | Rewards curiosity |
| Upload lecture notes/recording | 40 | Feeds the brain |
| Achieve a grade improvement | 200 | Rewards real outcomes |
| Maintain a streak (daily login + action) | 10/day, 100/week | Rewards consistency |
| Help a friend in study room | 25 | Rewards teaching (deepens learning) |
| Complete a brain-generated lesson | 60 | Rewards gap-filling |
| Get a prediction right (brain predicted you'd struggle, you didn't) | 150 | Rewards beating the pattern |

### What Tokens Unlock

Tokens are NOT just points. They unlock real things:

**Tier 1 (0-500 tokens): Basic**
- Standard AI tutor access
- 5 study room joins per week
- Basic brain insights

**Tier 2 (500-2000 tokens): Enhanced**
- Unlimited study rooms
- Grade prediction for upcoming assignments
- Professor intelligence (grading style analysis)
- Custom interface modifications
- Priority tutor response time

**Tier 3 (2000-5000 tokens): Advanced**
- Create and host study rooms
- Advanced brain analytics (learning style report)
- Tutor remembers cross-course connections
- Leaderboard badge customization
- Early access to new features

**Tier 4 (5000+ tokens): Brain Owner**
- Full brain export (your data, your ownership)
- Brain API access (connect your brain to other tools)
- Tutor personality customization (not just name — tone, teaching style)
- Priority feature requests
- Beta access to NeuroAGI hardware waitlist

### The Anti-Cheat Mechanism

Tokens cannot be gamed because the brain validates actions:
- "Submit assignment" only counts if Canvas confirms submission
- "Study session" only counts if the app detects actual activity (not just open)
- "Help a friend" only counts if the friend confirms it was helpful
- "Grade improvement" is verified against Canvas grade data

### Token Decay (Optional — Creates Urgency)

Unused tokens decay at 5% per month. This creates urgency to use them and prevents hoarding. Students who stop using the app gradually lose their tier. This is controversial — discuss with team before implementing.

---

## Part 5: The Maxing Leaderboard

### Categories

| Category | What It Measures | Signal Source |
|---|---|---|
| **Nerdmaxing** | Total study hours this week | Study session duration |
| **Grindmaxing** | Assignments submitted on time | Canvas submission data |
| **Late Night Maxing** | Study hours between 10pm-4am | Session timestamps |
| **Social Maxing** | Friends helped + study rooms hosted | Social interactions |
| **Brain Maxing** | Knowledge graph growth rate | New patterns + connections |
| **Streak Maxing** | Consecutive days with meaningful activity | Daily action log |
| **Token Maxing** | Tokens earned this week | All token-earning actions |
| **Influencer Maxing** | Friends referred + study groups created | Referral tracking |

### Filters

- By university (same school competition)
- By city (local bragging rights)
- By country (national pride)
- By course (who is the best in Calculus 101)
- By friend group (private competition)
- Global (worldwide)

### Privacy Controls

Students opt-in to each leaderboard category individually. You can be on "Nerdmaxing" but not "Late Night Maxing." You can be visible to friends only, university only, or global. The brain suggests which leaderboards you might enjoy based on your personality.

---

## Part 6: Tailored Lesson Sessions

### The Concept

The brain reads your Canvas syllabus, your uploaded lecture notes, your assignment submissions, and your chat history. It knows exactly what you DO NOT know. It generates personalized micro-lessons that target those specific gaps, in your specific learning style.

### How It Differs from StudyFetch/Units

| Platform | Approach | Problem |
|---|---|---|
| StudyFetch | Upload PDF → get flashcards | No knowledge of what you already know |
| Units.school | Take our curriculum | Not YOUR school's curriculum |
| Khan Academy | Watch generic videos | Same video for everyone |
| **FschoolAI** | Brain detects gap → generates lesson for YOUR gap, in YOUR style | Personalized + contextual |

### The Lesson Session Flow

```
1. Brain scheduler runs (every 30 min)
        ↓
2. Reads student's recent signals:
   - Assignment due Friday on "Thermodynamics Chapter 7"
   - Last chat: student asked about entropy (confused)
   - Canvas grade on Chapter 6 quiz: 62%
   - Pattern: student learns better from examples, not theory
        ↓
3. Brain generates lesson plan:
   - Topic: "Entropy — from confusion to clarity"
   - Style: Example-first (not theory-first)
   - Duration: 12 minutes (student's attention span from patterns)
   - Difficulty: Start at Chapter 6 level, build to Chapter 7
   - Connection: "Remember when you asked about heat engines? Entropy is why..."
        ↓
4. Tutor proactively sends:
   "Hey [tutor name here]. I noticed your Chapter 7 assignment is due Friday
    and you seemed confused about entropy yesterday. I made you a 12-minute
    lesson that starts with the heat engine example you liked. Want to do it now?"
        ↓
5. Student completes lesson → Brain records:
   - Signal: lesson_completed, topic: entropy, duration: 14min, score: 85%
   - Pattern update: "Student now understands entropy basics"
   - Prediction update: "Chapter 7 assignment grade prediction: B+ (was C)"
        ↓
6. Tokens earned: 60 (lesson completed)
```

### Lesson Types

| Type | When Generated | Duration |
|---|---|---|
| **Gap Filler** | Brain detects knowledge gap from quiz/assignment score | 5-15 min |
| **Pre-Assignment Prep** | 48 hours before a major assignment is due | 10-20 min |
| **Exam Review** | 1 week before exam (detected from Canvas calendar) | 30-45 min |
| **Connection Builder** | Brain notices two courses share a concept | 5-10 min |
| **Weakness Drill** | Pattern shows recurring struggle with a concept type | 10-15 min |
| **Professor Style Prep** | Before a submission, teaches the professor's preferred format | 5-10 min |

---

## Part 7: New Agents to Build

### Agent 1: Situation Synthesizer (The "Working Memory")

**What it does:** Every time the student opens the app, this agent synthesizes their current situation into a single coherent paragraph that the tutor uses as its opening greeting.

**Inputs:** Last 24h signals, upcoming deadlines, recent grades, current streak, social activity, time of day, day of week.

**Output:** A natural-language situation summary.

**Example:** "It's Tuesday night. You have a Thermodynamics assignment due Friday that you haven't started. Your Chapter 6 quiz came back at 62% which is below your average. Your friend Sarah is currently in a study room working on the same assignment. Your streak is at 7 days. You typically start assignments on Wednesday nights."

**Compounds because:** Every situation summary is stored. Over time, the brain can say "Last three Tuesdays you were in this exact situation and you procrastinated. This time, Sarah is online — want to join her?"

---

### Agent 2: Professor Intelligence

**What it does:** Builds a profile of each professor's grading style, preferences, and patterns by analyzing graded assignments.

**Inputs:** Graded submissions (score + feedback), assignment rubrics, grade distribution patterns.

**Output:** Professor profile stored in `brain.reflections`.

**Example insight:** "Professor Chen values concise answers over lengthy explanations. Students who write 2-3 focused paragraphs score 15% higher than those who write 5+ paragraphs. He always deducts points for missing citations, even on informal assignments."

**Compounds because:** Every new graded assignment refines the profile. By midterm, the tutor can say "Professor Chen will dock you for that — add a citation."

---

### Agent 3: Social Intelligence

**What it does:** Understands the student's social learning patterns — who they study with, when social study helps vs hurts, which friends push them to do better.

**Inputs:** Study room sessions, friend interactions, comparative performance data (with consent).

**Output:** Social learning profile.

**Example insight:** "You study 40% longer when Sarah is in the room. You get distracted when more than 3 people are in the room. Your best grades come after solo study followed by a 15-min friend review session."

**Compounds because:** The brain learns your optimal social configuration and suggests it proactively.

---

### Agent 4: Content Connector

**What it does:** Connects content the student consumes outside of school (Instagram reels, YouTube, podcasts) to their coursework.

**Inputs:** Content the student voluntarily shares or the brain detects (with permission).

**Output:** Connections stored as `brain.signals` with type `content_connection`.

**Example:** Student watches a TikTok about SpaceX rocket engines. Brain connects: "The thrust equation in that video is the same F=ma application you're studying in Physics 201. Want me to explain it using the SpaceX example?"

**Compounds because:** Over time, the brain builds a map of what content formats and topics engage the student, and uses those as teaching vehicles.

---

### Agent 5: Writing Evolution Tracker

**What it does:** Analyzes every piece of writing the student submits and tracks their growth over time.

**Inputs:** Assignment submissions, essay drafts, chat messages (writing complexity).

**Output:** Writing profile with growth metrics.

**Example insight:** "Your thesis statements have improved 35% since September. Your citation accuracy is now 92% (was 67%). Your vocabulary complexity has increased but your sentence clarity has decreased — you might be overcomplicating. Suggestion: shorter sentences, same vocabulary."

**Compounds because:** The student can see their writing evolution as a timeline. The tutor adapts its writing feedback based on where the student is NOW, not where they were 3 months ago.

---

### Agent 6: Motivation Engine

**What it does:** Detects motivation drops before they become procrastination spirals and intervenes with the right type of motivation for THIS specific student.

**Inputs:** App usage patterns, session duration trends, assignment start timing, streak data, time between signals.

**Output:** Personalized motivation intervention.

**Example:** Brain detects: student hasn't opened app in 2 days, has an assignment due in 3 days, last session was only 4 minutes (usually 25+). Intervention type depends on student personality:
- Competitive student: "Sarah just passed you on the leaderboard. 15 minutes of study gets you back on top."
- Achievement student: "You're 2 assignments away from your longest streak ever."
- Social student: "3 of your friends are in a study room right now. Join them?"
- Fear-driven student: "Your grade prediction for this assignment is C+ if you start tomorrow. B+ if you start tonight."

**Compounds because:** The brain learns which motivation type works for each student and stops using ones that fail.

---

### Agent 7: Exam Predictor

**What it does:** Predicts exam performance based on study patterns, assignment grades, and knowledge gap analysis.

**Inputs:** All signals from the course, assignment grades, lesson completion, study session data, historical exam performance.

**Output:** Grade prediction with confidence interval + specific recommendations.

**Example:** "Predicted grade for Calculus Midterm: B (74-79%). Confidence: 72%. To reach A-: complete the integration lesson (12 min), review Chapter 4 problems (you got 3/7 wrong on the quiz), and do one practice exam. Estimated time needed: 4.5 hours over the next 5 days."

**Compounds because:** After each exam, the prediction model is validated and refined. By the student's second semester, predictions are highly accurate.

---

### Agent 8: Study Room Orchestrator

**What it does:** Manages the AI tutor's behavior inside study rooms — adapting to multiple students simultaneously while maintaining individual personalization.

**Inputs:** All participants' brain profiles, room topic, individual knowledge gaps, social dynamics.

**Output:** Room-aware tutoring that helps everyone without revealing individual weaknesses.

**Example:** In a room with 3 students studying Thermodynamics:
- Student A understands entropy but struggles with enthalpy
- Student B is the opposite
- Student C is behind on both

The tutor says: "Let's start with a quick concept check. [Student A], can you explain entropy to the group? [Student B], you take enthalpy. Then we'll connect them together." This way, each student teaches what they know (deepening their understanding) and learns what they don't (from their peer).

**Compounds because:** The brain learns which students complement each other and suggests study room pairings proactively.

---

## Part 8: The Complete Page-by-Page "Alive" Experience

### Page 1: HOME (The Pulse)

**What the student sees on open:**

The tutor greets them with a situation-aware message. Not "Hello! How can I help?" but "Hey, it's Wednesday 9pm. Your Thermo assignment is due Friday and you haven't started. Sarah is online studying it right now. Your predicted grade if you start tonight: B+. If you start tomorrow: C+. Want to join Sarah or start a solo session?"

**AI that lives here:**
- Situation Synthesizer (generates the greeting)
- Motivation Engine (decides tone and urgency)
- Neural Ring (visual representation of brain activity — glows brighter when brain is active/learning)

**What makes it alive:**
- Different every single time you open it
- References specific things from your life
- Shows real consequence (grade predictions change in real-time)
- Neural Ring pulses when your brain is growing

---

### Page 2: ASSIGNMENTS (The War Room)

**What the student sees:**

Not just a list. Each assignment has:
- Due date + countdown
- Predicted grade (updates in real-time as you work)
- "Help me start" button (opens chat with full assignment context pre-loaded)
- Professor insight badge ("Prof Chen wants citations" / "Prof Lee values creativity")
- Friend status ("Sarah submitted 2 hours ago" / "3 friends haven't started")
- Token reward preview ("Submit on time: +50 tokens. Submit early: +100")

**AI that lives here:**
- Assignment Agent (reads rubric, generates starting framework)
- Professor Intelligence (surfaces grading preferences)
- Exam Predictor (grade prediction per assignment)
- Motivation Engine (urgency signals)

**What makes it alive:**
- Grade prediction changes as you work (visible consequence)
- Professor insights make you feel like you have insider knowledge
- Social pressure from seeing friends' status
- Token incentive creates urgency

---

### Page 3: STUDY (The Lab)

**What the student sees:**

Personalized lesson sessions generated by the brain. Not generic flashcards — targeted micro-lessons that address YOUR specific gaps.

- "Lessons for you" — brain-generated, based on detected knowledge gaps
- Active study timer with focus tracking
- Flashcards generated from YOUR notes (not generic)
- Practice problems at YOUR difficulty level
- "Deep Focus Mode" — locks the interface, only study tools visible

**AI that lives here:**
- Lesson Generator (creates personalized micro-lessons)
- Focus Agent (tracks attention, suggests breaks at optimal times)
- Study Agent (generates flashcards from uploaded material)
- Content Connector (links outside content to study material)

**What makes it alive:**
- Lessons are different every day (based on what brain detected overnight)
- Difficulty adapts in real-time (too easy → harder, struggling → simpler)
- Focus tracking shows you your attention patterns over time
- "You studied 40% longer today than your Tuesday average" — visible growth

---

### Page 4: CANVAS (The Bridge)

**What the student sees:**

Your actual courses, synced live. But enhanced with brain intelligence:
- Each course shows brain health (how well you understand the material)
- Professor profile card (grading style, pet peeves, what they reward)
- Grade trend with prediction line (where you're heading)
- "Brain strength" per topic within the course
- Upcoming items with AI priority ranking ("do this first")

**AI that lives here:**
- Canvas Watcher (syncs data every 30 min)
- Professor Intelligence (builds professor profiles)
- Exam Predictor (course-level grade trajectory)
- Signal Ingestion (every Canvas event becomes a brain signal)

**What makes it alive:**
- Professor profiles feel like having a friend who took the class last year
- Grade predictions create stakes ("you're trending toward B+, 2 more good assignments gets you to A-")
- Priority ranking saves decision fatigue

---

### Page 5: BRAIN (The Mirror)

**What the student sees:**

Their intellectual portrait — a living visualization of everything they know, how they learn, and how they've grown.

- Dynamic knowledge graph (nodes = concepts, edges = connections, size = mastery)
- Learning style profile ("You learn best from examples, worst from pure theory")
- Writing evolution timeline (complexity, clarity, vocabulary over time)
- Cognitive strengths radar (analytical, creative, memory, speed, depth)
- "Brain age" — how much your brain has grown since joining
- Export button (your data, your ownership)

**AI that lives here:**
- Reflection Engine (generates insights about patterns)
- Writing Evolution Tracker (analyzes writing growth)
- Knowledge Graph Builder (maps concept connections)
- Pattern Recognition (identifies learning style)

**What makes it alive:**
- Knowledge graph grows visibly (new nodes appear after study sessions)
- "Brain age" increases (gamification of actual intellectual growth)
- Insights surprise you ("You didn't realize it, but you've connected thermodynamics to your economics course 4 times this month")
- This page is YOURS — it's your intellectual identity

---

### Page 6: SOCIAL (The Network)

**What the student sees:**

Friends, study rooms, and social learning — but with AI intelligence layered on top.

- Friends list with "compatibility score" (how well you study together)
- Active study rooms (see who's studying what, right now)
- "Suggested study partner" (brain matches you with complementary knowledge)
- Group challenges ("Beat Section B's average this week")
- Friend brain comparison (opt-in: see where you're stronger/weaker than friends)

**AI that lives here:**
- Social Intelligence Agent (learns your social study patterns)
- Study Room Orchestrator (manages multi-student AI tutoring)
- Motivation Engine (social pressure nudges)

**What makes it alive:**
- Real-time presence (like Focus Town, but with actual learning help)
- AI suggests study partners based on complementary gaps
- In-room tutor knows both students and orchestrates learning
- Social proof drives engagement ("Sarah studied 3 hours today")

---

### Page 7: LEADERBOARD (The Arena)

**What the student sees:**

Multiple leaderboard categories, filterable, with real stakes (tokens).

- Nerdmaxing, Grindmaxing, Late Night Maxing, Social Maxing, Brain Maxing, Streak Maxing, Token Maxing, Influencer Maxing
- Filter by: university, city, country, course, friend group, global
- Weekly reset (fresh competition every Monday)
- Token bonuses for top 3 in any category
- "Challenge a friend" button (1v1 study duel)

**AI that lives here:**
- Leaderboard Agent (calculates rankings, detects gaming attempts)
- Motivation Engine (uses leaderboard position in nudges)

**What makes it alive:**
- Weekly reset means everyone has a chance
- Multiple categories mean every type of student can win at something
- Challenge mode creates direct social stakes
- Token bonuses make it worth competing

---

## Part 9: The Chat — What It Must Do

The chat is not a separate feature. It is the nervous system that connects everything. The tutor lives in the chat but reaches into every page.

### Chat Capabilities (Full List)

| Capability | Example | Agent Behind It |
|---|---|---|
| Answer questions about course material | "Explain entropy" | Study Agent + Context Window |
| Help start assignments | "Help me start my Thermo essay" | Assignment Agent |
| Generate study material | "Make me flashcards for Chapter 7" | Study Agent |
| Modify the interface | "Make my background darker" | UI Preference Agent |
| Show brain insights | "What are my weaknesses?" | Reflection Engine |
| Predict grades | "What will I get on the midterm?" | Exam Predictor |
| Manage social | "Invite Sarah to study" | Social Intelligence |
| Set goals | "I want an A in Calculus" | Goal Agent |
| Provide motivation | "I can't focus" | Motivation Engine |
| Connect content | "How does this TikTok relate to my class?" | Content Connector |
| Generate lessons | "Teach me about entropy" | Lesson Generator |
| Professor intel | "What does Prof Chen want in essays?" | Professor Intelligence |
| Manage tokens | "How many tokens do I have?" | Token Agent |
| Control study timer | "Start a 25 min session" | Focus Agent |
| Voice input/output | Student speaks, tutor speaks back | Speech Agent |

### The Chat's Secret Weapon: Context

Every single chat message is enriched with the full brain context window before the AI responds. This means:

- The tutor never gives generic advice
- The tutor references specific things from your past
- The tutor knows what you're working on right now
- The tutor knows your learning style and adapts its explanation format
- The tutor knows your professor and tailors advice to their grading style

This is what makes it impossible to replicate with ChatGPT. ChatGPT knows nothing about you. Your tutor knows everything.

---

## Part 10: What Every Competitor Is Missing (And We Have)

| What's Missing | StudyFetch | Focus Town | Units | Khan Academy | ChatGPT | **FschoolAI** |
|---|---|---|---|---|---|---|
| Memory across sessions | No | No | Partial | No | No | **Yes — Second Brain** |
| Connected to YOUR school | No | No | IS the school | No | No | **Yes — Canvas sync** |
| Proactive (speaks first) | No | No | No | No | No | **Yes — Situation Synthesizer** |
| Social study with AI | No | Timer only | No | No | No | **Yes — Study Rooms + Orchestrator** |
| Personalized interface | No | Character only | No | No | No | **Yes — AI-generated UI** |
| Token economy with real stakes | No | Coins (cosmetic) | No | Points (cosmetic) | No | **Yes — unlocks capabilities** |
| Professor intelligence | No | No | No | No | No | **Yes — grading style analysis** |
| Grade prediction | No | No | No | No | No | **Yes — per-assignment** |
| Compounding intelligence | No | No | Partial | No | No | **Yes — brain gets smarter daily** |
| Works with ANY school | No | N/A | No (IS school) | Generic | Generic | **Yes — Canvas/LMS integration** |
| Data ownership | No | No | No | No | No | **Yes — export your brain** |
| Tailored lessons from YOUR material | Upload-based | No | Their curriculum | Their curriculum | No | **Yes — brain-generated from YOUR gaps** |

---

## Part 11: The Marketing Engine (Built Into the Product)

### Viral Mechanics

**1. Brain Share Card (Identity page)**
Students can generate a shareable card showing their brain stats — knowledge graph, streak, tokens, brain age. This is designed to be shared on Instagram/TikTok stories. "My brain grew 23% this semester."

**2. Study Room Invites**
"Join my study room" links that work for non-users. They see the room, see people studying, see the AI tutor helping — and want to sign up.

**3. Referral Tokens**
Refer a friend → both get 200 tokens. The referred friend gets a "boost" (their brain starts learning faster because the referrer's patterns help calibrate).

**4. Leaderboard Screenshots**
"I'm #1 in Nerdmaxing at UCLA this week" — designed to be screenshotted and shared.

**5. Professor Intelligence Sharing**
"My AI tutor figured out what Prof Chen wants" — word of mouth among classmates.

**6. The Tutor Name**
Students name their tutor. They develop an emotional attachment. They tell friends: "My tutor [name] told me to start my essay differently and I got an A." This is personal. This spreads.

**7. Influencer Maxing Leaderboard**
Students who refer the most friends and create the most study groups earn the "Influencer" badge. This gamifies word-of-mouth.

---

## Part 12: The Compounding Chain (Why Day 100 Kills Day 1)

### Day 1
- Brain is empty
- Tutor gives generic greetings
- No predictions, no professor intel, no patterns
- Interface is default
- Token balance: 0

### Day 30
- Brain has 200+ signals
- Tutor knows your schedule, your courses, your study patterns
- First patterns detected ("you procrastinate on Fridays")
- Grade predictions begin (low confidence)
- Interface customized to your preferences
- Token balance: ~800 (Tier 2 unlocked)

### Day 100
- Brain has 1000+ signals, 50+ patterns, 20+ reflections
- Tutor knows your professors, your writing style, your social dynamics
- Predictions are accurate (validated against 3+ exams)
- Lessons are perfectly calibrated to your gaps
- Interface is fully personalized
- Knowledge graph is rich and interconnected
- Token balance: ~3000 (Tier 3 unlocked)
- The tutor can say: "Remember in September when you struggled with derivatives? You just used them perfectly in your physics assignment without even realizing it. Your brain connected those dots."

### Day 365
- Brain has 5000+ signals, 200+ patterns, 100+ reflections
- The tutor is essentially a cognitive extension of you
- It predicts your struggles before you feel them
- It knows which friends help you and which distract you
- It has a complete map of your intellectual growth
- You cannot imagine studying without it
- Token balance: 5000+ (Brain Owner tier — you own your data)
- Switching cost is infinite — no other app has a year of your cognitive history

---

## Part 13: Build Priority (What to Ship First)

### Phase 0: Make It Not Dead (Week 1-2)
1. Wire chat to Brain DB (currently pointing at intern's personal Supabase)
2. Start the brain scheduler (makes context window work)
3. Situation Synthesizer agent (makes the greeting alive)
4. Token counter (visible on every page, even if earning is limited)

### Phase 1: Core Alive Features (Week 3-6)
1. Personalized lesson sessions (brain-generated from Canvas data)
2. Grade prediction per assignment (even low-confidence is better than nothing)
3. Professor Intelligence (start building profiles from graded work)
4. Token earning for: assignment submission, study sessions, chat usage

### Phase 2: Social Layer (Week 7-10)
1. Friends system (Aryan is building this)
2. Study rooms with in-room AI tutor
3. Leaderboard with real data (not test data)
4. Study room invites (viral mechanic)

### Phase 3: Compounding Features (Week 11-16)
1. Writing Evolution Tracker
2. Knowledge graph (dynamic, from neuro.patterns)
3. Brain Share Card (viral mechanic)
4. AI-generated interface modifications (v1: simple preferences)
5. Content Connector (link outside content to coursework)

### Phase 4: Advanced Intelligence (Week 17+)
1. Exam Predictor (needs enough data to be accurate)
2. Social Intelligence (needs study room data)
3. Motivation Engine (needs pattern data about what works)
4. Full AI-generated interface (v2: complex layout changes)

---

## Part 14: The One Rule

**Every feature must pass this test before shipping:**

> "Does this feature make the brain smarter? Does it write a signal? Does it read the context window? Is Day 100 better than Day 1 because this feature exists?"

If the answer to any of these is no — the feature is dead weight. Redesign it or cut it.

The brain is not a database. It is a living system that grows with the student. Every feature either feeds it or starves it. There is no neutral.

---

*This document is the source of truth for what FschoolAI builds. Every feature decision, every agent design, every UI choice should reference this spec. If something contradicts this document, this document wins.*
