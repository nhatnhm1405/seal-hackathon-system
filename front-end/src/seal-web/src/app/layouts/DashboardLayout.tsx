import { ReactNode, useState, useRef, useEffect } from "react";
import { useTheme } from "@/app/providers/ThemeProvider";
import { useNavigate, useLocation, Link } from "react-router";
import { C, PixelBadge } from "@/shared/components/PixelComponents";
import { useAuth } from "@/app/providers/AuthProvider";
import { useNotifications } from "@/app/providers/NotificationProvider";
import { AppNotification } from "@/shared/mocks/mockData";
import { SealFooter } from "@/shared/components/SealFooter";
import {
  accountApprovals, events, tracks, rounds,
  userEventRoles, teams, HackathonEvent,
} from "@/shared/mocks/mockData";
import sealLogo from "@/imports/image.png";

const NAVBAR_H = 60;

interface NavItem {
  path: string;
  label: string;
  badge?: number;
}

function buildNav(role: string, isLeader: boolean, teamId: number | null, pendingCount: number): NavItem[] {
  if (role === "PARTICIPANT") {
    if (teamId === null) {
      const base: NavItem[] = [{ path: "/dashboard", label: "Dashboard" }, { path: "/leaderboard", label: "Leaderboard" }, { path: "/profile", label: "Profile" }];
      if (isLeader) return [{ path: "/dashboard", label: "Dashboard" }, { path: "/team/create", label: "Create Team" }, { path: "/leaderboard", label: "Leaderboard" }, { path: "/profile", label: "Profile" }];
      return base;
    }
    if (isLeader) {
      return [
        { path: "/dashboard",   label: "Dashboard"     },
        { path: "/team/view",   label: "My Team"        },
        { path: "/team/submit", label: "Submit Project" },
        { path: "/leaderboard", label: "Leaderboard"    },
        { path: "/profile",     label: "Profile"        },
      ];
    }
    return [
      { path: "/dashboard",   label: "Dashboard"  },
      { path: "/team/view",   label: "My Team"     },
      { path: "/leaderboard", label: "Leaderboard" },
      { path: "/profile",     label: "Profile"     },
    ];
  }
  if (role === "MENTOR") {
    return [
      { path: "/dashboard",     label: "Dashboard"  },
      { path: "/mentor/tracks", label: "My Tracks"  },
      { path: "/leaderboard",   label: "Leaderboard"},
      { path: "/profile",       label: "Profile"    },
    ];
  }
  if (role === "JUDGE") {
    return [
      { path: "/dashboard",    label: "Dashboard"        },
      { path: "/judge/score",  label: "Score Submissions" },
      { path: "/judge/history",label: "Scoring History"  },
      { path: "/profile",      label: "Profile"          },
    ];
  }
  if (role === "COORDINATOR") {
    return [
      { path: "/coordinator/dashboard", label: "Dashboard"         },
      { path: "/coordinator/events",    label: "Events"            },
      { path: "/coordinator/accounts",  label: "Accounts", badge: pendingCount },
      { path: "/coordinator/teams",     label: "Teams"             },
      { path: "/coordinator/judges",    label: "Judges & Mentors"  },
      { path: "/coordinator/scoring",   label: "Scoring & Results" },
      { path: "/coordinator/prizes",    label: "Prizes"            },
      { path: "/coordinator/audit",     label: "Audit Log"         },
      { path: "/profile",               label: "Profile"           },
    ];
  }
  return [{ path: "/dashboard", label: "Dashboard" }];
}

function getPageTitle(pathname: string): string {
  const map: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/leaderboard": "Leaderboard",
    "/profile": "Profile",
    "/team/create": "Create Team",
    "/team/view": "My Team",
    "/team/manage": "My Team",
    "/team/submit": "Submit Project",
    "/mentor/tracks": "My Tracks",
    "/judge/score": "Score Submissions",
    "/judge/history": "Scoring History",
    "/coordinator/dashboard": "Dashboard",
    "/coordinator/events": "Events",
    "/coordinator/accounts": "Accounts",
    "/coordinator/teams": "Teams",
    "/coordinator/judges": "Judges & Mentors",
    "/coordinator/scoring": "Scoring & Results",
    "/coordinator/prizes": "Prizes",
    "/coordinator/audit": "Audit Log",
  };
  return map[pathname] || "Console";
}

function getAvailableEvents(role: string, userId: number): HackathonEvent[] {
  if (role === 'COORDINATOR') return events;
  if (role === 'MENTOR') {
    const assigned = userEventRoles.filter(r => r.user_id === userId && r.role_name === 'MENTOR');
    const eventIds = new Set(assigned.map(r => r.event_id).filter((id): id is number => id !== null));
    return events.filter(e => eventIds.has(e.event_id));
  }
  if (role === 'JUDGE') {
    const assigned = userEventRoles.filter(r => r.user_id === userId && r.role_name === 'JUDGE');
    const eventIds = new Set(assigned.map(r => r.event_id).filter((id): id is number => id !== null));
    return events.filter(e => eventIds.has(e.event_id));
  }
  return [];
}

function roleBadgeStyle(role: string): { bg: string; color: string } {
  switch (role) {
    case "COORDINATOR": return { bg: "rgba(234,179,8,0.15)", color: "#eab308" };
    case "MENTOR":      return { bg: "rgba(6,182,212,0.15)",  color: "#06b6d4" };
    case "JUDGE":       return { bg: "rgba(59,130,246,0.15)", color: "#3b82f6" };
    default:            return { bg: "rgba(34,197,94,0.15)",  color: "#22c55e" };
  }
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── Notification Bell ──────────────────────────────────────────────
function typeColor(type: AppNotification["type"]) {
  if (type === "success") return C.green;
  if (type === "warning") return "#eab308";
  return "#06b6d4";
}

function NotificationBell() {
  const { userNotifications, unreadCount, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function fmtTime(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: "relative",
          background: open ? "rgba(34,197,94,0.08)" : "none",
          border: open ? `1px solid ${C.border}` : "1px solid transparent",
          cursor: "pointer",
          padding: "6px 8px",
          borderRadius: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.15s",
        }}
        title="Notifications"
        onMouseEnter={(e) => { if (!open) (e.currentTarget as HTMLElement).style.background = "rgba(34,197,94,0.06)"; }}
        onMouseLeave={(e) => { if (!open) (e.currentTarget as HTMLElement).style.background = "none"; }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={unreadCount > 0 ? C.green : C.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: 2, right: 2,
            background: C.red, color: "#fff",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 700,
            borderRadius: "50%", width: 14, height: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0,
          width: 340,
          background: C.surface,
          border: `1px solid ${C.border}`,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          zIndex: 300,
          display: "flex",
          flexDirection: "column",
          maxHeight: 420,
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: `1px solid ${C.border}`,
            flexShrink: 0,
          }}>
            <span style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em" }}>
              // notifications
              {unreadCount > 0 && (
                <span style={{ color: C.textMuted }}> · {unreadCount} unread</span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: C.textMuted, fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9, letterSpacing: "0.08em", padding: 0,
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.green; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
              >
                MARK ALL READ
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {userNotifications.length === 0 ? (
              <div style={{ padding: "24px 16px", color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, textAlign: "center" }}>
                No notifications
              </div>
            ) : (
              userNotifications.map((n) => (
                <div
                  key={n.notification_id}
                  style={{
                    padding: "12px 16px",
                    borderBottom: `1px solid rgba(34,197,94,0.05)`,
                    background: n.is_read ? "transparent" : "rgba(34,197,94,0.03)",
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                  }}
                >
                  {/* Unread dot */}
                  <div style={{
                    width: 6, height: 6, borderRadius: "50%", flexShrink: 0, marginTop: 5,
                    background: n.is_read ? "transparent" : typeColor(n.type),
                    boxShadow: n.is_read ? "none" : `0 0 6px ${typeColor(n.type)}`,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <span style={{ color: n.is_read ? C.text : typeColor(n.type), fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700 }}>
                        {n.title}
                      </span>
                    </div>
                    <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, lineHeight: 1.5, marginBottom: 4 }}>
                      {n.message}
                    </div>
                    <div style={{ color: C.textDim, fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.06em" }}>
                      {fmtTime(n.created_at)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Top Navbar ─────────────────────────────────────────────────────
interface TopNavbarProps {
  pageTitle: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  currentUser: { user_id: number; full_name: string; role: string; is_leader: boolean; team_id: number | null };
  currentEvent: HackathonEvent | null;
  onSelectEvent: (e: HackathonEvent) => void;
  onLogout: () => void;
  onNavigate: (path: string) => void;
}

function TopNavbar({ pageTitle, collapsed, onToggleCollapse, currentUser, currentEvent, onSelectEvent, onLogout, onNavigate }: TopNavbarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [eventDropOpen, setEventDropOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const eventDropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
      if (eventDropRef.current && !eventDropRef.current.contains(e.target as Node)) setEventDropOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isParticipant = currentUser.role === "PARTICIPANT";
  const hasEventSwitcher = !isParticipant;
  const available = hasEventSwitcher ? getAvailableEvents(currentUser.role, currentUser.user_id) : [];
  const badge = roleBadgeStyle(currentUser.role);
  const initials = getInitials(currentUser.full_name);

  const statusColor = (status: string) =>
    status === 'OPEN' ? C.green : status === 'DRAFT' ? C.textMuted : C.red;

  return (
    <header style={{
      position: "sticky",
      top: 0,
      zIndex: 60,
      height: NAVBAR_H,
      background: C.navbarBg,
      backdropFilter: "blur(12px)",
      borderBottom: `1px solid ${C.border}`,
      display: "flex",
      alignItems: "center",
      padding: "0 20px",
      gap: 16,
      flexShrink: 0,
    }}>
      {/* LEFT */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        {/* Sidebar toggle button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          title={collapsed ? "Mở sidebar" : "Đóng sidebar"}
          style={{
            background: collapsed ? "rgba(34,197,94,0.08)" : "transparent",
            border: `1px solid ${collapsed ? "rgba(34,197,94,0.4)" : "rgba(34,197,94,0.15)"}`,
            color: collapsed ? C.green : C.textMuted,
            cursor: "pointer",
            width: 38,
            height: 38,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            padding: 0,
            transition: "all 0.15s",
            boxShadow: collapsed ? "0 0 12px rgba(34,197,94,0.2)" : "none",
          }}
          onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = C.green; el.style.borderColor = "rgba(34,197,94,0.5)"; el.style.background = "rgba(34,197,94,0.08)"; }}
          onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = collapsed ? C.green : C.textMuted; el.style.borderColor = collapsed ? "rgba(34,197,94,0.4)" : "rgba(34,197,94,0.15)"; el.style.background = collapsed ? "rgba(34,197,94,0.08)" : "transparent"; }}
        >
          {collapsed ? (
            /* Hamburger (mở) */
            <svg width="17" height="17" viewBox="0 0 17 17" fill="none" style={{ pointerEvents: "none" }}>
              <line x1="2" y1="4.5"  x2="15" y2="4.5"  stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
              <line x1="2" y1="8.5"  x2="15" y2="8.5"  stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
              <line x1="2" y1="12.5" x2="15" y2="12.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
            </svg>
          ) : (
            /* Arrow-left (đóng) */
            <svg width="17" height="17" viewBox="0 0 17 17" fill="none" style={{ pointerEvents: "none" }}>
              <rect x="2" y="3" width="3.5" height="11" rx="0.5" fill="currentColor" opacity="0.35"/>
              <line x1="8"  y1="4.5"  x2="15" y2="4.5"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="8"  y1="8.5"  x2="15" y2="8.5"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="8"  y1="12.5" x2="15" y2="12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )}
        </button>
        <div style={{ height: 72, overflow: "visible", flexShrink: 0, display: "flex", alignItems: "center" }}>
          <img src={sealLogo} alt="SEAL" style={{ height: 144, width: "auto", objectFit: "contain", filter: "drop-shadow(0 0 6px rgba(34,197,94,0.4))" }} />
        </div>
        <span style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 13, letterSpacing: "0.06em", background: "linear-gradient(135deg, #22c55e 0%, #3b82f6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          SEAL Hackathon
        </span>
        <span style={{ color: C.border, fontFamily: "'JetBrains Mono', monospace", fontSize: 16, margin: "0 4px" }}>|</span>
        <span style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600 }}>{pageTitle}</span>
      </div>

      {/* CENTER — event context */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
        {isParticipant ? (
          currentEvent && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700 }}>
                {currentEvent.name}
              </span>
            </div>
          )
        ) : (
          available.length > 0 && (
            <div ref={eventDropRef} style={{ position: "relative" }}>
              <button
                onClick={() => setEventDropOpen(o => !o)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: eventDropOpen ? "rgba(34,197,94,0.08)" : "rgba(34,197,94,0.04)",
                  border: `1px solid ${C.border}`,
                  padding: "6px 14px",
                  cursor: "pointer",
                  borderRadius: 0,
                }}
              >
                <span style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700 }}>
                  {currentEvent?.name ?? "Select Event"}
                </span>
              </button>
              {eventDropOpen && (
                <div style={{
                  position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
                  minWidth: 220, background: C.surface, border: `1px solid ${C.border}`,
                  borderTop: "none", zIndex: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                }}>
                  {available.map(ev => {
                    const isActive = ev.event_id === currentEvent?.event_id;
                    return (
                      <button
                        key={ev.event_id}
                        onClick={() => { onSelectEvent(ev); setEventDropOpen(false); }}
                        style={{
                          width: "100%", display: "flex", flexDirection: "column", gap: 2,
                          padding: "10px 14px",
                          background: isActive ? "rgba(34,197,94,0.08)" : "transparent",
                          border: "none", borderLeft: isActive ? `2px solid ${C.green}` : "2px solid transparent",
                          cursor: "pointer", textAlign: "left", borderRadius: 0,
                        }}
                        onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(34,197,94,0.06)"; }}
                        onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      >
                        <span style={{ color: isActive ? C.green : C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600 }}>{ev.name}</span>
                        <span style={{ color: statusColor(ev.status), fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.1em" }}>{ev.status}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* RIGHT — theme toggle + bell + user menu */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === "dark" ? "Chuyển sang Light mode" : "Chuyển sang Dark mode"}
          style={{
            background: "transparent",
            border: `1px solid rgba(34,197,94,0.15)`,
            color: C.textMuted,
            cursor: "pointer",
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            transition: "all 0.15s",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = C.green; el.style.borderColor = "rgba(34,197,94,0.45)"; el.style.background = "rgba(34,197,94,0.06)"; }}
          onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = C.textMuted; el.style.borderColor = "rgba(34,197,94,0.15)"; el.style.background = "transparent"; }}
        >
          {theme === "dark" ? (
            /* Sun icon */
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ pointerEvents: "none" }}>
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1"  x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22"   x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1"  y1="12" x2="3"  y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78"  x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            /* Moon icon */
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ pointerEvents: "none" }}>
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>

        {/* Bell */}
        <NotificationBell />

        {/* User menu */}
        <div ref={userMenuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setUserMenuOpen(o => !o)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: userMenuOpen ? "rgba(34,197,94,0.06)" : "transparent",
              border: `1px solid ${userMenuOpen ? C.border : "transparent"}`,
              padding: "6px 10px",
              cursor: "pointer",
              borderRadius: 0,
            }}
          >
            {/* Avatar */}
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "linear-gradient(135deg, #22c55e 0%, #3b82f6 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: "#070c0f",
              flexShrink: 0,
            }}>
              {initials}
            </div>
            <div style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: 1 }}>
              <span style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                {currentUser.full_name}
              </span>
              <span style={{
                display: "inline-block",
                background: badge.bg, color: badge.color,
                fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 700,
                letterSpacing: "0.1em", padding: "1px 6px",
              }}>
                {currentUser.role}
              </span>
            </div>
          </button>

          {userMenuOpen && (
            <div style={{
              position: "absolute", top: "100%", right: 0,
              minWidth: 180, background: C.surface, border: `1px solid ${C.border}`,
              borderTop: "none", zIndex: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            }}>
              <button
                onClick={() => { onNavigate("/profile"); setUserMenuOpen(false); }}
                style={{ width: "100%", padding: "10px 14px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, borderRadius: 0 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(34,197,94,0.06)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                Profile
              </button>
              <div style={{ height: 1, background: C.border, margin: "0 14px" }} />
              <button
                onClick={() => { onLogout(); setUserMenuOpen(false); }}
                style={{ width: "100%", padding: "10px 14px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, borderRadius: 0 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// ── Event Context Block (sidebar) ──────────────────────────────────
interface EventContextBlockProps {
  role: string;
  userId: number;
  teamId: number | null;
  currentEvent: HackathonEvent | null;
  onSelectEvent: (e: HackathonEvent) => void;
  dropdownOpen: boolean;
  onToggleDropdown: () => void;
  collapsed: boolean;
}

function EventContextBlock({ role, userId, teamId, currentEvent, onSelectEvent, dropdownOpen, onToggleDropdown, collapsed }: EventContextBlockProps) {
  if (collapsed) return null;

  if (role === 'PARTICIPANT') {
    if (!currentEvent || teamId === null) return null;
    const team = teams.find(t => t.team_id === teamId);
    const track = team ? tracks.find(tr => tr.track_id === team.track_id) : null;
    const activeRound = rounds.find(r => r.event_id === currentEvent.event_id && r.status === 'ACTIVE');
    return (
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "10px 14px", background: "rgba(34,197,94,0.04)" }}>
        <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {currentEvent.name}
        </div>
        {track && (
          <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {track.name}
          </div>
        )}
        {activeRound && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
            <div style={{ width: 5, height: 5, background: C.green, borderRadius: "50%", boxShadow: `0 0 4px ${C.green}` }} />
            <span style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.08em" }}>
              {activeRound.name} · ACTIVE
            </span>
          </div>
        )}
      </div>
    );
  }

  const available = getAvailableEvents(role, userId);
  if (available.length === 0) return null;

  const statusColor = (status: string) =>
    status === 'OPEN' ? C.green : status === 'DRAFT' ? C.textMuted : C.red;

  return (
    <div style={{ borderBottom: `1px solid ${C.border}`, position: "relative" }}>
      <button
        onClick={onToggleDropdown}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px", background: dropdownOpen ? "rgba(34,197,94,0.06)" : "rgba(34,197,94,0.03)",
          border: "none", cursor: "pointer", borderRadius: 0, gap: 6,
        }}
      >
        <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
          <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {currentEvent?.name ?? "Select Event"}
          </div>
          {currentEvent && (
            <div style={{ color: statusColor(currentEvent.status), fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.1em", marginTop: 1 }}>
              {currentEvent.status}
            </div>
          )}
        </div>
      </button>

      {dropdownOpen && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: C.surface, border: `1px solid ${C.border}`, borderTop: "none", zIndex: 100, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
          {available.map(ev => {
            const isActive = ev.event_id === currentEvent?.event_id;
            return (
              <button
                key={ev.event_id}
                onClick={() => onSelectEvent(ev)}
                style={{
                  width: "100%", display: "flex", flexDirection: "column", gap: 2, padding: "10px 14px",
                  background: isActive ? "rgba(34,197,94,0.08)" : "transparent",
                  border: "none", borderLeft: isActive ? `2px solid ${C.green}` : "2px solid transparent",
                  cursor: "pointer", textAlign: "left", borderRadius: 0,
                }}
                onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(34,197,94,0.06)"; }}
                onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <span style={{ color: isActive ? C.green : C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600 }}>{ev.name}</span>
                <span style={{ color: statusColor(ev.status), fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.1em" }}>{ev.status}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Dashboard Layout ───────────────────────────────────────────────
export function DashboardLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout, currentEvent, setCurrentEvent, availableRoles, setActiveRole } = useAuth();
  const { addAuthToast } = useNotifications();
  const [collapsed, setCollapsed] = useState(false);
  const [eventDropdownOpen, setEventDropdownOpen] = useState(false);

  if (!currentUser) return null;

  const pendingCount = accountApprovals.filter(a => a.status === 'PENDING').length;
  const nav = buildNav(currentUser.role, currentUser.is_leader, currentUser.team_id, pendingCount);
  const sidebarWidth = collapsed ? 0 : 248;
  const pageTitle = getPageTitle(location.pathname);

  function handleLogout() {
    const name = currentUser.full_name;
    addAuthToast({ type: 'info', title: 'LOGGED OUT', message: `Goodbye, ${name}. See you next time!` });
    logout();
    navigate('/');
  }

  const isDashboardRoute = location.pathname !== '/';

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", color: C.text }}>
      {/* Full-width top navbar */}
      <TopNavbar
        pageTitle={pageTitle}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(c => !c)}
        currentUser={currentUser}
        currentEvent={currentEvent}
        onSelectEvent={(e) => setCurrentEvent(e)}
        onLogout={handleLogout}
        onNavigate={navigate}
      />

      {/* Sidebar + main content row */}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <aside
          style={{
            width: sidebarWidth,
            flexShrink: 0,
            background: C.surface,
            borderRight: collapsed ? "none" : `1px solid ${C.border}`,
            display: "flex",
            flexDirection: "column",
            transition: "width 0.25s ease",
            position: "sticky",
            top: NAVBAR_H,
            height: `calc(100vh - ${NAVBAR_H}px)`,
            overflow: "hidden",
          }}
        >
          <EventContextBlock
            role={currentUser.role}
            userId={currentUser.user_id}
            teamId={currentUser.team_id}
            currentEvent={currentEvent}
            onSelectEvent={(e) => { setCurrentEvent(e); setEventDropdownOpen(false); }}
            dropdownOpen={eventDropdownOpen}
            onToggleDropdown={() => setEventDropdownOpen(o => !o)}
            collapsed={collapsed}
          />

          <nav style={{ flex: 1, overflowY: "auto", padding: collapsed ? "12px 6px" : "16px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Home — never active, uses Link for no-reload */}
            <Link
              to="/"
              title={collapsed ? "Home" : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: collapsed ? "center" : "flex-start",
                gap: 8,
                padding: collapsed ? "10px 6px" : "10px 12px",
                color: C.textMuted,
                textDecoration: "none",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
                letterSpacing: "0.01em",
                transition: "all 0.15s ease",
                border: "1px solid transparent",
                borderLeft: "2px solid transparent",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.green; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
            >
              {!collapsed && <span>Home</span>}
            </Link>

            {nav.map((item) => {
              const active = isDashboardRoute && location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  title={collapsed ? item.label : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: collapsed ? "center" : "space-between",
                    gap: 8,
                    padding: collapsed ? "10px 6px" : "10px 12px",
                    background: active ? "rgba(34,197,94,0.1)" : "transparent",
                    border: active ? `1px solid rgba(34,197,94,0.35)` : `1px solid transparent`,
                    borderLeft: active ? `2px solid ${C.green}` : `2px solid transparent`,
                    color: active ? C.green : C.textMuted,
                    cursor: "pointer",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 13,
                    letterSpacing: "0.01em",
                    textAlign: "left",
                    borderRadius: 0,
                    transition: "all 0.15s ease",
                    boxShadow: active ? `0 0 12px rgba(34,197,94,0.15)` : "none",
                    width: "100%",
                  }}
                  onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = C.green; }}
                  onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    {!collapsed && (
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>
                    )}
                  </span>
                  {!collapsed && item.badge !== undefined && item.badge > 0 && (
                    <PixelBadge color="yellow">{item.badge}</PixelBadge>
                  )}
                </button>
              );
            })}
          </nav>

          <div style={{ borderTop: `1px solid ${C.border}`, padding: collapsed ? "10px 6px" : "14px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
            {!collapsed && (
              <div>
                <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, marginBottom: 2 }}>
                  Logged in as
                </div>
                <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {currentUser.full_name}
                </div>
              </div>
            )}
            {availableRoles.length > 1 && (
              <button
                onClick={() => { setActiveRole(null); navigate("/select-role"); }}
                title={collapsed ? "Switch Role" : undefined}
                style={{
                  padding: collapsed ? "8px 4px" : "8px 10px",
                  background: "transparent",
                  border: `1px solid rgba(59,130,246,0.35)`,
                  color: "#3b82f6",
                  cursor: "pointer",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  borderRadius: 0,
                  width: "100%",
                  textAlign: "center",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(59,130,246,0.12)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                {collapsed ? "⇄" : "SWITCH ROLE"}
              </button>
            )}
            <button
              onClick={handleLogout}
              style={{
                padding: collapsed ? "8px 4px" : "8px 10px",
                background: "transparent",
                border: `1px solid rgba(239,68,68,0.35)`,
                color: C.red,
                cursor: "pointer",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                borderRadius: 0,
                width: "100%",
                textAlign: "center",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.12)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              LOGOUT
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, overflow: "auto", minWidth: 0 }}>
          {children}
        </main>
      </div>

      {/* Full-width footer — outside the sidebar+content row */}
      <SealFooter />
    </div>
  );
}
