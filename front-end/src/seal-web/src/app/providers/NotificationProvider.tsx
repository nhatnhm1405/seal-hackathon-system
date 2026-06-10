import {
  createContext, useContext, useState, useEffect, useCallback,
  ReactNode, useRef,
} from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { notifications as seedNotifications, AppNotification } from "@/shared/mocks/mockData";
import { C } from "@/shared/components/PixelComponents";

// ── Toast ───────────────────────────────────────────────────────────
export interface Toast {
  id: string;
  type: "info" | "success" | "warning";
  title: string;
  message: string;
}

// ── Auth Toast (iPhone-style, slides from top) ───────────────────────
export interface AuthToast {
  id: string;
  type: "info" | "success" | "warning";
  title: string;
  message: string;
}

// ── Context type ────────────────────────────────────────────────────
interface NotificationContextType {
  allNotifications: AppNotification[];
  userNotifications: AppNotification[];
  unreadCount: number;
  markAllRead: () => void;
  addToast: (t: Omit<Toast, "id">) => void;
  addAuthToast: (t: Omit<AuthToast, "id">) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}

// ── Auth Toast Item (iPhone-style banner) ───────────────────────────
function AuthToastItem({ toast, onDismiss }: { toast: AuthToast; onDismiss: (id: string) => void }) {
  const [entered, setEntered] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const iconColor =
    toast.type === "success" ? C.green :
    toast.type === "warning" ? "#eab308" :
    "#06b6d4";

  const borderColor =
    toast.type === "success" ? "rgba(34,197,94,0.4)" :
    toast.type === "warning" ? "rgba(234,179,8,0.4)" :
    "rgba(6,182,212,0.4)";

  const glowColor =
    toast.type === "success" ? "rgba(34,197,94,0.12)" :
    toast.type === "warning" ? "rgba(234,179,8,0.12)" :
    "rgba(6,182,212,0.12)";

  const icon = toast.type === "success" ? "✓" : toast.type === "warning" ? "⚠" : "ℹ";

  useEffect(() => {
    const id1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true));
    });
    const timer = setTimeout(() => {
      setLeaving(true);
      setTimeout(() => onDismiss(toast.id), 350);
    }, 4500);
    return () => { cancelAnimationFrame(id1); clearTimeout(timer); };
  }, [toast.id, onDismiss]);

  function dismiss() {
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => onDismiss(toast.id), 350);
  }

  const isVisible = entered && !leaving;

  return (
    <div
      onClick={dismiss}
      style={{
        background: "rgba(10, 14, 20, 0.96)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: `1px solid ${borderColor}`,
        borderTop: `2.5px solid ${iconColor}`,
        borderRadius: 14,
        boxShadow: `0 12px 40px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03), 0 4px 20px ${glowColor}`,
        padding: "13px 18px 13px 14px",
        display: "flex",
        alignItems: "flex-start",
        gap: 11,
        minWidth: 300,
        maxWidth: 420,
        cursor: "pointer",
        userSelect: "none",
        transform: isVisible ? "translateY(0) scale(1)" : "translateY(-110%) scale(0.94)",
        opacity: isVisible ? 1 : 0,
        transition: leaving
          ? "transform 0.3s ease-in, opacity 0.25s ease-in"
          : "transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease",
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        background: toast.type === "success" ? "rgba(34,197,94,0.14)" : toast.type === "warning" ? "rgba(234,179,8,0.14)" : "rgba(6,182,212,0.14)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, marginTop: 1,
        color: iconColor, fontSize: 13, fontWeight: 700,
        boxShadow: `0 0 8px ${glowColor}`,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#eef2ff", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 3 }}>
          {toast.title}
        </div>
        <div style={{ color: "rgba(148,163,184,0.9)", fontSize: 11, lineHeight: 1.55 }}>
          {toast.message}
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); dismiss(); }}
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: "rgba(100,116,139,0.8)", fontSize: 13, padding: 0,
          flexShrink: 0, lineHeight: 1, marginTop: 2,
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#94a3b8"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(100,116,139,0.8)"; }}
      >
        ✕
      </button>
    </div>
  );
}

// ── Auth Toast Container (fixed top-center) ─────────────────────────
function AuthToastContainer({ toasts, onDismiss }: { toasts: AuthToast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "14px 16px 0",
      gap: 8,
      pointerEvents: "none",
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{ pointerEvents: "auto" }}>
          <AuthToastItem toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

// ── Single toast item ───────────────────────────────────────────────
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(true);

  const iconColor =
    toast.type === "success" ? C.green :
    toast.type === "warning" ? "#eab308" :
    "#06b6d4";

  const borderColor =
    toast.type === "success" ? "rgba(34,197,94,0.4)" :
    toast.type === "warning" ? "rgba(234,179,8,0.4)" :
    "rgba(6,182,212,0.4)";

  const bgColor =
    toast.type === "success" ? "rgba(34,197,94,0.06)" :
    toast.type === "warning" ? "rgba(234,179,8,0.06)" :
    "rgba(6,182,212,0.06)";

  const icon =
    toast.type === "success" ? "✓" :
    toast.type === "warning" ? "⚠" :
    "ℹ";

  useEffect(() => {
    const auto = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 4000);
    return () => clearTimeout(auto);
  }, [toast.id, onDismiss]);

  return (
    <div
      style={{
        background: "#0d1117",
        border: `1px solid ${borderColor}`,
        borderLeft: `3px solid ${iconColor}`,
        boxShadow: `0 4px 24px rgba(0,0,0,0.6), 0 0 12px ${bgColor}`,
        padding: "14px 16px",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        minWidth: 300,
        maxWidth: 380,
        fontFamily: "'JetBrains Mono', monospace",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(20px)",
        transition: "opacity 0.3s ease, transform 0.3s ease",
        position: "relative",
      }}
    >
      <span style={{ color: iconColor, fontSize: 14, flexShrink: 0, lineHeight: 1.4 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: C.text, fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", marginBottom: 3 }}>
          {toast.title}
        </div>
        <div style={{ color: C.textMuted, fontSize: 11, lineHeight: 1.5 }}>
          {toast.message}
        </div>
      </div>
      <button
        onClick={() => { setVisible(false); setTimeout(() => onDismiss(toast.id), 300); }}
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: C.textMuted, fontSize: 14, padding: 0, flexShrink: 0,
          lineHeight: 1,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.text; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
      >
        ✕
      </button>
    </div>
  );
}

// ── Toast container (fixed bottom-right) ───────────────────────────
function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div style={{
      position: "fixed",
      bottom: 24,
      right: 24,
      zIndex: 9000,
      display: "flex",
      flexDirection: "column",
      gap: 10,
      alignItems: "flex-end",
    }}>
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// ── Provider ────────────────────────────────────────────────────────
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [allNotifications, setAllNotifications] = useState<AppNotification[]>(seedNotifications);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [authToasts, setAuthToasts] = useState<AuthToast[]>([]);
  const counterRef = useRef(0);

  const userNotifications = currentUser
    ? [...allNotifications]
        .filter(n => n.user_id === currentUser.user_id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : [];

  const unreadCount = userNotifications.filter(n => !n.is_read).length;

  const markAllRead = useCallback(() => {
    if (!currentUser) return;
    setAllNotifications(prev =>
      prev.map(n => n.user_id === currentUser.user_id ? { ...n, is_read: true } : n)
    );
  }, [currentUser]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((t: Omit<Toast, "id">) => {
    const id = `toast-${Date.now()}-${counterRef.current++}`;
    setToasts(prev => [...prev, { ...t, id }]);
  }, []);

  const dismissAuthToast = useCallback((id: string) => {
    setAuthToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addAuthToast = useCallback((t: Omit<AuthToast, "id">) => {
    const id = `auth-toast-${Date.now()}-${counterRef.current++}`;
    setAuthToasts(prev => [...prev, { ...t, id }]);
  }, []);

  return (
    <NotificationContext.Provider value={{ allNotifications, userNotifications, unreadCount, markAllRead, addToast, addAuthToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <AuthToastContainer toasts={authToasts} onDismiss={dismissAuthToast} />
    </NotificationContext.Provider>
  );
}
