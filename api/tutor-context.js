// api/tutor-context.js — Dynamic context fetcher for chatbot agent upgrade
//
// FIRES:  before Claude responds, when the query seems to need live DB data
//         that isn't already in the system prompt
// READS:  Supabase — assignments, courses, flashcards — filtered to what's relevant
//         NeuroAGI Brain DB — brain.context_window (pre-cached student state)
// WRITES: nothing — read-only
// RETURNS: a context string injected into the Claude call as an extra system section
//
// WHAT THIS SOLVES:
//   The system prompt has static context (top 5 assignments, course list, GPA).
//   But students ask specific questions: "What's my score in BIO 101?"
//   "What flashcards do I have for Media Studies?" "Which assignments am I missing?"
//   This endpoint detects those queries and fetches the exact data needed.
//
// BRAIN CONTEXT (NeuroAGI Brain DB):
//   brain.context_window is pre-cached by brain_scheduler (runs in background).
//   It contains: stress_level, momentum_state, active_deadline, recent_summary,
//   what_to_focus_on, what_not_to_mention — all pre-computed, 0ms read latency.
//   This is fetched in PARALLEL with FschoolAI DB queries (Promise.all).
//   Brain DB has ~600ms latency — pre-caching eliminates this from the hot path.
//
// QUERY CLASSIFICATION (done by Claude Haiku — fast, cheap):
//   assignment_detail  → fetch specific assignment(s) matching query
//   course_grades      → fetch all courses with scores
//   missing_late       → fetch missing/late assignments
//   flashcard_detail   → fetch flashcards for a specific course
//   none               → no DB fetch needed (but brain context still returned if available)

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const supabaseUrl  = process.env.SUPABASE_URL;
  const supabaseKey  = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_ANON_KEY;
  // Brain DB env vars (NeuroAGI) — optional, gracefully skipped if not configured
  const brainUrl = process.env.BRAIN_SUPABASE_URL;
  const brainKey = process.env.BRAIN_SUPABASE_KEY;

  if (!anthropicKey || !supabaseUrl || !supabaseKey) {
    return res.status(200).json({ context: null, reason: "missing env" });
  }

  const { userId, userMessage, brainPersonId } = req.body ?? {};
  if (!userId || !userMessage) return res.status(200).json({ context: null });

  const sbHeaders = {
    "apikey":        supabaseKey,
    "Authorization": `Bearer ${supabaseKey}`,
    "Content-Type":  "application/json",
  };

  // ── 0. Fetch brain.context_window in parallel with classification ──────────
  // Pre-cached by brain_scheduler — no 600ms Brain DB penalty on hot path
  let brainContext = null;
  const brainFetch = (brainUrl && brainKey && brainPersonId)
    ? fetch(
        `${brainUrl}/rest/v1/brain.context_window?person_id=eq.${brainPersonId}&select=stress_level,momentum_state,active_deadline,recent_summary,what_to_focus_on,what_not_to_mention&limit=1`,
        {
          headers: {
            "apikey":        brainKey,
            "Authorization": `Bearer ${brainKey}`,
            "Content-Type":  "application/json",
          },
        }
      ).then(r => r.ok ? r.json() : null).catch(() => null)
    : Promise.resolve(null);

  // ── 1. Classify the query ──────────────────────────────────────────────────
  let queryType = "none";
  let keyword   = null;

  try {
    const classifyRes = await fetch("https://api.anthropic.com/v1/messages", {
      method:  "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-haiku-4-5-20251001",
        max_tokens: 40,
        messages:   [{
          role: "user",
          content: `Classify this student query for a DB lookup. Return JSON only: {"type":"assignment_detail"|"course_grades"|"missing_late"|"flashcard_detail"|"none","keyword":"extracted course/assignment name or null"}

Query: "${userMessage.slice(0, 200)}"

Examples:
"What's my score in BIO 101?" → {"type":"course_grades","keyword":"BIO 101"}
"Which assignments am I missing?" → {"type":"missing_late","keyword":null}
"Show me my Physics flashcards" → {"type":"flashcard_detail","keyword":"Physics"}
"What's due for Media Studies essay?" → {"type":"assignment_detail","keyword":"Media Studies"}
"How's my GPA?" → {"type":"none","keyword":null}
"What's up?" → {"type":"none","keyword":null}`,
        }],
      }),
    });

    if (classifyRes.ok) {
      const data = await classifyRes.json();
      const text = data.content?.[0]?.text?.trim() ?? "{}";
      // Strip possible markdown fences
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      queryType = parsed.type  ?? "none";
      keyword   = parsed.keyword ?? null;
    }
  } catch { /* fall through to none */ }

  // Await brain context (was fetched in parallel with classification)
  const brainRows = await brainFetch;
  const brainWindow = brainRows?.[0] ?? null;
  if (brainWindow) {
    const parts = [];
    if (brainWindow.stress_level != null)  parts.push(`stress level: ${(brainWindow.stress_level * 10).toFixed(0)}/10`);
    if (brainWindow.momentum_state)        parts.push(`momentum: ${brainWindow.momentum_state}`);
    if (brainWindow.active_deadline)       parts.push(`active deadline: ${brainWindow.active_deadline}`);
    if (brainWindow.recent_summary)        parts.push(`\nRecent student context: ${brainWindow.recent_summary}`);
    if (brainWindow.what_to_focus_on)      parts.push(`\nFocus on: ${brainWindow.what_to_focus_on}`);
    if (brainWindow.what_not_to_mention)   parts.push(`\nAvoid mentioning: ${brainWindow.what_not_to_mention}`);
    if (parts.length) {
      brainContext = `STUDENT BRAIN STATE (NeuroAGI):\n${parts.join(" | ")}`;
    }
  }

  if (queryType === "none") {
    // Even if no DB query needed, return brain context if available
    return res.status(200).json({ context: brainContext });
  }

  // ── 2. Fetch relevant data ─────────────────────────────────────────────────
  let context = null;

  try {
    if (queryType === "course_grades") {
      // All courses with scores
      let url = `${supabaseUrl}/rest/v1/courses?user_id=eq.${userId}&select=name,course_code,current_score,final_score&order=name.asc`;
      if (keyword) url += `&or=(name.ilike.*${encodeURIComponent(keyword)}*,course_code.ilike.*${encodeURIComponent(keyword)}*)`;
      const r = await fetch(url, { headers: sbHeaders });
      if (r.ok) {
        const rows = await r.json();
        if (rows.length) {
          context = "LIVE GRADE DATA:\n" + rows
            .map(c => `• ${c.course_code ?? ""} ${c.name}: current ${c.current_score ?? "N/A"}%, final ${c.final_score ?? "N/A"}%`)
            .join("\n");
        }
      }
    }

    else if (queryType === "missing_late") {
      const r = await fetch(
        `${supabaseUrl}/rest/v1/assignments?user_id=eq.${userId}&or=(missing.eq.true,late.eq.true)&select=title,due_at,missing,late,score,points_possible&order=due_at.desc&limit=15`,
        { headers: sbHeaders }
      );
      if (r.ok) {
        const rows = await r.json();
        if (rows.length) {
          context = "MISSING / LATE ASSIGNMENTS:\n" + rows
            .map(a => `• ${a.title} — ${a.missing ? "MISSING" : "LATE"} — due ${a.due_at ? new Date(a.due_at).toLocaleDateString() : "unknown"}${a.score != null ? ` — scored ${a.score}/${a.points_possible}` : ""}`)
            .join("\n");
        } else {
          context = "MISSING / LATE ASSIGNMENTS: None found — all caught up.";
        }
      }
    }

    else if (queryType === "assignment_detail") {
      let url = `${supabaseUrl}/rest/v1/assignments?user_id=eq.${userId}&select=title,due_at,score,points_possible,missing,late,submitted_at&order=due_at.asc&limit=20`;
      if (keyword) url += `&title=ilike.*${encodeURIComponent(keyword)}*`;
      const r = await fetch(url, { headers: sbHeaders });
      if (r.ok) {
        const rows = await r.json();
        if (rows.length) {
          context = "ASSIGNMENT DETAILS:\n" + rows
            .map(a => [
              `• ${a.title}`,
              a.due_at        ? `due ${new Date(a.due_at).toLocaleDateString()}` : null,
              a.score != null ? `score ${a.score}/${a.points_possible}` : null,
              a.submitted_at  ? `submitted` : null,
              a.missing       ? "MISSING" : null,
              a.late          ? "LATE"    : null,
            ].filter(Boolean).join(" | "))
            .join("\n");
        }
      }
    }

    else if (queryType === "flashcard_detail") {
      // Find course_id first
      let courseUrl = `${supabaseUrl}/rest/v1/courses?user_id=eq.${userId}&select=id,name,course_code`;
      if (keyword) courseUrl += `&or=(name.ilike.*${encodeURIComponent(keyword)}*,course_code.ilike.*${encodeURIComponent(keyword)}*)`;
      const cr = await fetch(courseUrl, { headers: sbHeaders });
      if (cr.ok) {
        const courses = await cr.json();
        if (courses.length) {
          const courseId = courses[0].id;
          const fr = await fetch(
            `${supabaseUrl}/rest/v1/flashcards?user_id=eq.${userId}&course_id=eq.${courseId}&select=cards`,
            { headers: sbHeaders }
          );
          if (fr.ok) {
            const frows = await fr.json();
            const cards = frows?.[0]?.cards;
            if (cards?.length) {
              context = `FLASHCARDS for ${courses[0].name}:\n` + cards
                .slice(0, 8)
                .map(c => `Q: ${c.question}\nA: ${c.answer}`)
                .join("\n---\n");
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("[tutor-context] fetch error:", err.message);
  }

  // Merge brain context with DB context
  if (brainContext && context) {
    context = `${brainContext}\n\n${context}`;
  } else if (brainContext) {
    context = brainContext;
  }

  return res.status(200).json({ context });
}
