// SelectionToolbar.tsx — floating action toolbar for YouLearn Phase 2.
// Fix: uses getClientRects() fallback for pre-wrap/mark-span selections.
// On touch: positioned BELOW the selection to avoid colliding with the OS native menu.
// On desktop: positioned ABOVE.
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type DocAction = "explain" | "chat" | "quiz" | "flashcards";

interface Props {
  rect: DOMRect | null;
  selectedText: string;
  /** true on touch devices — toolbar goes below to avoid native iOS/Android menu */
  preferBelow?: boolean;
  onAction: (action: DocAction) => void;
  onDismiss: () => void;
}

const ACTIONS: { id: DocAction; label: string; icon: string }[] = [
  { id: "explain",    label: "Explain",    icon: "✦" },
  { id: "chat",       label: "Chat",       icon: "💬" },
  { id: "quiz",       label: "Quiz?",      icon: "" },
  { id: "flashcards", label: "Cards",      icon: "⚡" },
];

const TOOLBAR_W = 272;
const TOOLBAR_H = 40;
const GAP       = 12;

function getPosition(rect: DOMRect, preferBelow: boolean) {
  // preferBelow: touch devices — native iOS menu appears above, so we go below
  let top: number;
  if (preferBelow) {
    top = rect.bottom + GAP;
    // If that would clip the bottom, flip above
    if (top + TOOLBAR_H > window.innerHeight - GAP) top = rect.top - TOOLBAR_H - GAP;
  } else {
    top = rect.top - TOOLBAR_H - GAP;
    // If that would clip the top, flip below
    if (top < GAP) top = rect.bottom + GAP;
  }

  // Horizontal: center on selection, clamped within viewport
  let left = rect.left + rect.width / 2 - TOOLBAR_W / 2;
  left = Math.max(GAP, Math.min(left, window.innerWidth - TOOLBAR_W - GAP));

  return { top, left };
}

export default function SelectionToolbar({ rect, selectedText, preferBelow = false, onAction, onDismiss }: Props) {
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Dismiss when pointer-down happens outside the toolbar
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (toolbarRef.current?.contains(e.target as Node)) return;
      setTimeout(onDismiss, 60);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [onDismiss]);

  const visible = !!rect && !!selectedText.trim();
  const pos     = rect ? getPosition(rect, preferBelow) : { top: 0, left: 0 };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={toolbarRef}
          key="selection-toolbar"
          initial={{ opacity: 0, scale: 0.9, y: preferBelow ? -6 : 6 }}
          animate={{ opacity: 1, scale: 1,   y: 0 }}
          exit={{    opacity: 0, scale: 0.94, y: preferBelow ? -4 : 4 }}
          transition={{ type: "spring", stiffness: 540, damping: 34, mass: 0.65 }}
          style={{
            position: "fixed",
            top:  pos.top,
            left: pos.left,
            zIndex: 500,
            display: "flex",
            alignItems: "center",
            gap: "1px",
            background: "#1c1c1f",
            border: "1px solid rgba(255,255,255,0.13)",
            borderRadius: "11px",
            padding: "4px",
            boxShadow: "0 6px 24px rgba(0,0,0,0.55), 0 1px 4px rgba(0,0,0,0.3)",
            userSelect: "none",
            WebkitUserSelect: "none",
            // Prevent our toolbar's mousedown from clearing the text selection
          }}
          onMouseDown={e => e.preventDefault()}
          onPointerDown={e => e.preventDefault()}
        >
          {ACTIONS.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={e => { e.preventDefault(); e.stopPropagation(); onAction(id); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: icon ? "4px" : "0",
                background: "none",
                border: "none",
                borderRadius: "7px",
                padding: "6px 11px",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: "12px",
                fontWeight: "600",
                color: "rgba(255,255,255,0.68)",
                transition: "background 0.1s, color 0.1s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(196,154,60,0.14)";
                e.currentTarget.style.color = "#C49A3C";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "none";
                e.currentTarget.style.color = "rgba(255,255,255,0.68)";
              }}
            >
              {icon && <span style={{ fontSize: "10px", opacity: 0.75 }}>{icon}</span>}
              {label}
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
