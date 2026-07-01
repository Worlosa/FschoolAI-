// StudyAssistant.tsx — Spotlight-style full-screen study assistant.
// Empty state: large centered input + suggestion chips.
// Conversation state: messages scroll above a pinned input.
// Powered by RAG (indexed imported materials) + Claude. History persists to
// chat_logs (page="study-assistant") — the same table NeuralRing's tutor chat
// uses, just a different `page` value — so returning students keep context.

import { useState, useRef, useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { supabase } from "../api/supabase";
import { sanitizeApiMessages } from "../lib/chatMessages";
import { renderMessageHTML } from "../lib/markdown";

const ACCENT = "rgba(0,210,190,0.9)";
const ACCENT_DIM = "rgba(0,210,190,0.18)";
const ACCENT_BORDER = "rgba(0,210,190,0.3)";
const PAGE = "study-assistant";
// Bound how much persisted history we replay into Claude's context per turn —
// full history still renders on screen, this only caps what's sent upstream.
const MAX_CONTEXT_TURNS = 20;

const SUGGESTIONS = [
  "Summarize what I've imported recently",
  "What topics appear most in my library?",
  "Explain the key concepts from my materials",
  "Quiz me on something from my library",
];

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: { title: string; heading?: string }[];
}

async function loadHistory(userId: string): Promise<Message[]> {
  try {
    const { data } = await supabase
      .from("chat_logs")
      .select("role, content, created_at")
      .eq("user_id", userId)
      .eq("page", PAGE)
      .order("created_at", { ascending: true })
      .limit(200);
    return (data ?? []).map(r => ({ role: r.role as Message["role"], content: r.content }));
  } catch {
    return [];
  }
}

/** Fire-and-forget log — never blocks the chat UI on a slow/failed write. */
function logMessage(userId: string, role: string, content: string) {
  supabase.from("chat_logs").insert({ user_id: userId, role, content, page: PAGE }).then(() => {}, () => {});
}

async function ragQuery(userId: string, query: string) {
  try {
    const res = await fetch("/api/rag?action=query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, query, rerank: false }),
    });
    if (!res.ok) return "";
    const d = await res.json();
    const passages = d?.passages ?? [];
    return passages;
  } catch {
    return [];
  }
}

async function claudeReply(messages: { role: string; content: string }[], system: string): Promise<string> {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, system, model: "claude-haiku-4-5-20251001", max_tokens: 1024 }),
  });
  if (!res.ok) throw new Error("Claude error");
  const d = await res.json();
  return d.content ?? "";
}

function UserBubble({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
      <div style={{
        maxWidth: "72%",
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "18px 18px 4px 18px",
        padding: "12px 16px",
        fontSize: "14px",
        lineHeight: "1.55",
        color: "var(--text-primary)",
      }}>
        {text}
      </div>
    </div>
  );
}

function AssistantBubble({ text, sources }: { text: string; sources?: { title: string; heading?: string }[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", marginBottom: "20px" }}>
      {/* Orb indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <div style={{
          width: 22, height: 22, borderRadius: "50%",
          background: "radial-gradient(circle at 35% 35%, rgba(0,210,190,0.8), rgba(0,100,100,0.6))",
          boxShadow: "0 0 8px rgba(0,210,190,0.3)",
          flexShrink: 0,
        }} />
        <span style={{ fontSize: "11px", color: "var(--text-dim)", letterSpacing: "0.5px", fontWeight: 600 }}>
          STUDY ASSISTANT
        </span>
      </div>

      <div
        className="sa-md"
        style={{
          maxWidth: "88%",
          fontSize: "14px",
          lineHeight: "1.65",
          color: "var(--text-primary)",
        }}
        dangerouslySetInnerHTML={{ __html: renderMessageHTML(text) }}
      />

      {sources && sources.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "10px" }}>
          {sources.map((s, i) => (
            <span key={i} style={{
              fontSize: "11px",
              padding: "3px 10px",
              borderRadius: "20px",
              background: ACCENT_DIM,
              border: `1px solid ${ACCENT_BORDER}`,
              color: ACCENT,
              fontWeight: 500,
            }}>
              {s.title}{s.heading ? ` — ${s.heading}` : ""}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
      <div style={{
        width: 22, height: 22, borderRadius: "50%",
        background: "radial-gradient(circle at 35% 35%, rgba(0,210,190,0.8), rgba(0,100,100,0.6))",
        boxShadow: "0 0 8px rgba(0,210,190,0.3)",
        flexShrink: 0,
      }} />
      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 5, height: 5, borderRadius: "50%",
            background: ACCENT,
            opacity: 0.6,
            animation: `saPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

export default function StudyAssistant() {
  const { userId } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isEmpty = messages.length === 0;

  // Hydrate persisted history once we know who the user is.
  useEffect(() => {
    let cancelled = false;
    if (!userId) { setHistoryLoaded(true); return; }
    loadHistory(userId).then(hist => {
      if (!cancelled) { setMessages(hist); setHistoryLoaded(true); }
    });
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  // Auto-focus the input once history has resolved (Spotlight-style).
  useEffect(() => { if (historyLoaded) inputRef.current?.focus(); }, [historyLoaded]);

  const send = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q || thinking) return;
    setInput("");
    const userMsg: Message = { role: "user", content: q };
    setMessages(prev => [...prev, userMsg]);
    if (userId) logMessage(userId, "user", q);
    setThinking(true);

    try {
      const passages = await ragQuery(userId, q);
      const hasSources = Array.isArray(passages) && passages.length > 0;

      const ragContext = hasSources
        ? passages.map((p: any, i: number) =>
            `[${i + 1}] ${p.title}${p.heading ? " — " + p.heading : ""}${p.loc ? ` (${p.loc})` : ""}\n${p.text}`
          ).join("\n\n")
        : null;

      const system = [
        "You are the Study Assistant — a focused, knowledgeable study companion for the student.",
        "Your job is to help students understand and learn from the materials they have imported into their library (papers, PDFs, documents, notes).",
        hasSources
          ? `\n\nSOURCE MATERIAL (retrieved from the student's library):\n${ragContext}\n\nBase your answer primarily on this material. Cite source numbers like [1] when relevant.`
          : "\n\nThe student has not yet imported materials that are relevant to this question. Answer helpfully from general knowledge but gently encourage them to import related documents.",
        "Be concise, clear, and academically rigorous. Avoid unnecessary filler.",
      ].join(" ");

      // Sanitize before sending to Claude — drops empties and merges same-role
      // turns so history can't be poisoned (project convention; see chatMessages).
      // Capped to the most recent turns since history now spans sessions.
      const apiMessages = sanitizeApiMessages([...messages, userMsg]).slice(-MAX_CONTEXT_TURNS);
      const reply = await claudeReply(apiMessages, system);

      // Dedupe source chips by document (multiple passages often share a title).
      const seen = new Set<string>();
      const sources: { title: string; heading?: string }[] = hasSources
        ? passages
            .map((p: any) => ({ title: p.title, heading: p.heading }))
            .filter((s: { title: string; heading?: string }) => {
              const k = `${s.title}|${s.heading ?? ""}`;
              if (seen.has(k)) return false;
              seen.add(k);
              return true;
            })
            .slice(0, 4)
        : [];

      setMessages(prev => [...prev, { role: "assistant", content: reply, sources }]);
      if (userId) logMessage(userId, "assistant", reply);
    } catch {
      const fallback = "Sorry, something went wrong. Please try again.";
      setMessages(prev => [...prev, { role: "assistant", content: fallback }]);
      if (userId) logMessage(userId, "assistant", fallback);
    } finally {
      setThinking(false);
    }
  }, [userId, messages, thinking]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "calc(100dvh - 56px)", // subtract app header
      position: "relative",
    }}>
      <style>{`
        @keyframes saPulse {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50%       { transform: translateY(-4px); opacity: 1; }
        }
        .sa-md p { margin: 0 0 10px; }
        .sa-md p:last-child { margin-bottom: 0; }
        .sa-md ul { margin: 6px 0; padding-left: 20px; }
        .sa-md li { margin: 2px 0; }
        .sa-md strong { font-weight: 650; color: var(--text-primary); }
        .sa-input::placeholder { color: rgba(255,255,255,0.28); }
        .sa-input:focus { outline: none; }
        .sa-suggestion:hover {
          background: rgba(0,210,190,0.1) !important;
          border-color: rgba(0,210,190,0.28) !important;
          color: rgba(0,210,190,0.9) !important;
        }
        .sa-send:hover:not(:disabled) { background: rgba(0,210,190,0.85) !important; }
        .sa-send:disabled { opacity: 0.4; cursor: default; }
      `}</style>

      {/* ── Empty state: centered input ───────────────────────────────── */}
      {isEmpty && historyLoaded && (
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 20px",
          gap: "28px",
        }}>
          {/* Orb + title */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%",
              background: "radial-gradient(circle at 35% 35%, rgba(0,210,190,0.85), rgba(0,80,80,0.7))",
              boxShadow: "0 0 32px rgba(0,210,190,0.25), 0 0 0 1px rgba(0,210,190,0.2)",
            }} />
            <div style={{ textAlign: "center" }}>
              <h2 style={{
                fontSize: "22px", fontWeight: 600,
                color: "var(--text-primary)", letterSpacing: "-0.4px", marginBottom: "4px",
              }}>
                Study Assistant
              </h2>
              <p style={{ fontSize: "13px", color: "var(--text-dim)", lineHeight: 1.5 }}>
                Ask anything from your imported materials
              </p>
            </div>
          </div>

          {/* Centered input box */}
          <InputBox
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onSend={() => send(input)}
            thinking={thinking}
            inputRef={inputRef}
            centered
          />

          {/* Suggestion chips */}
          <div style={{
            display: "flex", flexWrap: "wrap", gap: "8px",
            justifyContent: "center", maxWidth: "520px",
          }}>
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                className="sa-suggestion"
                onClick={() => send(s)}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "20px",
                  padding: "8px 14px",
                  fontSize: "12px",
                  color: "var(--text-dim)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Conversation view ─────────────────────────────────────────── */}
      {!isEmpty && (
        <>
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px 20px 16px",
            maxWidth: "680px",
            width: "100%",
            margin: "0 auto",
            boxSizing: "border-box",
          }}>
            {messages.map((m, i) =>
              m.role === "user"
                ? <UserBubble key={i} text={m.content} />
                : <AssistantBubble key={i} text={m.content} sources={m.sources} />
            )}
            {thinking && <ThinkingBubble />}
            <div ref={bottomRef} />
          </div>

          {/* Pinned bottom input */}
          <div style={{
            padding: "12px 20px 20px",
            background: "linear-gradient(to top, var(--color-bg) 70%, transparent)",
            maxWidth: "680px",
            width: "100%",
            margin: "0 auto",
            boxSizing: "border-box",
          }}>
            <InputBox
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              onSend={() => send(input)}
              thinking={thinking}
              inputRef={inputRef}
              centered={false}
            />
          </div>
        </>
      )}
    </div>
  );
}

interface InputBoxProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  thinking: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  centered: boolean;
}

function InputBox({ value, onChange, onKeyDown, onSend, thinking, inputRef, centered }: InputBoxProps) {
  return (
    <div style={{
      display: "flex",
      alignItems: "flex-end",
      gap: "10px",
      width: centered ? "min(520px, 100%)" : "100%",
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: "16px",
      padding: "12px 14px",
      boxSizing: "border-box",
      boxShadow: centered ? "0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,210,190,0.06)" : undefined,
      transition: "border-color 0.15s",
    }}
      onFocus={() => {}} // border highlight handled via CSS if needed
    >
      <textarea
        ref={inputRef}
        className="sa-input"
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder="Ask anything from your library…"
        rows={1}
        style={{
          flex: 1,
          background: "none",
          border: "none",
          resize: "none",
          fontFamily: "inherit",
          fontSize: "14px",
          lineHeight: "1.5",
          color: "var(--text-primary)",
          overflowY: "hidden",
          minHeight: "21px",
          maxHeight: "160px",
        }}
      />
      <button
        className="sa-send"
        onClick={onSend}
        disabled={!value.trim() || thinking}
        style={{
          width: 34, height: 34, flexShrink: 0,
          borderRadius: "10px",
          background: value.trim() && !thinking ? ACCENT : "rgba(0,210,190,0.15)",
          border: "none",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 0.15s, opacity 0.15s",
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={value.trim() && !thinking ? "#000" : ACCENT} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </button>
    </div>
  );
}
