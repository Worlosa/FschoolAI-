// NotificationPanel.tsx — iOS-quality notification dropdown.
// Framer Motion spring enter/exit, staggered items, solid ink surface.
// Logic (fetch, mark-read, live delivery, actions) preserved exactly.
import { useState, useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AppNotification,
  fetchNotifications,
  markNotificationsRead,
  markAllNotificationsRead,
} from "../api/notifications";

// ── Relative time (concise, iOS-style) ───────────────────────────────────────
function relativeTime(iso: string): string {
  const sec = (Date.now() - new Date(iso).getTime()) / 1000;
  if (sec < 60)    return "now";
  if (sec < 3600)  return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

// ── Avatar color palette (hash by name/id for consistent assignment) ──────────
const AVATAR_PALETTE = [
  { bg: "rgba(196,154,60,0.18)",  fg: "#C49A3C" },
  { bg: "rgba(111,179,196,0.18)", fg: "#6fb3c4" },
  { bg: "rgba(127,174,110,0.18)", fg: "#7fae6e" },
  { bg: "rgba(196,100,100,0.18)", fg: "#d47878" },
  { bg: "rgba(160,110,196,0.18)", fg: "#b888e0" },
];
function avatarColor(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

// ── Type config ───────────────────────────────────────────────────────────────
const TYPE_CFG: Record<string, { icon: string; defaultTitle: string; useAvatar: boolean }> = {
  friend_request:   { icon: "👤", defaultTitle: "Friend request",     useAvatar: true  },
  request_accepted: { icon: "✓",  defaultTitle: "Now connected",       useAvatar: true  },
  nudge:            { icon: "💬", defaultTitle: "Study nudge",         useAvatar: false },
  room_invite:      { icon: "🚪", defaultTitle: "Room invite",         useAvatar: false },
  assignment_due:   { icon: "📋", defaultTitle: "Assignment due soon", useAvatar: false },
  milestone:        { icon: "🏆", defaultTitle: "Milestone reached",   useAvatar: false },
};

// ── Friends API adapter ───────────────────────────────────────────────────────
async function respondFriendRequest(userId: string, fromUserId: string, accept: boolean) {
  try {
    const { respondFriendRequest: fn } = await import("../api/friends.js");
    await fn(userId, fromUserId, accept);
  } catch {
    console.warn("[notifs] respondFriendRequest not available");
  }
}

// ── NotificationItem ──────────────────────────────────────────────────────────
function NotificationItem({
  n,
  index,
  onAction,
}: {
  n: AppNotification;
  index: number;
  onAction: (action: string, n: AppNotification) => void;
}) {
  const reduced = useReducedMotion();
  const cfg = TYPE_CFG[n.type] ?? { icon: "🔔", defaultTitle: "Notification", useAvatar: false };
  const title = n.title ?? cfg.defaultTitle;
  const isUnread = !n.read;
  const fromName = n.data?.from_name as string | undefined;
  const col = avatarColor(fromName ?? n.data?.from_user_id as string ?? n.id);
  const initial = (fromName?.[0] ?? "?").toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: reduced ? 0 : 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0.01 } : { delay: index * 0.028, duration: 0.2, ease: [0, 0, 0.2, 1] }}
      style={{
        display: "flex",
        gap: "12px",
        padding: "12px 16px",
        background: isUnread ? "rgba(196,154,60,0.05)" : "transparent",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        alignItems: "flex-start",
      }}
    >
      {/* Avatar — gold ring when unread */}
      <div style={{
        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
        background: cfg.useAvatar ? col.bg : "rgba(255,255,255,0.07)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: cfg.useAvatar ? "13px" : "16px",
        fontWeight: cfg.useAvatar ? "700" : "normal",
        color: cfg.useAvatar ? col.fg : "inherit",
        boxShadow: isUnread ? "0 0 0 1.5px rgba(196,154,60,0.5)" : "none",
        transition: "box-shadow 0.2s",
      }}>
        {cfg.useAvatar && fromName ? initial : cfg.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title + time */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px", marginBottom: "2px" }}>
          <p style={{
            fontSize: "13px",
            fontWeight: isUnread ? "600" : "500",
            color: "var(--text-primary)",
            lineHeight: "1.35",
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {title}
          </p>
          <span style={{ fontSize: "11px", color: "var(--text-dim)", flexShrink: 0 }}>
            {relativeTime(n.created_at)}
          </span>
        </div>

        {/* Body */}
        {n.body && (
          <p style={{
            fontSize: "12px",
            color: "var(--text-secondary)",
            lineHeight: "1.5",
            marginBottom: "8px",
          }}>
            {n.body}
          </p>
        )}

        {/* Inline actions */}
        {n.type === "friend_request" && n.data?.from_user_id && (
          <div style={{ display: "flex", gap: "6px", marginTop: n.body ? 0 : "8px" }}>
            <button
              onClick={() => onAction("accept_friend", n)}
              style={{
                fontSize: "11px", padding: "4px 12px", borderRadius: "6px",
                cursor: "pointer", fontFamily: "inherit", fontWeight: "600",
                background: "rgba(196,154,60,0.12)", color: "#C49A3C",
                border: "1px solid rgba(196,154,60,0.25)",
              }}
            >
              Accept
            </button>
            <button
              onClick={() => onAction("decline_friend", n)}
              style={{
                fontSize: "11px", padding: "4px 10px", borderRadius: "6px",
                cursor: "pointer", fontFamily: "inherit",
                background: "none", color: "var(--text-dim)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              Decline
            </button>
          </div>
        )}
        {(n.type === "nudge" || n.type === "room_invite") && n.data?.room_id && (
          <button
            onClick={() => onAction("open_room", n)}
            style={{
              marginTop: n.body ? 0 : "8px",
              fontSize: "11px", padding: "4px 10px", borderRadius: "6px",
              cursor: "pointer", fontFamily: "inherit",
              background: "rgba(196,154,60,0.08)", color: "#C49A3C",
              border: "1px solid rgba(196,154,60,0.18)",
            }}
          >
            Join room →
          </button>
        )}
        {n.type === "assignment_due" && (
          <button
            onClick={() => onAction("open_assignment", n)}
            style={{
              marginTop: n.body ? 0 : "8px",
              fontSize: "11px", padding: "4px 10px", borderRadius: "6px",
              cursor: "pointer", fontFamily: "inherit",
              background: "none", color: "var(--text-dim)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            View →
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ── NotificationPanel ─────────────────────────────────────────────────────────
interface Props {
  userId: string;
  liveNotifs: AppNotification[];
  onClose: () => void;
  onNavigate: (page: string) => void;
  onUnreadChange: (count: number) => void;
}

export default function NotificationPanel({
  userId,
  liveNotifs,
  onClose,
  onNavigate,
  onUnreadChange,
}: Props) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // Load on open
  useEffect(() => {
    fetchNotifications(userId).then(data => {
      setItems(data);
      setLoading(false);
      const unreadIds = data.filter(n => !n.read).map(n => n.id);
      if (unreadIds.length) {
        markNotificationsRead(unreadIds).then(() => {
          onUnreadChange(0);
          setItems(prev => prev.map(n => ({ ...n, read: true })));
        });
      }
    });
  }, []); // eslint-disable-line

  // Merge live notifications (panel is open — mark read immediately)
  useEffect(() => {
    if (!liveNotifs.length) return;
    setItems(prev => {
      const existing = new Set(prev.map(n => n.id));
      const fresh = liveNotifs.filter(n => !existing.has(n.id));
      if (!fresh.length) return prev;
      markNotificationsRead(fresh.map(n => n.id));
      return [...fresh.map(n => ({ ...n, read: true })), ...prev];
    });
  }, [liveNotifs]);

  // Close on click outside
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [onClose]);

  async function handleMarkAllRead() {
    await markAllNotificationsRead(userId);
    setItems(prev => prev.map(n => ({ ...n, read: true })));
    onUnreadChange(0);
  }

  async function handleAction(action: string, n: AppNotification) {
    if (action === "accept_friend" && n.data?.from_user_id) {
      await respondFriendRequest(userId, n.data.from_user_id as string, true);
      setItems(prev => prev.map(item =>
        item.id === n.id ? { ...item, title: "Now friends ✓" } : item
      ));
    } else if (action === "decline_friend" && n.data?.from_user_id) {
      await respondFriendRequest(userId, n.data.from_user_id as string, false);
      setItems(prev => prev.filter(item => item.id !== n.id));
    } else if (action === "open_room") {
      onNavigate("rooms");
      onClose();
    } else if (action === "open_assignment") {
      onNavigate("assignment");
      onClose();
    }
  }

  const hasUnread = items.some(n => !n.read);

  return (
    <motion.div
      ref={panelRef as React.Ref<HTMLDivElement>}
      initial={{ opacity: 0, scale: reduced ? 1 : 0.96, y: reduced ? 0 : -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: reduced ? 1 : 0.97, y: reduced ? 0 : -5 }}
      transition={
        reduced
          ? { duration: 0.01 }
          : { type: "spring", stiffness: 420, damping: 30, mass: 0.8 }
      }
      style={{
        transformOrigin: "top right",  // grows from the bell corner
        position: "fixed",
        top: "82px",          // header padding-top(52) + content(~22) + gap(8)
        right: "16px",
        width: "min(calc(100vw - 32px), 380px)",
        maxHeight: "min(520px, calc(100dvh - 100px))",
        // Solid ink-charcoal surface (#1a1a1d ≈ iOS dark secondary background)
        background: "#1a1a1d",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: "18px",
        boxShadow: [
          "inset 0 1px 0 rgba(255,255,255,0.06)",  // top-edge highlight for elevation
          "0 4px 24px rgba(0,0,0,0.45)",            // ambient
          "0 20px 60px rgba(0,0,0,0.38)",           // depth
        ].join(", "),
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Panel header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "15px 16px 14px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: "16px", fontWeight: "600",
          color: "var(--text-primary)",
          fontFamily: "var(--font-sans)",
          letterSpacing: "-0.1px",
        }}>
          Notifications
        </span>
        {hasUnread && (
          <button
            onClick={handleMarkAllRead}
            style={{
              fontSize: "12px", color: "#C49A3C",
              background: "none", border: "none",
              cursor: "pointer", fontFamily: "inherit",
              padding: "2px 4px", opacity: 0.85,
            }}
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Scrollable list */}
      <div style={{ overflowY: "auto", flex: 1 }}>
        {loading ? (
          // Skeleton rows — better than a spinner
          <div style={{ padding: "8px 0" }}>
            {[0.75, 0.55, 0.65].map((w, i) => (
              <div key={i} style={{ display: "flex", gap: "12px", padding: "12px 16px", alignItems: "center" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.06)", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 11, borderRadius: 6, background: "rgba(255,255,255,0.07)", marginBottom: 7, width: `${w * 100}%` }} />
                  <div style={{ height: 9, borderRadius: 5, background: "rgba(255,255,255,0.04)", width: "45%" }} />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          // Empty state — calm and centered
          <div style={{ padding: "48px 24px 44px", textAlign: "center" }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              background: "rgba(255,255,255,0.05)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="rgba(255,255,255,0.22)" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>
            <p style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-secondary)", marginBottom: "5px" }}>
              You're all caught up
            </p>
            <p style={{ fontSize: "12px", color: "var(--text-dim)", lineHeight: "1.55" }}>
              Notifications appear here when<br/>something needs your attention.
            </p>
          </div>
        ) : (
          items.map((n, i) => (
            <NotificationItem key={n.id} n={n} index={i} onAction={handleAction} />
          ))
        )}
      </div>
    </motion.div>
  );
}
