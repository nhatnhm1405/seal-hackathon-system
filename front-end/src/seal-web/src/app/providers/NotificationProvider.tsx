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

// ── Context type ────────────────────────────────────────────────────
interface NotificationContextType {
  allNotifications: AppNotification[];
  userNotifications: AppNotification[];
  unreadCount: number;
  markAllRead: () => void;
  addToast: (t: Omit<Toast, "id">) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
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

  return (
    <NotificationContext.Provider value={{ allNotifications, userNotifications, unreadCount, markAllRead, addToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </NotificationContext.Provider>
  );
}
