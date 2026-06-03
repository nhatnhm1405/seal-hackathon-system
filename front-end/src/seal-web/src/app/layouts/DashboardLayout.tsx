import { ReactNode, useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router";
import { C, PixelBadge } from "@/shared/components/PixelComponents";
import { useAuth } from "@/app/providers/AuthProvider";
import { SealFooter } from "@/shared/components/SealFooter";
import {
  accountApprovals, events, tracks, rounds,
  judgeAssignments, mentorAssignments, teams, HackathonEvent,
} from "@/shared/mocks/mockData";
import sealLogo from "@/assets/image.png";

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
      { path: "/coordinator/accounts",  label: "Account Approvals", badge: pendingCount },
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
    "/coordinator/accounts": "Account Approvals",
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
    const assigned = mentorAssignments.filter(m => m.mentor_id === userId);
    const eventIds = new Set(tracks.filter(t => assigned.some(a => a.track_id === t.track_id)).map(t => t.event_id));
    return events.filter(e => eventIds.has(e.event_id));
  }
  if (role === 'JUDGE') {
    const assigned = judgeAssignments.filter(j => j.judge_id === userId);
    const eventIds = new Set(rounds.filter(r => assigned.some(a => a.round_id === r.round_id)).map(r => r.event_id));
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
      background: "rgba(13,17,23,0.95)",
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
        <button
          onClick={onToggleCollapse}
          style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted, fontSize: 18, padding: "4px 6px", lineHeight: 1, minWidth: 28 }}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        />
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
                {currentEvent.event_name}
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
                  {currentEvent?.event_name ?? "Select Event"}
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
                        onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                        onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      >
                        <span style={{ color: isActive ? C.green : C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600 }}>{ev.event_name}</span>
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

      {/* RIGHT — bell + user menu */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        {/* Bell */}
        <div style={{ position: "relative", cursor: "pointer" }}>
          <span style={{ fontSize: 18, color: C.textMuted }}>🔔</span>
          <span style={{
            position: "absolute", top: -4, right: -6,
            background: C.red, color: "#fff",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
            borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center",
          }}>3</span>
        </div>

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
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
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
          {currentEvent.event_name}
        </div>
        {track && (
          <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {track.track_name}
          </div>
        )}
        {activeRound && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
            <div style={{ width: 5, height: 5, background: C.green, borderRadius: "50%", boxShadow: `0 0 4px ${C.green}` }} />
            <span style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.08em" }}>
              {activeRound.round_name} · ACTIVE
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
            {currentEvent?.event_name ?? "Select Event"}
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
                onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <span style={{ color: isActive ? C.green : C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600 }}>{ev.event_name}</span>
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
  const { currentUser, logout, currentEvent, setCurrentEvent } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [eventDropdownOpen, setEventDropdownOpen] = useState(false);

  if (!currentUser) return null;

  const pendingCount = accountApprovals.filter(a => a.status === 'PENDING').length;
  const nav = buildNav(currentUser.role, currentUser.is_leader, currentUser.team_id, pendingCount);
  const sidebarWidth = collapsed ? 56 : 248;
  const pageTitle = getPageTitle(location.pathname);

  function handleLogout() {
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
            borderRight: `1px solid ${C.border}`,
            display: "flex",
            flexDirection: "column",
            transition: "width 0.2s ease",
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
