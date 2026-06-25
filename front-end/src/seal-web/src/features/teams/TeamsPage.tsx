import { useState } from "react";
import { C, PixelCard, PixelBadge, PixelButton, PixelInput, PixelProgress, PixelTable } from "@/shared/components/PixelComponents";

type Page = "landing" | "auth" | "dashboard" | "events" | "teams" | "submissions" | "leaderboard" | "judge" | "admin" | "profile";

const teams = [
  {
    id: 1, name: "Team Cipher", score: 9240, members: ["alice_dev", "bob_42", "carol_ml", "dave_sys"],
    status: "submitted", event: "SEAL Hack 2026", skills: ["AI", "Python", "React"], rank: 1,
  },
  {
    id: 2, name: "NullPntr", score: 8815, members: ["eve_web", "frank_rs"],
    status: "submitted", event: "SEAL Hack 2026", skills: ["Rust", "WebAssembly"], rank: 2,
  },
  {
    id: 3, name: "Segfault Heroes", score: 8440, members: ["grace_go", "henry_k8s", "ivan_oci"],
    status: "in-progress", event: "SEAL Hack 2026", skills: ["Go", "K8s", "DevOps"], rank: 3,
  },
  {
    id: 4, name: "ByteBlasters", score: 7920, members: ["judy_ts", "kevin_vue"],
    status: "in-progress", event: "SEAL Hack 2026", skills: ["TypeScript", "Vue", "Node"], rank: 4,
  },
  {
    id: 5, name: "404 Not Found", score: 7100, members: ["lily_data", "mike_spark", "nina_sql", "oscar_bi"],
    status: "registered", event: "SEAL Hack 2026", skills: ["Data Eng", "Spark", "SQL"], rank: 5,
  },
  {
    id: 6, name: "RecursionError", score: 6890, members: ["peter_ml"],
    status: "registered", event: "DevChallenge Q3", skills: ["Python", "ML", "FastAPI"], rank: 6,
  },
];

const tableColumns = [
  { key: "rank" as const, header: "#", width: "40px" },
  { key: "name" as const, header: "Team Name" },
  { key: "members" as const, header: "Members", render: (v: unknown) => `${(v as string[]).length}/4` },
  { key: "status" as const, header: "Status", render: (v: unknown) => {
    const s = v as string;
    return <PixelBadge color={s === "submitted" ? "green" : s === "in-progress" ? "yellow" : "gray"}>{s}</PixelBadge>;
  }},
  { key: "score" as const, header: "Score", render: (v: unknown) => <span style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace" }}>{(v as number).toLocaleString()}</span> },
  { key: "event" as const, header: "Event" },
];

export function TeamsPage({ navigate }: { navigate: (page: Page) => void }) {
  const [view, setView] = useState<"grid" | "table">("grid");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<typeof teams[0] | null>(null);

  const filtered = teams.filter((t) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700 }}>Teams</h1>
        </div>
        <div className="flex gap-3">
          <PixelButton variant="ghost" size="sm" onClick={() => setView(view === "grid" ? "table" : "grid")}>
            {view === "grid" ? "TABLE" : "GRID"}
          </PixelButton>
          <PixelButton size="sm">+ INVITE TEAM</PixelButton>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Teams", value: teams.length, color: C.text },
          { label: "Submitted", value: teams.filter((t) => t.status === "submitted").length, color: C.green },
          { label: "In Progress", value: teams.filter((t) => t.status === "in-progress").length, color: "#facc15" },
          { label: "Registered", value: teams.filter((t) => t.status === "registered").length, color: C.textMuted },
        ].map((s) => (
          <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "12px 16px", fontFamily: "'JetBrains Mono', monospace" }}>
            <div style={{ color: s.color, fontSize: 22, fontWeight: 700 }}>{s.value}</div>
            <div style={{ color: C.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <PixelInput placeholder="search teams..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Detail panel */}
      {selected && (
        <PixelCard className="p-5 mb-6" glow>
          <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
            <div>
              <h2 style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700 }}>{selected.name}</h2>
              <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginTop: 2 }}>
                Rank #{selected.rank} · {selected.event}
              </div>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em" }}>CLOSE</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex flex-col gap-2">
                {selected.members.map((m, i) => (
                  <div key={m} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: C.surface2, border: `1px solid ${C.border}` }}>
                    <div style={{ width: 28, height: 28, background: "rgba(34,197,94,0.15)", border: `1px solid ${C.border}`, display: "grid", placeItems: "center", borderRadius: 0 }}>
                      <span style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{m[0].toUpperCase()}</span>
                    </div>
                    <div>
                      <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>@{m}</div>
                      <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                        {i === 0 ? "TEAM LEAD" : "MEMBER"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <div className="flex flex-wrap gap-2">
                  {selected.skills.map((skill) => (
                    <PixelBadge key={skill} color="green">{skill}</PixelBadge>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 36, fontWeight: 900, textShadow: `0 0 20px rgba(34,197,94,0.6)` }}>
                  {selected.score.toLocaleString()}
                </div>
                <PixelProgress value={selected.score} max={10000} label="vs max score" showValue={false} />
              </div>

              <div className="flex gap-2">
                <PixelButton size="sm" onClick={() => navigate("submissions")}>VIEW SUBMISSION</PixelButton>
                <PixelButton size="sm" variant="danger">DISQUALIFY</PixelButton>
              </div>
            </div>
          </div>
        </PixelCard>
      )}

      {/* List */}
      {view === "table" ? (
        <PixelTable
          columns={tableColumns as Parameters<typeof PixelTable>[0]["columns"]}
          data={filtered as Record<string, unknown>[]}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((team) => (
            <PixelCard
              key={team.id}
              className="p-4"
              glow={team.status === "submitted"}
              onClick={() => setSelected(team)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700 }}>
                    {team.name}
                  </div>
                  <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginTop: 2 }}>
                    {team.members.length} member{team.members.length !== 1 ? "s" : ""}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <PixelBadge color={team.status === "submitted" ? "green" : team.status === "in-progress" ? "yellow" : "gray"}>
                    {team.status}
                  </PixelBadge>
                  <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                    #{team.rank}
                  </span>
                </div>
              </div>

              {/* Members avatars */}
              <div className="flex gap-1 mb-3">
                {team.members.slice(0, 4).map((m) => (
                  <div
                    key={m}
                    title={`@${m}`}
                    style={{
                      width: 26, height: 26,
                      background: "rgba(34,197,94,0.1)",
                      border: `1px solid ${C.border}`,
                      display: "grid", placeItems: "center",
                      borderRadius: 0,
                    }}
                  >
                    <span style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                      {m[0].toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>

              {/* Skills */}
              <div className="flex flex-wrap gap-1 mb-3">
                {team.skills.map((skill) => (
                  <span
                    key={skill}
                    style={{
                      background: "rgba(34,197,94,0.05)",
                      border: `1px solid rgba(34,197,94,0.15)`,
                      color: C.textMuted,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 9,
                      padding: "2px 6px",
                      borderRadius: 0,
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>

              {/* Score */}
              <div className="flex items-center justify-between">
                <span style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700 }}>
                  {team.score.toLocaleString()}
                </span>
                <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>pts</span>
              </div>
            </PixelCard>
          ))}
        </div>
      )}
    </div>
  );
}
