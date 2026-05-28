# Canvas LMS Module

A self-contained, reusable module for integrating with the Canvas LMS REST API.

## Files

| File | Purpose |
|------|---------|
| `canvasConfig.js` | Constants — base URL, API version, per-page limit, allowed domains |
| `canvasAuth.js` | Auth helpers — token validation, session token issuance/fetching |
| `canvasApi.js` | Raw API fetch functions — courses, assignments, submissions, grades, etc. |
| `canvasTransform.js` | Normalization — converts raw Canvas responses into clean app objects |

---

## Quick Start

### 1. Install dependencies

The module uses only Node.js built-ins (`crypto`) and the global `fetch` API
(available natively in Node 18+, browsers, and Netlify/Cloudflare Workers).
No `npm install` required.

### 2. Configure the base URL

Every Canvas institution has its own subdomain:

```js
// e.g. University of British Columbia
const BASE_URL = 'https://canvas.ubc.ca/api/v1';

// e.g. University of Toronto (Quercus)
const BASE_URL = 'https://q.utoronto.ca/api/v1';

// e.g. Generic Instructure-hosted instance
const BASE_URL = 'https://myschool.instructure.com/api/v1';
```

### 3. Get a Canvas access token

In Canvas: **Account → Settings → Approved Integrations → + New Access Token**

Store the token securely — never hardcode it. Read it from an environment
variable or a user-supplied runtime value:

```js
const canvasToken = process.env.CANVAS_TOKEN; // server-side
// or: read from a user form field on the client
```

### 4. Fetch and normalize data

```js
const { fetchCourses, fetchAssignments } = require('./canvasApi');
const { normalizeCourses, normalizeAssignments } = require('./canvasTransform');

async function loadSemester(canvasToken, baseUrl) {
  const rawCourses = await fetchCourses(canvasToken, baseUrl);
  const courses = normalizeCourses(rawCourses);

  const allAssignments = [];
  for (const course of courses) {
    const raw = await fetchAssignments(canvasToken, baseUrl, course.id);
    const normalized = normalizeAssignments(raw, {
      courseId:   course.id,
      courseCode: course.courseCode,
      courseName: course.name,
    });
    allAssignments.push(...normalized);
  }

  return { courses, assignments: allAssignments };
}
```

---

## CORS / Proxy

Canvas blocks direct browser requests from non-Canvas origins. In a browser
app, route all calls through the included `proxy.js` Netlify Function:

```js
// Pass the proxy URL as the last argument to any API function
const PROXY = '/.netlify/functions/proxy';

const rawCourses = await fetchCourses(canvasToken, baseUrl, PROXY);
```

The proxy forwards requests to Canvas and adds CORS headers. It validates
the target URL against `CANVAS_ALLOWED_DOMAINS` to prevent SSRF.

### Environment variables required by proxy.js

| Variable | Description |
|----------|-------------|
| `FS_APP_SECRET` | Server-side HMAC secret for session token signing |
| `ALLOWED_ORIGIN` | Allowed frontend origin (e.g. `https://yourdomain.com`) |

### Environment variables required by init.js

| Variable | Description |
|----------|-------------|
| `FS_APP_SECRET` | Same secret — used to issue tokens |
| `FS_TOKEN_TTL_SECONDS` | Token lifetime in seconds (default: 900 = 15 min) |

---

## Required Canvas API Token Scopes

When creating the access token in Canvas you can optionally restrict it to
specific API endpoints. The following scopes cover all functions in this module:

```
url:GET|/api/v1/users/self
url:GET|/api/v1/users/self/groups
url:GET|/api/v1/courses
url:GET|/api/v1/courses/:id/assignments
url:GET|/api/v1/courses/:id/assignments/:id/submissions/:id
url:GET|/api/v1/announcements
url:GET|/api/v1/conversations
url:GET|/api/v1/conversations/:id
url:GET|/api/v1/courses/:id/modules
url:GET|/api/v1/courses/:id/pages/:url_or_id
url:GET|/api/v1/courses/:id/discussion_topics
url:GET|/api/v1/courses/:id/assignment_groups
```

If you generate a token with **no scope restrictions** it has full read/write
access to the account — fine for development, but restrict scopes for production.

---

## Module API Reference

### `canvasApi.js`

All functions accept `(canvasToken, baseUrl, ..., [proxyUrl])` and return raw
Canvas JSON. Paginated endpoints return the complete flattened array.

| Function | Returns |
|----------|---------|
| `fetchCurrentUser(token, base, proxy?)` | Raw User object |
| `fetchUserGroups(token, base, proxy?)` | Raw Group[] |
| `fetchCourses(token, base, proxy?)` | Raw Course[] (active, with scores) |
| `fetchAssignments(token, base, courseId, proxy?)` | Raw Assignment[] with submissions |
| `fetchSubmission(token, base, courseId, assignId, opts?, proxy?)` | Raw Submission |
| `fetchAnnouncements(token, base, courseIds[], proxy?)` | Raw Announcement[] |
| `fetchConversations(token, base, scope?, proxy?)` | Raw Conversation[] |
| `fetchConversation(token, base, conversationId, proxy?)` | Raw Conversation detail |
| `fetchModules(token, base, courseId, proxy?)` | Raw Module[] with items |
| `fetchPage(token, base, courseId, slug, proxy?)` | Raw Page object |
| `fetchDiscussionTopics(token, base, courseId, proxy?)` | Raw DiscussionTopic[] |
| `fetchAssignmentGroups(token, base, courseId, proxy?)` | Raw AssignmentGroup[] |

### `canvasTransform.js`

All functions are pure and stateless. Input = raw Canvas API object(s).
Output = normalized app object(s).

| Function | Input → Output |
|----------|----------------|
| `normalizeCourse(raw)` | Raw Course → `{ id, name, courseCode, currentScore, ... }` |
| `normalizeCourses(raw[], limit?)` | Raw Course[] → normalized[], filtered |
| `normalizeAssignment(raw, courseMeta?)` | Raw Assignment → `{ id, name, dueAt, submission, ... }` |
| `normalizeAssignments(raw[], courseMeta?)` | Raw Assignment[] → normalized[] |
| `normalizeSubmission(raw)` | Raw Submission → `{ body, score, comments, rubricScores, feedback, ... }` |
| `normalizeAnnouncement(raw)` | Raw Announcement → `{ title, body, postedAt, ... }` |
| `normalizeAnnouncements(raw[])` | Raw Announcement[] → sorted newest-first |
| `normalizeConversationSummary(raw)` | Raw Conversation list item → `{ subject, preview, ... }` |
| `normalizeConversation(raw)` | Raw Conversation detail → `{ messages[], ... }` |
| `normalizeModule(raw)` | Raw Module → `{ name, items[], ... }` |
| `normalizePage(raw)` | Raw Page → `{ title, slug, body (text only), ... }` |
| `normalizeDiscussionTopic(raw)` | Raw DiscussionTopic → `{ title, message, ... }` |
| `normalizeAssignmentGroup(raw)` | Raw AssignmentGroup → `{ name, weight, assignmentIds[], ... }` |
| `normalizeUserGroup(raw)` | Raw Group → `{ name, courseId, ... }` |

### `canvasAuth.js`

| Function | Description |
|----------|-------------|
| `verifySessionToken(token, secret)` | Server-side: verify a short-lived HMAC token |
| `issueSessionToken(secret, ttl?)` | Server-side: mint a new HMAC token |
| `fetchSessionToken(initEndpoint, cache?)` | Client-side: fetch/cache a session token from /init |
| `buildCanvasAuthHeader(canvasToken)` | Returns `{ Authorization: "Bearer ..." }` header |
| `isValidCanvasToken(canvasToken)` | Basic format validation (not a network call) |

---

## Security Notes

- **Never commit a Canvas token** to source control. Use environment variables
  or runtime user input.
- **Never store tokens in `localStorage`** in browser apps — use in-memory only
  and clear on logout.
- The proxy enforces an `SSRF allowlist` (`CANVAS_ALLOWED_DOMAINS`) so that
  arbitrary URLs cannot be forwarded even if the client sends a crafted request.
- Session tokens (`FS_APP_SECRET`) expire after `FS_TOKEN_TTL_SECONDS` seconds
  and are verified with constant-time HMAC comparison to prevent timing attacks.
