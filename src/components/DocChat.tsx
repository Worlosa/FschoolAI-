// DocChat.tsx — YouLearn Phase 2: streaming chat panel.
// Clean, smooth Framer Motion animations. Context chip in input. Suggestion chips.
// Phase 3 will persist messages; docId prop is ready for that.
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { DocAction } from "./SelectionToolbar";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

interface Props {
  docId: string;
  docTitle: string;
  docContext: string;
  initialSelection: string | null;
  initialAction: DocAction | null;
  onClose: () => void;
}

// ── Suggestion chips ──────────────────────────────────────────────────────────
const SUGGESTIONS: { action: DocAction; label: string }[] = [
  { action: "explain",    label: "Explain this passage" },
  { action: "quiz",       label: "Quiz me on this"      },
  { action: "flashcards", label: "Create flashcards"    },
];

// ── Prompts ───────────────────────────────────────────────────────────────────
function buildSystem(docTitle: string, ctx: string, action: DocAction | null) {
  const base = `You are a study assistant. The student is reading "${docTitle}".\n\nDocument excerpt:\n"""\n${ctx}\n"""`;
  if (action === "quiz")       return base + "\n\nFormat: **Q:** [question]\n**A:** [answer]";
  if (action === "flashcards") return base + "\n\nFormat: **Front:** [term]\n**Back:** [answer]\n\n---";
  return base;
}

function buildInitial(sel: string, action: DocAction): string {
  if (action === "explain")    return `Explain this passage:\n\n"${sel}"`;
  if (action === "chat")       return `Let's discuss:\n\n"${sel}"`;
  if (action === "quiz")       return `Quiz me on:\n\n"${sel}"`;
  if (action === "flashcards") return `Create flashcards from:\n\n"${sel}"`;
  return sel;
}

// ── SSE streaming ─────────────────────────────────────────────────────────────
async function stream(
  msgs: { role: string; content: string }[],
  system: string,
  onChunk: (t: string) => void,
  signal: AbortSignal
) {
  const res = await fetch("/api/claude", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: msgs, system, max_tokens: 900, stream: true }),
    signal,
  });
  if (!res.ok) throw new Error(`Claude ${res.status}`);
  const reader  = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n"); buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const d = line.slice(5).trim();
      if (!d || d === "[DONE]") continue;
      try {
        const e = JSON.parse(d);
        if (e.type === "content_block_delta" && e.delta?.type === "text_delta") onChunk(e.delta.text);
      } catch { /* skip */ }
    }
  }
}

// ── Inline bold renderer ──────────────────────────────────────────────────────
function Bold({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return <>{parts.map((p, i) => p.startsWith("**") && p.endsWith("**")
    ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>)}</>;
}

// ── Typing dots ───────────────────────────────────────────────────────────────
function Dots() {
  return (
    <span aria-hidden style={{ display: "inline-flex", gap: "3px", alignItems: "center", marginLeft: "3px" }}>
      <style>{`@keyframes td{0%,80%,100%{transform:translateY(0);opacity:.35}40%{transform:translateY(-4px);opacity:1}}`}</style>
      {[0, .16, .32].map((d, i) => (
        <span key={i} style={{
          display: "inline-block", width: 4, height: 4, borderRadius: "50%",
          background: "#C49A3C",
          animation: `td 1s ease-in-out infinite`,
          animationDelay: `${d}s`,
        }} />
      ))}
    </span>
  );
}

// ── Message variants ──────────────────────────────────────────────────────────
const msgVar = {
  hidden: { opacity: 0, y: 10 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0, 0, 0.2, 1] } },
};

// ── DocChat ───────────────────────────────────────────────────────────────────
export default function DocChat({ docId, docTitle, docContext, initialSelection, initialAction, onClose }: Props) {
  const [msgs,      setMsgs]      = useState<Message[]>([]);
  const [input,     setInput]     = useState("");
  const [streaming, setStreaming] = useState(false);
  const [chip,      setChip]      = useState<string | null>(initialSelection);

  const abortRef  = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const idRef     = useRef(0);

  const mobile = typeof window !== "undefined" && window.innerWidth < 640;

  // Fire initial action once
  useEffect(() => {
    if (initialAction && initialSelection) {
      sendMsg(buildInitial(initialSelection, initialAction), initialAction);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const sendMsg = useCallback(async (text: string, action?: DocAction | null) => {
    if (!text.trim() || streaming) return;
    const uid = `u-${++idRef.current}`;
    const aid = `a-${++idRef.current}`;
    const userMsg:      Message = { id: uid, role: "user",      content: text.trim() };
    const assistantMsg: Message = { id: aid, role: "assistant", content: "", streaming: true };
    setMsgs(prev => [...prev, userMsg, assistantMsg]);
    setStreaming(true);
    const sys  = buildSystem(docTitle, docContext, action ?? null);
    const hist = [...msgs, userMsg].map(m => ({ role: m.role as any, content: m.content }));
    abortRef.current = new AbortController();
    try {
      await stream(hist, sys, chunk => {
        setMsgs(prev => prev.map(m => m.id === aid ? { ...m, content: m.content + chunk } : m));
      }, abortRef.current.signal);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setMsgs(prev => prev.map(m => m.id === aid ? { ...m, content: "Something went wrong. Try again.", streaming: false } : m));
      }
    } finally {
      setMsgs(prev => prev.map(m => m.id === aid ? { ...m, streaming: false } : m));
      setStreaming(false);
      abortRef.current = null;
    }
  }, [msgs, streaming, docTitle, docContext]);

  function handleSend() {
    if (!input.trim()) return;
    const text = chip ? `${input.trim()}\n\nContext: "${chip}"` : input.trim();
    setInput(""); setChip(null);
    if (inputRef.current) inputRef.current.style.height = "auto";
    sendMsg(text);
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  // ── Panel spring ───────────────────────────────────────────────────────────
  const panelAnim = mobile
    ? { initial: { y: "100%" },  animate: { y: 0 },  exit: { y: "100%" } }
    : { initial: { x: "100%" }, animate: { x: 0 }, exit: { x: "100%" } };

  const panelStyle: React.CSSProperties = mobile
    ? { position: "fixed", bottom: 0, left: 0, right: 0, height: "76dvh", borderRadius: "20px 20px 0 0" }
    : { position: "fixed", top: 0, right: 0, width: "min(400px, 100vw)", height: "100dvh" };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 440, background: "rgba(0,0,0,0.42)", backdropFilter: "blur(2px)" }}
      />

      {/* Panel */}
      <motion.div
        {...panelAnim}
        transition={{ type: "spring", stiffness: 340, damping: 36, mass: 0.9 }}
        style={{
          ...panelStyle,
          zIndex: 450,
          background: "#17171a",
          borderLeft: "1px solid rgba(255,255,255,0.07)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          boxShadow: mobile ? "0 -8px 40px rgba(0,0,0,0.4)" : "-8px 0 40px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "14px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: "8px", flexShrink: 0,
            background: "rgba(196,154,60,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "13px",
          }}>✦</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              margin: 0, fontSize: "13px", fontWeight: "600",
              color: "rgba(245,245,245,0.9)", letterSpacing: "-0.1px",
            }}>
              {initialAction
                ? { explain: "Explain", chat: "Chat", quiz: "Quiz", flashcards: "Flashcards" }[initialAction]
                : "Ask"}
            </p>
            <p style={{
              margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.3)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {docTitle}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            background: "none", border: "none", cursor: "pointer",
            color: "rgba(255,255,255,0.3)", padding: "6px", borderRadius: "8px",
            display: "flex", alignItems: "center",
            transition: "background 0.12s, color 0.12s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "rgba(255,255,255,0.3)"; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>
          <AnimatePresence initial={false}>
            {msgs.length === 0 ? (
              /* Empty: quoted selection + suggestion chips */
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {initialSelection && (
                  <div style={{
                    marginBottom: "16px", padding: "10px 14px",
                    background: "rgba(196,154,60,0.06)",
                    border: "1px solid rgba(196,154,60,0.15)",
                    borderRadius: "10px",
                  }}>
                    <p style={{ margin: "0 0 4px", fontSize: "10px", fontWeight: "700", letterSpacing: "0.5px", textTransform: "uppercase", color: "#C49A3C" }}>
                      Selected
                    </p>
                    <p style={{
                      margin: 0, fontSize: "12px", lineHeight: "1.6",
                      color: "rgba(245,245,245,0.6)", fontStyle: "italic",
                      display: "-webkit-box", WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical", overflow: "hidden",
                    }}>
                      "{initialSelection}"
                    </p>
                  </div>
                )}
                <p style={{ margin: "0 0 10px", fontSize: "11px", color: "rgba(255,255,255,0.25)", fontWeight: "500" }}>
                  Suggestions
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {SUGGESTIONS.map((s, i) => (
                    <motion.button
                      key={s.action}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.2 }}
                      onClick={() => {
                        const text = initialSelection
                          ? buildInitial(initialSelection, s.action)
                          : s.action === "explain" ? "Explain this document" : s.action === "quiz" ? "Quiz me on this document" : "Create flashcards";
                        sendMsg(text, s.action);
                      }}
                      style={{
                        display: "flex", alignItems: "center", gap: "10px",
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: "10px", padding: "10px 14px",
                        cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                        transition: "background 0.12s, border-color 0.12s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(196,154,60,0.06)"; e.currentTarget.style.borderColor = "rgba(196,154,60,0.18)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
                    >
                      <span style={{ fontSize: "13px", color: "rgba(245,245,245,0.7)", fontWeight: "500" }}>{s.label}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : (
              /* Messages */
              <motion.div key="msgs" style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                {msgs.map((msg, i) => (
                  <motion.div key={msg.id} variants={msgVar} initial="hidden" animate="show">
                    {msg.role === "user" ? (
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <div style={{
                          maxWidth: "82%",
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "12px 12px 3px 12px",
                          padding: "8px 13px",
                          fontSize: "13px", lineHeight: "1.55",
                          color: "rgba(245,245,245,0.82)",
                          whiteSpace: "pre-wrap",
                        }}>
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "7px" }}>
                          <div style={{
                            width: 18, height: 18, borderRadius: "5px",
                            background: "rgba(196,154,60,0.14)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "9px", color: "#C49A3C", fontWeight: "700",
                          }}>✦</div>
                          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.28)", fontWeight: "600", letterSpacing: "0.2px" }}>AI Tutor</span>
                        </div>
                        <div style={{
                          paddingLeft: "24px",
                          fontSize: "14px", lineHeight: "1.8",
                          color: "rgba(245,245,245,0.88)",
                          whiteSpace: "pre-wrap",
                        }}>
                          {msg.content ? <Bold text={msg.content} /> : null}
                          {msg.streaming && <Dots />}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
                <div ref={bottomRef} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input */}
        <div style={{
          flexShrink: 0,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "10px 18px 14px",
        }}>
          {/* Context chip */}
          <AnimatePresence>
            {chip && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 8 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.18 }}
                style={{ overflow: "hidden" }}
              >
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: "5px",
                  background: "rgba(196,154,60,0.08)",
                  border: "1px solid rgba(196,154,60,0.18)",
                  borderRadius: "7px", padding: "3px 8px 3px 7px",
                  maxWidth: "100%",
                }}>
                  <span style={{ color: "#C49A3C", fontSize: "11px", fontWeight: "700" }}>→</span>
                  <span style={{
                    fontSize: "11px", color: "rgba(196,154,60,0.85)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "200px",
                  }}>
                    {chip.length > 55 ? chip.slice(0, 55) + "…" : chip}
                  </span>
                  <button onClick={() => setChip(null)} style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "rgba(196,154,60,0.5)", fontSize: "12px", padding: "0 1px", lineHeight: 1,
                  }}>×</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{
            display: "flex", gap: "8px", alignItems: "flex-end",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "12px", padding: "9px 12px",
            transition: "border-color 0.15s",
          }}
            onFocusCapture={e => (e.currentTarget.style.borderColor = "rgba(196,154,60,0.28)")}
            onBlurCapture={e  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={streaming}
              placeholder={streaming ? "" : "Ask about this document…"}
              rows={1}
              style={{
                flex: 1, background: "none", border: "none", outline: "none",
                fontFamily: "inherit", fontSize: "13px", lineHeight: "1.55",
                color: "rgba(245,245,245,0.88)", resize: "none",
                maxHeight: "96px", overflowY: "auto",
                opacity: streaming ? 0.4 : 1,
              }}
              onInput={e => {
                const t = e.currentTarget;
                t.style.height = "auto";
                t.style.height = `${Math.min(t.scrollHeight, 96)}px`;
              }}
            />
            {streaming ? (
              <button onClick={() => abortRef.current?.abort()} style={{
                background: "rgba(255,59,48,0.1)", border: "1px solid rgba(255,59,48,0.2)",
                borderRadius: "8px", padding: "5px 10px", cursor: "pointer",
                color: "rgba(255,100,90,0.8)", fontSize: "11px", fontWeight: "600",
                fontFamily: "inherit", flexShrink: 0, alignSelf: "flex-end",
              }}>Stop</button>
            ) : (
              <button onClick={handleSend} disabled={!input.trim()} style={{
                background: input.trim() ? "rgba(196,154,60,0.14)" : "transparent",
                border: `1px solid ${input.trim() ? "rgba(196,154,60,0.28)" : "rgba(255,255,255,0.07)"}`,
                borderRadius: "8px", padding: "5px 11px",
                cursor: input.trim() ? "pointer" : "default",
                color: input.trim() ? "#C49A3C" : "rgba(255,255,255,0.2)",
                fontSize: "12px", fontWeight: "600", fontFamily: "inherit",
                flexShrink: 0, alignSelf: "flex-end", transition: "all 0.12s",
              }}>Send</button>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
