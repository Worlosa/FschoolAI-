# New Developer Handoff — FschoolAI Extension

**Welcome to FschoolAI.** This document is your complete orientation. Read it top to bottom before touching any code.

---

## Who You Are Replacing

You are taking over from Aryan (GitHub: `a1desai`), who built the Chrome extension that syncs Canvas/LMS data into FschoolAI. His access has been fully revoked. His unfinished work is on the `extension/dev` branch waiting for you.

---

## The Team

| Person | Role | GitHub | Contact |
|---|---|---|---|
| Vincent | Founder / Product | `vincentyang0702-pixel` | — |
| Johan | CTO / Backend | `johannaresh` | johannaresh@gmail.com |
| Pratik | Frontend Lead | `pr3tik` | pratik2k08@gmail.com |
| You | Extension / Chrome | TBD | — |

**Your primary working relationship is with Johan.** He owns the backend routes your extension calls. Pratik owns the React frontend. Vincent owns product decisions.

---

## Codebase Overview

```
FschoolAI/
├── extension/          ← YOUR DOMAIN — Chrome extension (Manifest V3)
│   ├── background.js   ← Service worker: Claude extraction + Supabase writes
│   ├── content/
│   │   └── universal.js ← Content script: scrapes LMS pages
│   ├── popup/
│   │   ├── popup.html  ← Extension popup UI
│   │   └── popup.js    ← Popup logic
│   └── manifest.json   ← Extension config (currently broken — see Task 4)
│
├── backend/
│   └── server/
│       ├── routes/     ← Johan's API routes (agents, brain, canvas, chat, voice)
│       └── services/   ← voice-service.ts (ElevenLabs TTS)
│
├── agents/             ← Agent spec docs (read these to understand the product)
├── design/             ← Architecture docs (VOICE_ARCHITECTURE.md etc.)
├── MEMORY_ARCHITECTURE.md  ← How the brain stores data — READ THIS FIRST
├── LIBRARY_ARCHITECTURE.md ← How the shared course library works
├── EXTENSION_ARCHITECTURE.md ← Extension-specific architecture — READ THIS
└── ARYAN_NEXT_STEPS.md ← Aryan's original task list (now superseded by this doc)
```

---

## How the Extension Works (Current State)

The extension is a **Manifest V3 Chrome extension** that:

1. **Scrapes** Canvas/LMS pages via `content/universal.js` (runs on every page load)
2. **Extracts** structured academic data (courses, assignments, grades) by calling Claude via a Vercel proxy at `https://neuro-agi-topaz.vercel.app/api/claude`
3. **Writes** the structured data directly to Supabase using the publishable anon key

**Current auth model (insecure — your job to fix):**
```javascript
const SUPABASE_ANON = "sb_publishable_e-3KMudaL-iXf5GGsuiQaA_VW21ZZFA";
// This key is hardcoded and used for all writes — no user identity
```

**Target auth model (what you need to build):**
- User logs in via Supabase Auth in the popup
- JWT token stored in `chrome.storage.local`
- Every request includes `Authorization: Bearer <jwt>` with the user's actual JWT
- No hardcoded keys anywhere

---

## The Two Databases You Write To

Do not confuse these — they are different tables for different purposes:

| Table | What It Stores | Schema | Who Owns It |
|---|---|---|---|
| `users` | Student profile, preferences | `public` | FschoolAI |
| `courses` | Student's enrolled courses | `public` | FschoolAI |
| `assignments` | Student's assignments + grades | `public` | FschoolAI |
| `course_content` | Shared course library (lectures, syllabi, rubrics) | `public` | FschoolAI (never deleted by student) |
| `files` | Student's personal files (essays, notes, uploads) | `neuroagi` | The student (deletable) |

The extension currently writes to `public` schema. The `fix/extension-neuroagi-schema` branch fixes a bug where it was accidentally writing to the wrong schema for some tables.

---

## Your 5 Tasks — In Order

### Task 1 — Merge the Schema Fix (Today, 30 minutes)

The branch `fix/extension-neuroagi-schema` contains a 2-file fix that corrects the extension to write to the `neuroagi` schema for personal files (instead of `public`). This was Aryan's last commit and it was never merged.

```bash
git checkout extension/dev
git merge origin/fix/extension-neuroagi-schema
# Resolve any conflicts (there should be none — it's a small fix)
git push origin extension/dev
```

Then open a PR from `extension/dev` → `main` and tag Johan for review.

---

### Task 2 — Fix the Manifest Name (2 minutes)

Students currently see **"NeuroAgi"** in their Chrome extensions list. This is wrong.

Open `extension/manifest.json` and change:
```json
"name": "NeuroAgi"
```
to:
```json
"name": "Reggie by FschoolAI"
```

---

### Task 3 — Add `university_id` and `professor_name` to Every Request (This Week, 1 hour)

These two fields are missing from every sync request. Without them:
- The shared library cannot be scoped by university
- Professor Intelligence agent cannot build professor profiles

**Add this function to `background.js`:**
```javascript
function detectUniversityId(url) {
  const hostname = new URL(url).hostname;
  const mappings = {
    'canvas.utoronto.ca': 'uoft',
    'q.utoronto.ca': 'uoft',
    'canvas.ubc.ca': 'ubc',
    'canvas.mcmaster.ca': 'mcmaster',
    'canvas.mit.edu': 'mit',
    'canvas.stanford.edu': 'stanford',
  };
  return mappings[hostname] || hostname.replace(/[^a-z0-9]/g, '_');
}
```

Include `university_id: detectUniversityId(tab.url)` in every Supabase write payload.

For `professor_name`: extract it from the Canvas course header when scraping. It is usually in a `<span>` or `<div>` with class `instructor-info` or similar. Include it in assignment and course payloads.

---

### Task 4 — Phase 0: JWT Auth (This Week, 2–3 hours)

This is the most important security task. The extension currently uses a hardcoded publishable key for all writes. This means any student's data could be written by anyone who has the key.

**What to build in `extension/popup/popup.js`:**
```javascript
// On login button click:
const { data, error } = await supabase.auth.signInWithPassword({
  email: userEmail,
  password: userPassword
});
if (data.session) {
  await chrome.storage.local.set({ jwt: data.session.access_token });
}
```

**What to change in `extension/background.js`:**
```javascript
// Replace hardcoded SUPABASE_ANON with:
const { jwt } = await chrome.storage.local.get('jwt');
// Use jwt in all fetch headers:
headers: {
  "apikey": SUPABASE_ANON,  // still needed for PostgREST
  "Authorization": `Bearer ${jwt}`,  // user's actual JWT
}
```

See `EXTENSION_ARCHITECTURE.md` → Gap 1 section for the exact lines to replace.

---

### Task 5 — Switch to Backend API Routes (After Johan Confirms)

Currently the extension calls Supabase directly. The target architecture is:
- Extension → Johan's backend API → Supabase

You are **waiting on Johan** to finish these routes:
- `POST /api/extension/sync` — receives scraped course/assignment data
- `POST /api/extension/signal` — receives study signals
- `POST /api/extension/content` — receives shared library content
- `GET /api/extension/library/exists` — checks if content already exists

Once Johan gives you the backend URL and confirms JWT is required, switch `background.js` to call the backend instead of Supabase directly.

---

## Environment Setup

```bash
# Clone the repo
git clone https://github.com/vincentyang0702-pixel/FschoolAI-.git
cd FschoolAI-

# Check out the extension branch
git checkout extension/dev

# Load the extension in Chrome
# 1. Open chrome://extensions
# 2. Enable "Developer mode" (top right)
# 3. Click "Load unpacked"
# 4. Select the /extension folder
```

You do not need Node.js or any build step — the extension is vanilla JavaScript.

**You will need from Vincent:**
- `ANTHROPIC_API_KEY` — for local testing (ask Vincent directly, never commit it)
- Supabase credentials — already in the extension as the publishable key (safe for now, replaced in Task 4)

---

## What Is Already Working

- Canvas page scraping via `content/universal.js` ✅
- Claude extraction of courses, assignments, grades ✅
- Supabase writes for courses and assignments ✅
- Extension popup UI ✅
- PR #1 merged (extension integrated with main app schema) ✅

---

## Key Docs to Read (In This Order)

1. `MEMORY_ARCHITECTURE.md` — how the brain stores data
2. `EXTENSION_ARCHITECTURE.md` — your specific architecture + known gaps
3. `LIBRARY_ARCHITECTURE.md` — how the shared course library works
4. `agents/voice-preference-agent.md` — context on the broader agent system
5. `ARYAN_NEXT_STEPS.md` — Aryan's original notes (for historical context only, superseded by this doc)

---

## Questions?

- **Product / what to build next** → Vincent
- **Backend routes / API contracts** → Johan
- **Frontend integration** → Pratik
- **Architecture decisions** → Read the docs first, then ask Johan

---

*Last updated: June 2026. Written for the developer replacing Aryan on the Chrome extension.*
