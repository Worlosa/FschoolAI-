# Aryan's Next Steps

**For:** Aryan (extension lead)  
**Updated:** June 2026  
**Read first:** `MEMORY_ARCHITECTURE.md`, `EXTENSION_ARCHITECTURE.md`

---

## This Week's Priority Order

### Step 1 — Fix the Wrong Supabase Project URL (Today, 10 minutes)

Your Claude flagged this in the memory spec. It's the most urgent thing.

The extension and/or app `.env` is pointing at `yjiqqattsefunpbuewlk` (old/wrong project) instead of `wqgxpouhbwhwpzudrptp` (the live FschoolAI production DB).

**Check every `.env` file in your local repo:**
```
SUPABASE_URL should be: https://wqgxpouhbwhwpzudrptp.supabase.co
```

If any file has `yjiqqattsefunpbuewlk`, fix it. Also check the Vercel environment variables for your deployment — if the wrong URL is there, data has been silently going to a ghost database.

---

### Step 2 — Merge `fix/extension-neuroagi-schema` (Today, 30 minutes)

Your 2-file fix (changing the extension to write to `neuroagi` schema instead of `public`) is sitting on `fix/extension-neuroagi-schema` and not merged. This is the fix for the `courses_source_check` error (23514).

Open a PR from `fix/extension-neuroagi-schema` → `extension/dev`. Tag Johan for review. It's a small, clean fix.

---

### Step 3 — Push `MEMORY_ARCHITECTURE.md` to Main (Today, 5 minutes)

Your Claude wrote an excellent memory architecture spec. It's now on `main` as `MEMORY_ARCHITECTURE.md` with one clarification added (the distinction between `neuroagi.files` and `public.course_content`). Read it and confirm you agree with the clarification note in Section 3.

---

### Step 4 — Start Phase 0: JWT Auth (This Week)

This is the gate for everything else. Until JWT auth is in place, storing file contents is a security risk (open RLS + anon key writing directly from extension = breach surface).

**What to build:**
1. On extension login: call Supabase Auth to get a JWT token
2. Store the JWT in `chrome.storage.local` (not `localStorage`)
3. Include `Authorization: Bearer <jwt>` on every API call to the backend
4. Remove the hardcoded anon key from the extension entirely

**File to modify:** `extension/background.js` — replace the custom SHA-256 auth with Supabase Auth JWT.

See `EXTENSION_ARCHITECTURE.md` → Gap 1 section for the exact code to replace.

---

### Step 5 — Add These Two Fields to Every Extension Request (This Week)

Once Johan has the backend extension routes live (`/api/extension/sync`, `/api/extension/content`), every request from the extension needs two new fields that are currently missing:

**`university_id`** — derive from the LMS URL:
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

**`professor_name`** — when capturing rubrics or graded feedback, extract the professor name from the page (it's usually in the course header or the feedback section on Canvas). Include it in the request body.

These two fields power the shared library dedup and the Professor Intelligence agent. Without them, the library can't be scoped by university and professor profiles can't be built.

---

### Step 6 — Fix the Extension Manifest Name (Quick Win, 2 minutes)

```json
// extension/manifest.json
"name": "FschoolAI"
// or: "name": "Reggie by FschoolAI"
```

Students currently see "NeuroAgi" in their Chrome extensions list. This should match the product brand.

---

## What You're Waiting On From Johan

Before you can test Phase 1 end-to-end, Johan needs to complete:

- **Gap 1:** `user_id` → `person_id` bridge (`backend/server/utils/person-bridge.ts`)
- **Gap 2:** Extension backend routes (`backend/server/routes/extension.ts`) — specifically `/api/extension/sync`, `/api/extension/signal`, `/api/extension/content`, `/api/extension/library/exists`

Once those are live, Johan will give you the Railway backend URL and confirm JWT auth is required. Then you switch the extension from calling Supabase directly to calling the backend API.

---

## The Two Tables You're Working With

Do not confuse these — they are different tables serving different purposes:

| Table | What It Stores | Where | Owned By |
|---|---|---|---|
| `neuroagi.files` | Student's personal files — essays, notes, uploaded PDFs, files they synced | NeuroAGI Brain DB | The student (deletable) |
| `public.course_content` | Shared course library — lectures, syllabi, rubrics (same for all students in a course) | FschoolAI DB | FschoolAI (never deleted by student) |

Your extension sends to both. When a student syncs a file they uploaded → `neuroagi.files`. When the extension captures a lecture page or rubric from the LMS → `public.course_content` (via `/api/extension/content`).

See `LIBRARY_ARCHITECTURE.md` for the full shared library design.

---

## Summary

| Task | When | Time |
|---|---|---|
| Fix wrong Supabase URL | Today | 10 min |
| Merge `fix/extension-neuroagi-schema` | Today | 30 min |
| Read + confirm `MEMORY_ARCHITECTURE.md` | Today | 15 min |
| Phase 0: JWT auth in extension | This week | 2–3 hrs |
| Add `university_id` + `professor_name` to requests | This week | 1 hr |
| Fix manifest name | Anytime | 2 min |
