# FschoolAI Chrome Extension

Migrated from `pr3tik/NeuroAgi:extension-aryan` into the main FschoolAI- repo.

## Current Status

**v1 (this branch):** Extension writes directly to Supabase. DO NOT publish — security issues documented in AUDIT.md.

**v2 (in progress):** Extension will call FschoolAI backend API instead of Supabase directly. Backend routes are being built now.

---

## v2 Architecture (what Aryan needs to implement)

Replace all direct Supabase calls in `background.js` and `popup/popup.js` with calls to these backend routes:

| Route | What to send | Replaces |
|---|---|---|
| `POST /api/extension/sync` | Canvas data, grades, assignments | Direct Supabase upserts for structured academic data |
| `POST /api/extension/content` | Syllabus, lecture notes, course pages | Direct Supabase upserts for course content |
| `POST /api/extension/signal` | Page time, scroll behavior, stress patterns | Nothing currently — brain signals are missing entirely in v1 |

All requests must include the user's auth token in the `Authorization: Bearer <token>` header. The backend handles routing to the correct database.

---

## Setup (for local development)

```bash
# Load the extension in Chrome
# 1. Go to chrome://extensions
# 2. Enable Developer Mode
# 3. Click "Load unpacked"
# 4. Select this extension/ folder
```

## File Structure

```
extension/
  manifest.json       ← Chrome extension config (v3)
  background.js       ← Service worker: handles sync, API calls, Supabase writes
  content/
    universal.js      ← Content script: auto-captures page data on any university portal
  popup/
    popup.html        ← Extension popup UI
    popup.js          ← Popup logic: login, signup, capture button
  AUDIT.md            ← Security issues to fix before publishing (READ THIS)
```

## Security Issues (must fix before Chrome Web Store submission)

See `AUDIT.md` for full details. Critical items:
1. Move auth to backend — never call Supabase directly from extension
2. Remove anon key from extension JS
3. Canvas tokens must never be client-readable

---

**Branch:** `extension/dev`  
**Repo:** `vincentyang0702-pixel/FschoolAI-`  
**Original source:** `pr3tik/NeuroAgi:extension-aryan`
