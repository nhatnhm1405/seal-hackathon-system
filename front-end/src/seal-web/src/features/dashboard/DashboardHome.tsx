import { C, CyberStatCard, PixelCard, PixelBadge, PixelProgress, PixelButton, TerminalWindow, GradientText } from "@/shared/components/PixelComponents";

type Page = "landing" | "auth" | "dashboard" | "events" | "teams" | "submissions" | "leaderboard" | "judge" | "admin" | "profile";

// ── Data ─────────────────────────────────────────────────────────
const recentActivity = [
  { time: "2m ago",  event: "Team NullPntr submitted project",         color: C.green  },
  { time: "15m ago", event: "New team registered: Segfault Heroes",    color: C.blue   },
  { time: "1h ago",  event: "Judge @alice_dev scored ByteBlasters",    color: "#facc15" },
  { time: "2h ago",  event: "Event 'SEAL Hack 2026' went live",        color: C.purple },
  { time: "3h ago",  event: "System backup completed successfully",    color: C.textMuted },
  { time: "4h ago",  event: "50 new registrations processed",          color: C.cyan   },
];

const events = [
  { name: "SEAL Hack 2026",   status: "active",   teams: 120, submissions: 98,  timeLeft: "14h 22m", progress: 82 },
  { name: "DevChallenge Q3",  status: "upcoming", teams: 45,  submissions: 0,   timeLeft: "7 days",  progress: 0  },
  { name: "Crypto Clash 2026",status: "draft",     teams: 0,   submissions: 0,   timeLeft: "—",       progress: 0  },
];

const teamProgress = [
  { name: "Team Cipher",    score: 9240, progress: 94, status: "submitted",   rank: 1 },
  { name: "NullPntr",      score: 8815, progress: 88, status: "submitted",   rank: 2 },
  { name: "Segfault Heroes",score: 8440, progress: 85, status: "in-progress", rank: 3 },
  { name: "ByteBlasters",  score: 7920, progress: 79, status: "in-progress", rank: 4 },
  { name: "404 Not Found", score: 7100, progress: 71, status: "registered",  rank: 5 },
];

// ── Metric sparkline (mini bar chart) ────────────────────────────
function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 24 }}>
      {values.map((v, i) => (
        <div
          key={i}
          style={{
            width: 6,
            height: `${(v / max) * 100}%`,
            background: i === values.length - 1 ? color : `${color}55`,
            minHeight: 2,
            borderRadius: 0,
            transition: "height 0.5s ease",
          }}
        />
      ))}
    </div>
  );
}

// ── Event card ────────────────────────────────────────────────────
function EventCard({ ev, navigate }: { ev: typeof events[0]; navigate: (p: Page) => void }) {
  const isActive = ev.status === "active";
  const statusColor = isActive ? "green" : ev.status === "upcoming" ? "yellow" : "gray";
  const accentColor = isActive ? C.green : ev.status === "upcoming" ? C.blue : C.textMuted;

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${accentColor}22`,
        padding: "16px 18px",
        position: "relative",
        overflow: "hidden",
        boxShadow: isActive ? `0 0 20px ${C.greenGlowFaint}, 0 0 40px rgba(59,130,246,0.04)` : "none",
        transition: "box-shadow 0.2s ease",
      }}
    >
      {/* Top gradient line */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: isActive ? "linear-gradient(90deg, #22c55e, #3b82f6)" : `linear-gradient(90deg, ${accentColor}, transparent)`, opacity: isActive ? 0.8 : 0.4 }} />
      {/* Ambient blob */}
      <div style={{ position: "absolute", bottom: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: `radial-gradient(circle, ${accentColor}14, transparent 70%)`, pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <div>
            <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700 }}>{ev.name}</div>
            <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, marginTop: 2 }}>
              {ev.teams} teams · {ev.submissions} submissions
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <PixelBadge color={statusColor as "green" | "yellow" | "gray"}>● {ev.status}</PixelBadge>
            {ev.timeLeft !== "—" && (
              <span style={{ color: isActive ? C.cyan : C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>{ev.timeLeft}</span>
            )}
          </div>
        </div>
        {ev.progress > 0 && <PixelProgress value={ev.progress} max={100} showValue={false} gradient />}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────
export function DashboardHome({ navigate }: { navigate: (page: Page) => void }) {
  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }}>

      {/* Welcome banner */}
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(135deg, rgba(34,197,94,0.07) 0%, rgba(59,130,246,0.05) 50%, rgba(6,182,212,0.03) 100%)",
          border: `1px solid rgba(34,197,94,0.2)`,
          borderLeft: `3px solid transparent`,
          borderImage: "linear-gradient(180deg, #22c55e, #3b82f6) 1",
          padding: "18px 22px",
          marginBottom: 24,
        }}
      >
        {/* Top shimmer */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, #22c55e55, #3b82f655, transparent)" }} />
        {/* Right-side glow blob */}
        <div style={{ position: "absolute", right: -30, top: -30, width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.1), transparent 70%)", pointerEvents: "none" }} />

        <div className="flex items-center justify-between gap-4 flex-wrap" style={{ position: "relative", zIndex: 1 }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700 }}>
              <span style={{ color: C.text }}>Good evening, </span>
              <GradientText from={C.green} to={C.blue}>seal_admin</GradientText>
            </div>
            <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginTop: 2 }}>
              SEAL Hack 2026 is live — <span style={{ color: C.cyan }}>14h 22m</span> remaining
            </div>
          </div>
          <div className="flex gap-3">
            <PixelButton size="sm" variant="cyber" onClick={() => navigate("events")}>VIEW EVENTS</PixelButton>
            <PixelButton size="sm" variant="secondary" onClick={() => navigate("leaderboard")}>LEADERBOARD</PixelButton>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <CyberStatCard value="2,400" label="Total Hackers"   trend="+124 today" accent="green"  sublabel="↑ 5.4% this week" />
        <CyberStatCard value="320"   label="Active Teams"   trend="+8 today"   accent="blue"   sublabel="120 in SEAL Hack 2026" />
        <CyberStatCard value="98"    label="Submissions"    trend="+23 today"  accent="cyan"   sublabel="2 pending review" />
        <CyberStatCard value="$50K"  label="Prize Pool"                        accent="purple" sublabel="Across 3 active events" />
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left 2/3 */}
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* Active Events */}
          <div>
            <div className="flex flex-col gap-3">
              {events.map((ev) => <EventCard key={ev.name} ev={ev} navigate={navigate} />)}
            </div>
          </div>

          {/* Team standings */}
          <div>
            <div
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* Header gradient */}
              <div style={{ padding: "10px 16px", background: "linear-gradient(90deg, rgba(34,197,94,0.06), rgba(59,130,246,0.04))", borderBottom: `1px solid ${C.border}`, display: "grid", gridTemplateColumns: "32px 1fr 100px 80px 100px", gap: 12, alignItems: "center" }}>
                {["#", "TEAM", "SCORE", "STATUS", "PROGRESS"].map((h) => (
                  <span key={h} style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.12em" }}>{h}</span>
                ))}
              </div>

              {teamProgress.map((team, i) => (
                <div
                  key={team.name}
                  style={{
                    padding: "12px 16px",
                    borderBottom: i < teamProgress.length - 1 ? `1px solid rgba(34,197,94,0.06)` : "none",
                    display: "grid",
                    gridTemplateColumns: "32px 1fr 100px 80px 100px",
                    gap: 12,
                    alignItems: "center",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(34,197,94,0.03)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                >
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
                    <span style={{ color: team.rank <= 3 ? C.green : C.textMuted }}>#{team.rank}</span>
                  </span>
                  <span style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600 }}>{team.name}</span>
                  <span style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, textShadow: `0 0 8px ${C.greenGlow}` }}>
                    {team.score.toLocaleString()}
                  </span>
                  <PixelBadge color={team.status === "submitted" ? "green" : team.status === "in-progress" ? "yellow" : "gray"}>
                    {team.status === "submitted" ? "done" : team.status === "in-progress" ? "active" : "reg"}
                  </PixelBadge>
                  <PixelProgress value={team.progress} max={100} showValue={false} gradient />
                </div>
              ))}
            </div>
          </div>

          {/* Tech metrics row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "API Latency",   value: "12ms",   sparkline: [8,10,9,12,11,12,12], color: C.green  },
              { label: "Cache Hit",     value: "94%",    sparkline: [88,91,90,94,92,93,94], color: C.blue  },
              { label: "Error Rate",    value: "0.03%",  sparkline: [0.1,0.05,0.03,0.04,0.03,0.02,0.03], color: C.cyan },
              { label: "DB Queries/s",  value: "2.4K",   sparkline: [1.8,2.1,2.0,2.4,2.2,2.3,2.4], color: C.purple },
            ].map((m) => (
              <div
                key={m.label}
                style={{
                  background: C.surface,
                  border: `1px solid ${m.color}18`,
                  padding: "12px 14px",
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: `0 0 16px ${m.color}0a`,
                }}
              >
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, ${m.color}, transparent)`, opacity: 0.5 }} />
                <div className="flex justify-between items-start mb-2">
                  <div style={{ color: m.color, fontFamily: "'JetBrains Mono', monospace", fontSize: 17, fontWeight: 800 }}>{m.value}</div>
                </div>
                <MiniSparkline values={m.sparkline} color={m.color} />
                <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 6 }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">

          {/* Activity feed */}
          <div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, #22c55e55, #3b82f644, transparent)" }} />
              {recentActivity.map((a, i) => (
                <div
                  key={i}
                  style={{ padding: "10px 14px", borderBottom: i < recentActivity.length - 1 ? `1px solid rgba(34,197,94,0.06)` : "none", display: "flex", gap: 10, alignItems: "flex-start" }}
                >
                  <div style={{ width: 6, height: 6, background: a.color, marginTop: 4, flexShrink: 0, boxShadow: `0 0 6px ${a.color}`, borderRadius: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, lineHeight: 1.5 }}>{a.event}</div>
                    <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, marginTop: 1 }}>{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System terminal */}
          <TerminalWindow title="sys-monitor — live">
            <div style={{ fontSize: 11, display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { label: "CPU",   value: "12%", bar: 12,  color: C.green  },
                { label: "MEM",   value: "68%", bar: 68,  color: C.blue   },
                { label: "DB",    value: "34%", bar: 34,  color: C.cyan   },
                { label: "CACHE", value: "94%", bar: 94,  color: C.green  },
              ].map((m) => (
                <div key={m.label}>
                  <div className="flex justify-between mb-1">
                    <span style={{ color: C.textMuted }}>{m.label}</span>
                    <span style={{ color: m.color, fontWeight: 700 }}>{m.value}</span>
                  </div>
                  <div style={{ height: 3, background: C.surface3, borderRadius: 0, overflow: "hidden" }}>
                    <div style={{ width: `${m.bar}%`, height: "100%", background: m.color, boxShadow: `0 0 4px ${m.color}`, transition: "width 1s" }} />
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 6, color: C.textMuted, borderTop: `1px solid ${C.border}`, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                <span>UPTIME</span>
                <span style={{ color: C.green }}>99.97%</span>
              </div>
              <div style={{ color: C.textMuted, display: "flex", justifyContent: "space-between" }}>
                <span>BUILD</span>
                <span style={{ color: C.green }}>PASSING</span>
              </div>
            </div>
          </TerminalWindow>

          {/* Quick actions */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "16px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.4), transparent)" }} />
            <div className="flex flex-col gap-2">
              {[
                { label: "Create Event",        page: "events" as Page },
                { label: "Manage Teams",        page: "teams" as Page },
                { label: "Review Submissions",  page: "submissions" as Page },
                { label: "Open Judge Panel",    page: "judge" as Page },
              ].map((action) => (
                <PixelButton key={action.label} variant="ghost" size="sm" onClick={() => navigate(action.page)} className="justify-start">
                  <span>{action.label}</span>
                </PixelButton>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
