import { useState } from "react";
import { C, PixelCard, PixelBadge, PixelProgress, PixelInput, PixelTabs } from "@/shared/components/PixelComponents";

type Page = "landing" | "auth" | "dashboard" | "events" | "teams" | "submissions" | "leaderboard" | "judge" | "admin" | "profile";

const rankings = [
  { rank: 1, team: "Team Cipher", score: 9240, delta: +180, members: 4, status: "submitted", innovation: 94, tech: 91, design: 88, impact: 95, event: "SEAL Hack 2026" },
  { rank: 2, team: "NullPntr", score: 8815, delta: +40, members: 2, status: "submitted", innovation: 90, tech: 93, design: 82, impact: 86, event: "SEAL Hack 2026" },
  { rank: 3, team: "Segfault Heroes", score: 8440, delta: -20, members: 3, status: "in-progress", innovation: 85, tech: 88, design: 79, impact: 90, event: "SEAL Hack 2026" },
  { rank: 4, team: "ByteBlasters", score: 7920, delta: +60, members: 2, status: "in-progress", innovation: 80, tech: 85, design: 84, impact: 74, event: "SEAL Hack 2026" },
  { rank: 5, team: "404 Not Found", score: 7100, delta: 0, members: 4, status: "registered", innovation: 72, tech: 78, design: 68, impact: 73, event: "SEAL Hack 2026" },
  { rank: 6, team: "RecursionError", score: 6890, delta: +120, members: 1, status: "registered", innovation: 70, tech: 74, design: 65, impact: 72, event: "DevChallenge Q3" },
  { rank: 7, team: "BufferOverflow", score: 6750, delta: -30, members: 3, status: "registered", innovation: 68, tech: 72, design: 70, impact: 68, event: "SEAL Hack 2026" },
  { rank: 8, team: "SyntaxTerror", score: 6510, delta: +10, members: 2, status: "registered", innovation: 65, tech: 70, design: 62, impact: 66, event: "SEAL Hack 2026" },
];

const podium = rankings.slice(0, 3);

function PodiumCard({ entry, pos }: { entry: typeof rankings[0]; pos: 1 | 2 | 3 }) {
  const heights = { 1: 120, 2: 80, 3: 60 };
  const icons = { 1: "🥇", 2: "🥈", 3: "🥉" };
  const colors = { 1: "#facc15", 2: "#d1d5db", 3: "#fb923c" };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ textAlign: "center", marginBottom: 4 }}>
        <div style={{ fontSize: 28 }}>{icons[pos]}</div>
        <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700 }}>{entry.team}</div>
        <div style={{ color: colors[pos], fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 900, textShadow: `0 0 15px ${colors[pos]}` }}>
          {entry.score.toLocaleString()}
        </div>
        <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>{entry.members} members</div>
      </div>
      <div
        style={{
          width: pos === 1 ? 120 : 100,
          height: heights[pos],
          background: `linear-gradient(to top, rgba(34,197,94,0.2), rgba(34,197,94,0.05))`,
          border: `2px solid ${colors[pos]}`,
          borderBottom: "none",
          display: "grid",
          placeItems: "center",
          boxShadow: `0 0 20px ${colors[pos]}40`,
          position: "relative",
        }}
      >
        <span style={{ color: colors[pos], fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 900 }}>#{pos}</span>
      </div>
    </div>
  );
}

export function LeaderboardPage({ navigate }: { navigate: (page: Page) => void }) {
  const [activeTab, setActiveTab] = useState("overall");
  const [search, setSearch] = useState("");

  const tabs = [
    { id: "overall", label: "Overall" },
    { id: "innovation", label: "Innovation" },
    { id: "technical", label: "Technical" },
    { id: "design", label: "Design" },
    { id: "impact", label: "Impact" },
  ];

  const getScore = (entry: typeof rankings[0]) => {
    switch (activeTab) {
      case "innovation": return entry.innovation;
      case "technical": return entry.tech;
      case "design": return entry.design;
      case "impact": return entry.impact;
      default: return entry.score;
    }
  };

  const sorted = [...rankings]
    .filter((r) => !search || r.team.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => getScore(b) - getScore(a));

  return (
    <div style={{ padding: 24 }}>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 4 }}>
            // live_leaderboard
          </div>
          <h1 style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700 }}>Leaderboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <div style={{ width: 6, height: 6, background: C.green, animation: "glowPulse 1.5s infinite", borderRadius: 0 }} />
          <span style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>UPDATING LIVE</span>
        </div>
      </div>

      {/* Podium */}
      <PixelCard className="p-8 mb-6" glow>
        <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 24, textAlign: "center" }}>
          // top_performers
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 12 }}>
          <PodiumCard entry={podium[1]} pos={2} />
          <PodiumCard entry={podium[0]} pos={1} />
          <PodiumCard entry={podium[2]} pos={3} />
        </div>
      </PixelCard>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <PixelTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
        <div style={{ marginLeft: "auto" }}>
          <PixelInput placeholder="search teams..." value={search} onChange={(e) => setSearch(e.target.value)} prefix="⌕" />
        </div>
      </div>

      {/* Rankings table */}
      <PixelCard>
        <div style={{ padding: "0" }}>
          {/* Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "48px 1fr 120px 120px 80px 100px",
              padding: "12px 20px",
              background: C.surface2,
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            {["RANK", "TEAM", "SCORE", "TREND", "MEMBERS", "STATUS"].map((h) => (
              <span key={h} style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.1em" }}>{h}</span>
            ))}
          </div>

          {sorted.map((entry, i) => {
            const score = getScore(entry);
            const maxScore = activeTab === "overall" ? 10000 : 100;
            return (
              <div
                key={entry.team}
                style={{
                  display: "grid",
                  gridTemplateColumns: "48px 1fr 120px 120px 80px 100px",
                  padding: "14px 20px",
                  borderBottom: i < sorted.length - 1 ? `1px solid rgba(34,197,94,0.06)` : "none",
                  background: i === 0 ? "rgba(34,197,94,0.05)" : "transparent",
                  transition: "background 0.15s",
                  alignItems: "center",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(34,197,94,0.04)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = i === 0 ? "rgba(34,197,94,0.05)" : "transparent")}
              >
                {/* Rank */}
                <span style={{ color: i === 0 ? "#facc15" : i === 1 ? "#d1d5db" : i === 2 ? "#fb923c" : C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700 }}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                </span>

                {/* Team */}
                <div>
                  <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600 }}>{entry.team}</div>
                  <div style={{ marginTop: 4 }}>
                    <PixelProgress value={score} max={maxScore} showValue={false} />
                  </div>
                </div>

                {/* Score */}
                <span style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 700, textShadow: `0 0 8px rgba(34,197,94,0.4)` }}>
                  {typeof score === "number" && activeTab !== "overall" ? score : score.toLocaleString()}
                </span>

                {/* Delta */}
                <span style={{
                  color: entry.delta > 0 ? C.green : entry.delta < 0 ? "#ef4444" : C.textMuted,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                }}>
                  {entry.delta > 0 ? `+${entry.delta}` : entry.delta < 0 ? `${entry.delta}` : "stable"}
                </span>

                {/* Members */}
                <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                  {entry.members}/4
                </span>

                {/* Status */}
                <PixelBadge color={entry.status === "submitted" ? "green" : entry.status === "in-progress" ? "yellow" : "gray"}>
                  {entry.status}
                </PixelBadge>
              </div>
            );
          })}
        </div>
      </PixelCard>

      {/* Category breakdown */}
      <div className="mt-6">
        <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 12 }}>
          // score_breakdown — top_teams
        </div>
        <PixelCard className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rankings.slice(0, 4).map((team) => (
              <div key={team.team}>
                <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                  {team.team}
                </div>
                <div className="flex flex-col gap-2">
                  <PixelProgress value={team.innovation} max={100} label="Innovation" />
                  <PixelProgress value={team.tech} max={100} label="Technical" />
                  <PixelProgress value={team.design} max={100} label="Design" />
                  <PixelProgress value={team.impact} max={100} label="Impact" />
                </div>
              </div>
            ))}
          </div>
        </PixelCard>
      </div>
    </div>
  );
}
