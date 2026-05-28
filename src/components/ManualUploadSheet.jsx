// ManualUploadSheet.jsx — Manual course/assignment upload via AI parsing (Groq).
// Triggered by the dashed "+" card at the bottom of the Canvas course list.
// Steps: 0=input  1=parsing  2=review  3=saved

import { useState, useRef } from "react";
import { groq } from "../api/groq";
import { supabase } from "../api/supabase";
import { useApp } from "../context/AppContext";

/* ─── Groq system prompt ────────────────────────────────────── */

const SYSTEM = `You are a course data extractor. Given a syllabus, assignment sheet, or any academic text, extract course info.
Return ONLY valid JSON — no markdown fences, no explanation:
{
  "courseName": string,
  "courseCode": string | null,
  "assignments": [{ "name": string, "dueDate": string | null, "pointsPossible": number | null }]
}
For dueDate, use ISO format (YYYY-MM-DD) when possible. If unsure, use null.`;

/* ─── Shared styles ─────────────────────────────────────────── */

const S = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 9000,
    background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)",
    display: "flex", alignItems: "flex-end", justifyContent: "center",
  },
  sheet: {
    width: "100%", maxWidth: "600px",
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "20px 20px 0 0",
    padding: "8px 20px 36px",
    maxHeight: "88vh", overflowY: "auto",
  },
  handle: {
    width: "36px", height: "4px", borderRadius: "2px",
    background: "rgba(255,255,255,0.12)", margin: "12px auto 20px",
  },
  input: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: "10px", padding: "12px 14px",
    color: "var(--text-primary)", fontSize: "13px",
    outline: "none", fontFamily: "inherit", width: "100%",
    transition: "border-color 0.15s",
  },
  row: { display: "flex", gap: "8px", marginTop: "16px" },
};

function focusBorder(e)  { e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; }
function blurBorder(e)   { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; }

function Btn({ primary, children, ...props }) {
  return (
    <button
      style={{
        flex: primary ? 1 : "none",
        background: primary ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.07)",
        color: primary ? "#111" : "var(--text-primary)",
        border: "none", borderRadius: "10px",
        padding: "11px 20px", fontSize: "13px", fontWeight: "600",
        cursor: props.disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit", opacity: props.disabled ? 0.4 : 1,
        transition: "opacity 0.15s",
      }}
      {...props}
    >
      {children}
    </button>
  );
}

/* ─── ManualUploadSheet ─────────────────────────────────────── */

export default function ManualUploadSheet({ onClose, onSave }) {
  const { userId } = useApp();
  const [step, setStep]     = useState(0);   // 0=input 1=parsing 2=review 3=saved
  const [text, setText]     = useState("");
  const [file, setFile]     = useState(null);
  const [parsed, setParsed] = useState(null);
  const [error, setError]   = useState("");
  const fileRef             = useRef();

  /* ── parse ── */
  async function handleParse() {
    if (!text.trim() && !file) return;
    setStep(1);
    setError("");

    let prompt = text.trim();

    // Upload image to Supabase Storage and append URL to prompt
    if (file && file.type.startsWith("image/")) {
      try {
        const path = `manual/${userId}/${Date.now()}_${file.name}`;
        const { error: upErr } = await supabase.storage
          .from("uploads")
          .upload(path, file, { upsert: true });
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage
            .from("uploads")
            .getPublicUrl(path);
          prompt = `[Image uploaded: ${file.name} — ${publicUrl}]\n\n${prompt}`;
        }
      } catch (_) { /* non-fatal — continue with text */ }
    } else if (file) {
      // PDF or other: note filename; text paste is primary input
      prompt = `[Attached file: ${file.name}]\n\n${prompt}`;
    }

    if (!prompt.trim()) {
      setError("Paste some text or attach a file first.");
      setStep(0);
      return;
    }

    try {
      const raw = await groq(
        [{ role: "user", content: `Extract course data:\n\n${prompt}` }],
        SYSTEM,
      );
      // Strip accidental markdown fences
      const clean = raw.replace(/```[a-z]*\n?/gi, "").trim();
      const data  = JSON.parse(clean);
      setParsed({
        courseName:  data.courseName  ?? "Unnamed Course",
        courseCode:  data.courseCode  ?? "",
        assignments: Array.isArray(data.assignments) ? data.assignments : [],
      });
      setStep(2);
    } catch (e) {
      setError("Parsing failed — try adding more descriptive text.");
      setStep(0);
    }
  }

  /* ── save ── */
  function handleSave() {
    const courseId = `manual_${crypto.randomUUID()}`;
    const course = {
      id: courseId,
      name:        parsed.courseName,
      course_code: parsed.courseCode || parsed.courseName,
      manual:      true,
    };
    const assignments = parsed.assignments.map(a => ({
      id:             `manual_${crypto.randomUUID()}`,
      courseId,
      name:           a.name,
      dueAt:          a.dueDate ? new Date(a.dueDate).toISOString() : null,
      pointsPossible: a.pointsPossible ?? null,
      manual:         true,
    }));
    onSave(course, assignments);
    setStep(3);
  }

  /* ── dismiss on backdrop click ── */
  function onBackdrop(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div style={S.overlay} onClick={onBackdrop}>
      <div style={S.sheet}>
        <div style={S.handle} />

        {/* ── STEP 0: Input ─────────────────────────────── */}
        {step === 0 && (
          <>
            <p style={{ color: "var(--text-primary)", fontSize: "16px", fontWeight: "600", marginBottom: "4px" }}>
              Add Course Manually
            </p>
            <p style={{ color: "var(--text-dim)", fontSize: "13px", lineHeight: "1.6", marginBottom: "16px" }}>
              Paste a syllabus or assignment list — AI will extract the course details and deadlines.
            </p>

            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Paste syllabus, assignment sheet, or any course text here…"
              rows={7}
              style={{ ...S.input, resize: "vertical" }}
              onFocus={focusBorder}
              onBlur={blurBorder}
            />

            {/* file attach */}
            <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                ref={fileRef} type="file" accept=".pdf,image/*"
                style={{ display: "none" }}
                onChange={e => setFile(e.target.files[0] ?? null)}
              />
              <button
                onClick={() => fileRef.current.click()}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px dashed rgba(255,255,255,0.14)",
                  borderRadius: "8px", padding: "8px 13px",
                  color: "var(--text-dim)", fontSize: "12px",
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {file ? `📎 ${file.name}` : "+ Attach PDF or image"}
              </button>
              {file && (
                <button
                  onClick={() => setFile(null)}
                  style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: "12px", cursor: "pointer" }}
                >
                  ✕
                </button>
              )}
            </div>

            {error && (
              <p style={{ color: "rgba(255,100,90,0.85)", fontSize: "12px", marginTop: "12px" }}>{error}</p>
            )}

            <div style={S.row}>
              <Btn onClick={onClose}>Cancel</Btn>
              <Btn primary disabled={!text.trim() && !file} onClick={handleParse}>
                Parse with AI →
              </Btn>
            </div>
          </>
        )}

        {/* ── STEP 1: Parsing ───────────────────────────── */}
        {step === 1 && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <p style={{ fontSize: "26px", marginBottom: "14px", opacity: 0.9 }}>✦</p>
            <p style={{ color: "var(--text-primary)", fontSize: "15px", fontWeight: "600", marginBottom: "6px" }}>
              Parsing…
            </p>
            <p style={{ color: "var(--text-dim)", fontSize: "13px" }}>
              Extracting course and assignment data
            </p>
          </div>
        )}

        {/* ── STEP 2: Review ────────────────────────────── */}
        {step === 2 && parsed && (
          <>
            <p style={{ color: "var(--text-primary)", fontSize: "16px", fontWeight: "600", marginBottom: "16px" }}>
              Review Extracted Data
            </p>

            {/* editable course fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "18px" }}>
              <input
                value={parsed.courseName}
                onChange={e => setParsed(p => ({ ...p, courseName: e.target.value }))}
                placeholder="Course name"
                style={S.input}
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
              <input
                value={parsed.courseCode}
                onChange={e => setParsed(p => ({ ...p, courseCode: e.target.value }))}
                placeholder="Course code (e.g. CSC311)"
                style={S.input}
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
            </div>

            <p style={{
              color: "var(--text-dim)", fontSize: "11px", fontWeight: "600",
              letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "8px",
            }}>
              {parsed.assignments.length} Assignment{parsed.assignments.length !== 1 ? "s" : ""} detected
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "5px", maxHeight: "230px", overflowY: "auto", marginBottom: "16px" }}>
              {parsed.assignments.length === 0 && (
                <p style={{ color: "var(--text-dim)", fontSize: "13px" }}>
                  No assignments found — you can add them later.
                </p>
              )}
              {parsed.assignments.map((a, i) => (
                <div
                  key={i}
                  style={{
                    background: "rgba(255,255,255,0.04)", borderRadius: "8px",
                    padding: "10px 12px", display: "flex",
                    justifyContent: "space-between", alignItems: "center", gap: "12px",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ color: "var(--text-primary)", fontSize: "13px", fontWeight: "500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.name}
                    </p>
                    {a.dueDate && (
                      <p style={{ color: "var(--text-dim)", fontSize: "11px", marginTop: "2px" }}>
                        Due {a.dueDate}
                      </p>
                    )}
                  </div>
                  {a.pointsPossible != null && (
                    <span style={{ color: "var(--text-dim)", fontSize: "12px", flexShrink: 0 }}>
                      {a.pointsPossible} pts
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div style={S.row}>
              <Btn onClick={() => setStep(0)}>← Back</Btn>
              <Btn primary onClick={handleSave}>Save Course</Btn>
            </div>
          </>
        )}

        {/* ── STEP 3: Saved ─────────────────────────────── */}
        {step === 3 && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <p style={{ fontSize: "26px", marginBottom: "14px" }}>✓</p>
            <p style={{ color: "var(--text-primary)", fontSize: "15px", fontWeight: "600", marginBottom: "6px" }}>
              Course Added
            </p>
            <p style={{ color: "var(--text-dim)", fontSize: "13px", marginBottom: "24px" }}>
              {parsed?.courseName} is now in your course list.
            </p>
            <Btn primary onClick={onClose}>Done</Btn>
          </div>
        )}
      </div>
    </div>
  );
}
