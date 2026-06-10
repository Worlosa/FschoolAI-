# 李小雷 — Technical Onboarding & Architecture Brief

**Welcome.** This document is written specifically for you. It is not a generic developer onboarding guide — it is a direct continuation of the conversation you had with Vincent on WeChat, translated into a technical architecture brief that gives you everything you need to understand the system and make decisions about it.

Read this before looking at any code.

---

## The One-Line Summary

FschoolAI is a **stateless academic agent layer**. NeuroAGI is a **stateful personal brain**. They are connected by a Brain ID — exactly like Apple ID connects an iPhone to iCloud. You confirmed this architecture in your WeChat conversation. This document formalises it.

---

## Part 1 — The Architecture You Validated

### The Stateful / Stateless Split

This is the most important architectural decision in the entire system. You raised it directly:

> *"NeuroAGI只做个人大脑，是有状态的。而FschoolAI是无状态的"*

This is now the foundational design principle. Here is what it means in practice:

| Layer | System | State | Responsibility |
|---|---|---|---|
| **Brain** | NeuroAGI | **Stateful** | Stores the user's knowledge graph, cognitive patterns, signal history, learned abstractions, and Brain ID. Persists forever across all apps. |
| **Agent Layer** | FschoolAI | **Stateless** | Academic agents that read from the brain, act, and return results. Hold no persistent state themselves. |
| **Domain Data** | FschoolAI Library | **Stateless** | Shared course content, syllabi, professor data, rubrics. Scoped by university. Never enters the brain raw. |

The analogy you used — **Apple ID** — is exactly right. A user registers on FschoolAI, and a NeuroAGI Brain ID is created simultaneously. Every FschoolAI agent reads from and writes learned signals back to that Brain ID. When the student graduates and moves to NeuroAGI directly, the brain continues compounding. FschoolAI was just the entry point.

### The Domain Data Contradiction — Your Insight

You identified a hard problem:

> *"如果不进大脑，很多深层的需求是不会被激活的。比如一个学生在音乐上有天赋，他在音乐课堂的表现，在FschoolAI里。但brain不知道，brain没有领域数据，那这时候有一个活动agent注册进来的时候，音乐相关的活动，大脑不一定会把两个agent的数据给串联起来"*

This is the core tension: if domain data never enters the brain, cross-agent intelligence is impossible. But if all domain data enters the brain, you get data bloat and management complexity.

**The resolution Vincent proposed and you accepted:**

> *"只有第二大脑学习到的东西才进大脑"*

In engineering terms: only **learned abstractions** enter NeuroAGI — not raw data.

| Raw Data (stays in FschoolAI) | Learned Abstraction (enters NeuroAGI brain) |
|---|---|
| Music 201 score: 94/100 | `music_performance_signal: strong, consistent` |
| PSYC 201 lecture transcript | `knowledge_gap: classical vs operant conditioning` |
| 2.5h stats study session log | `engagement_pattern: deep focus, evening, visual` |
| Canvas assignment submission | `assignment_behaviour: early submitter, 3+ drafts` |

The brain holds **signals, patterns, and gaps** — not documents. The FschoolAI Library holds the documents. This prevents bloat and enables the cross-agent intelligence you described.

### The Brain SDK Vision

You validated the ecosystem play:

> *"然后我们之后其他公司也是这样搞。开发者来我们生态也这么搞。Brain SDK。FschoolAI数据放图书馆。但是用户跟AI大脑想的knowledge回neuro大脑"*

This is the platform moat. The Brain SDK is the API that lets any third-party app register agents into the NeuroAGI ecosystem. Each partner app:
1. Registers agents via the Brain SDK
2. Reads from the user's NeuroAGI brain (with permission)
3. Writes learned signals back to the brain
4. Stores domain/raw data in their own library (not the brain)

FschoolAI is the **first** Brain SDK partner — and also the proof of concept that the architecture works.

### Your Concern About Complexity

You said:

> *"现在的问题是设计的太复杂了，至少对于你第一个版本"*

This is correct. The v1 simplification plan is:

- **V1 (now):** FschoolAI and NeuroAGI share the same Supabase instance. The brain is a logical separation — a `neuroagi` schema within the same database. A `brain_client.ts` abstraction layer makes the brain feel separate even though it is not yet.
- **V2 (2026 Q1):** NeuroAGI gets its own database and service. FschoolAI calls the NeuroAGI API instead of writing directly to Supabase. The `brain_client.ts` abstraction makes this a config change, not a rewrite.
- **V3+ (Web5):** NeuroAGI brain moves to a user-controlled DWN (Decentralised Web Node). The brain is no longer on NeuroAGI's servers — it belongs to the user.

---

## Part 2 — The Current System

### What Is Built

The codebase is a **React + Supabase + Claude** application. Here is what exists and works:

| Component | Status | Notes |
|---|---|---|
| Reggie chat interface | ✅ Working | Claude-powered, reads from brain context |
| Canvas Chrome extension | ✅ Working (v1.10.0) | Syncs courses, assignments, grades to Supabase |
| Voice (ElevenLabs TTS) | ✅ Working | Reggie can speak responses |
| Nightly reflection | ✅ Designed, partially built | Background job that runs while student sleeps |
| Study Room | ✅ Designed, partially built | Multi-student collaborative sessions |
| Professor Intelligence | ✅ Designed, not built | Agent that builds professor profiles |
| Exam Predictor | ✅ Designed, not built | Predicts likely exam questions from syllabus |
| Library Analysis | ✅ Designed, not built | Shared course content analysis |

### The Tech Stack

```
Frontend:    React 19 + Tailwind 4 + shadcn/ui
Backend:     Node.js / Express (Vercel serverless)
Database:    Supabase (PostgreSQL)
AI:          Anthropic Claude (claude-3-5-sonnet)
Voice:       ElevenLabs TTS + Whisper STT
Extension:   Chrome Manifest V3 (vanilla JS)
Auth:        Supabase Auth (JWT)
Hosting:     Vercel (frontend + API routes)
```

### The Database Schema (Key Tables)

All tables are in the `neuroagi` schema — this is the brain layer:

```
neuroagi.users              — student profiles + Brain ID
neuroagi.courses            — enrolled courses (synced from Canvas)
neuroagi.assignments        — assignments + grades (synced from Canvas)
neuroagi.brain_signals      — learned signals from all interactions
neuroagi.knowledge_gaps     — identified gaps per subject
neuroagi.study_sessions     — study session logs
neuroagi.reflections        — nightly reflection outputs
neuroagi.course_content     — shared library (university-scoped)
```

---

## Part 3 — The Agent Architecture

### The 14 Agents

FschoolAI has 14 agents. Each is stateless — they read from the brain, act, and return. The brain is the only thing that persists.

| Agent | What It Does | Status |
|---|---|---|
| **Reggie (Orchestrator)** | Routes user intent to the right agent, synthesises responses | ✅ Built |
| **Context Window Writer** | Builds the brain context injected into every Claude call | ✅ Built |
| **Hypothesis Engine** | Forms predictions about what the student needs before they ask | 🔧 Partial |
| **Autonomous Reflection** | Nightly brain consolidation — runs while student sleeps | 🔧 Partial |
| **Professor Intelligence** | Builds professor profiles from syllabus + past student data | 📋 Designed |
| **Library Analysis** | Analyses shared course content for patterns and gaps | 📋 Designed |
| **Motivation Engine** | Proactive nudges when student is at risk of falling behind | 📋 Designed |
| **Extension Scrape** | Chrome extension data ingestion and structuring | ✅ Built |
| **Exam Predictor** | Predicts likely exam questions from syllabus + professor patterns | 📋 Designed |
| **Lesson Generator** | Creates personalised lessons from identified knowledge gaps | 📋 Designed |
| **Social Intelligence** | Study Room orchestration and peer learning facilitation | 📋 Designed |
| **Voice Preference** | Adapts Reggie's communication style to the student's preferences | 🔧 Partial |
| **Canvas Sync** | Processes and structures data from the Chrome extension | ✅ Built |
| **Brain SDK Router** | Routes third-party agent requests to/from the brain (future) | 📋 Designed |

### How an Agent Call Works

```
Student message
    ↓
Reggie (Orchestrator) — classifies intent
    ↓
Context Window Writer — builds brain context (courses, gaps, signals, history)
    ↓
Target Agent — receives context + message, calls Claude
    ↓
Claude response
    ↓
Brain Signal Writer — extracts learned signals, writes back to neuroagi schema
    ↓
Response to student
```

Every agent call is stateless. The brain context is rebuilt fresh on every call from the `neuroagi` schema. This is why the schema design is critical — it is the brain's working memory.

---

## Part 4 — The Chrome Extension

### What It Does

The extension is a Manifest V3 Chrome extension that:
1. Detects when a student is on a Canvas/LMS page
2. Calls the Canvas API directly using the student's existing login session (no password needed)
3. Extracts courses, assignments, grades, and file attachments
4. Writes structured data to the `neuroagi` schema via Supabase

### Current State (v1.10.0)

The extension is working and has been updated to v1.10.0. Key files:

```
extension/
├── background.js       — Service worker: Canvas API calls + Supabase writes
├── content/
│   └── universal.js    — Content script: detects LMS pages
├── popup/
│   ├── popup.html      — Extension UI
│   └── popup.js        — Popup logic + manual sync trigger
├── shared-sync.js      — Canvas LMS API integration (new in v1.10.0)
└── manifest.json       — Extension config (v1.10.0, Manifest V3)
```

### Known Issues to Fix

| Issue | Priority | Effort |
|---|---|---|
| Hardcoded anon key — no JWT auth | High | 2–3 hrs |
| Missing `university_id` in sync payloads | Medium | 1 hr |
| Missing `professor_name` in sync payloads | Medium | 1 hr |
| Manifest name still says "NeuroAgi" | Low | 2 min |
| Schema fix branch not yet merged | High | 30 min |

---

## Part 5 — The Team

| Person | Role | GitHub | Notes |
|---|---|---|---|
| Vincent | Founder / Product | `vincentyang0702-pixel` | Product decisions, brand, strategy |
| Johan | CTO / Backend | `johannaresh` | Backend routes, Supabase schema, API contracts |
| Pratik | Frontend Lead | `pr3tik` | React frontend, UI components |
| 李小雷 | Tech Lead / Architecture | TBD | You — overall architecture, extension, Brain SDK |

**Your working relationship:** You report to Vincent on product direction. You work with Johan on the brain/agent architecture. You own the extension and the Brain SDK design.

---

## Part 6 — Key Documents to Read

Read these in order. They are all on the `main` branch of the GitHub repo.

| Document | What It Covers | Read Time |
|---|---|---|
| `MEMORY_ARCHITECTURE.md` | How the brain stores data — the most important doc | 15 min |
| `ARCHITECTURE_V2_STATEFUL_STATELESS.md` | The stateful/stateless split you validated — formalised | 10 min |
| `EXTENSION_ARCHITECTURE.md` | Chrome extension architecture + known gaps | 10 min |
| `LIBRARY_ARCHITECTURE.md` | Shared course library design | 8 min |
| `ALIVE_PRODUCT_SPEC.md` | Full product specification | 20 min |
| `FEATURE_AND_AGENT_MAP.md` | All 14 agents mapped to features | 10 min |
| `WEB5_BRAIN_OS.md` | The long-term Web5 vision (Phase 3+) | 15 min |
| `doc3_web5_scenarios.md` | Web5 user scenarios with trajectories | 10 min |
| `trajectories/` | 10 COCO-format agent trajectory JSONs | Reference |

---

## Part 7 — Your First Week

### Day 1
- Clone the repo and read `MEMORY_ARCHITECTURE.md` and `ARCHITECTURE_V2_STATEFUL_STATELESS.md`
- Load the extension in Chrome (`chrome://extensions` → Developer mode → Load unpacked → select `/extension`)
- Read `EXTENSION_ARCHITECTURE.md` and understand the current auth gap

### Days 2–3
- Merge `fix/extension-neuroagi-schema` into `extension/dev`
- Fix the manifest name to `"Reggie by FschoolAI"`
- Add JWT auth to the extension popup (replace hardcoded anon key)

### Days 4–5
- Add `university_id` and `professor_name` to all sync payloads
- Review Johan's backend extension routes and align on the API contract for switching from direct Supabase writes to backend API calls

### Week 2+
- Design the `brain_client.ts` abstraction layer (the V1 → V2 migration path)
- Begin scoping the Brain SDK interface
- Work with Vincent on the edge cases you flagged: *"我要思考一些边缘场景"* — specifically the domain data rule and cross-agent signal correlation

---

## Part 8 — Open Questions (From Your WeChat Conversation)

These are the questions you said you needed to think about. They are documented here so they do not get lost:

1. **Domain data rule edge cases** — When a learned signal from one domain (music) should activate an agent in another domain (extracurricular activity), how does the brain route this without importing raw domain data?

2. **Hardware boundary** — You agreed that hardware changes the stateful/stateless boundary. What is the minimum viable hardware integration for V2? What signals does the device capture that the app cannot?

3. **Most efficient FschoolAI ↔ NeuroAGI ↔ hardware connection** — You said *"这些全部怎么连接最高效"*. The current answer is `brain_client.ts` abstraction + Brain SDK. Is there a better pattern?

4. **Agent vs dead agent** — You noted that current market agents are "dead agents" — stateless, no memory. The NeuroAGI brain is what makes FschoolAI agents "alive". What is the minimum brain state required to make an agent feel alive vs dead?

---

*Last updated: June 2026. Written for 李小雷 joining as Tech Lead.*
