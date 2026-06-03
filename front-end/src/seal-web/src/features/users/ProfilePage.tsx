import { useState } from "react";
import { C, PixelCard, PixelBadge, PixelButton, PixelInput, PixelProgress, PixelTabs, TerminalWindow } from "@/shared/components/PixelComponents";

type Page = "landing" | "auth" | "dashboard" | "events" | "teams" | "submissions" | "leaderboard" | "judge" | "admin" | "profile";

const achievements = [
  { id: 1, title: "First Hack", desc: "Participated in first hackathon", earned: true },
  { id: 2, title: "Speed Demon", desc: "Submitted with 6+ hours to spare", earned: true },
  { id: 3, title: "Team Player", desc: "Joined a team of 4", earned: true },
  { id: 4, title: "Podium Finish", desc: "Placed in top 3", earned: false },
  { id: 5, title: "Repeat Hacker", desc: "Participated in 3+ events", earned: false },
  { id: 6, title: "Community Star", desc: "Received 50+ upvotes", earned: false },
];

const activityHistory = [
  { date: "Jun 17", action: "Submitted K8s Oracle project", type: "submission" },
  { date: "Jun 15", action: "Joined SEAL Hack 2026", type: "event" },
  { date: "Jun 12", action: "Formed team Segfault Heroes", type: "team" },
  { date: "May 20", action: "Earned Speed Demon badge", type: "achievement" },
  { date: "May 03", action: "AI Sprint 2026 — 4th place finish", type: "result" },
];

const actColors: Record<string, string> = {
  submission: C.green,
  event: "#60a5fa",
  team: "#a78bfa",
  achievement: "#facc15",
  result: C.green,
};

export function ProfilePage({ navigate }: { navigate: (page: Page) => void }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [editMode, setEditMode] = useState(false);
  const [bio, setBio] = useState("Full-stack dev & hackathon enthusiast. I love building tools that help other developers ship faster. Go / K8s / React.");
  const [username, setUsername] = useState("grace_go");
  const [email, setEmail] = useState("grace@godev.io");

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "achievements", label: "Achievements" },
    { id: "history", label: "History" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Profile header */}
      <PixelCard className="p-6 mb-6" glow>
        <div className="flex flex-wrap gap-6 items-start">
          {/* Avatar */}
          <div style={{ position: "relative" }}>
            <div
              style={{
                width: 80,
                height: 80,
                background: "rgba(34,197,94,0.15)",
                border: `2px solid ${C.green}`,
                display: "grid",
                placeItems: "center",
                boxShadow: `0 0 20px rgba(34,197,94,0.3)`,
                borderRadius: 0,
              }}
            >
              <span style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 32, fontWeight: 900 }}>G</span>
            </div>
            <div
              style={{
                position: "absolute",
                bottom: -4,
                right: -4,
                width: 16,
                height: 16,
                background: C.green,
                borderRadius: 0,
                boxShadow: `0 0 8px ${C.green}`,
              }}
            />
          </div>

          {/* Info */}
          <div style={{ flex: 1 }}>
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700 }}>
                @{username}
              </h1>
              <PixelBadge color="green">HACKER</PixelBadge>
              <PixelBadge color="gray">LEVEL 7</PixelBadge>
            </div>
            <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, lineHeight: 1.7, marginBottom: 12, maxWidth: 500 }}>
              {bio}
            </p>
            <div className="flex flex-wrap gap-4">
              {[
                { label: "Events", value: 5 },
                { label: "Teams", value: 3 },
                { label: "Submissions", value: 4 },
                { label: "Best Rank", value: "#3" },
              ].map((s) => (
                <div key={s.label} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  <div style={{ color: C.green, fontSize: 18, fontWeight: 700 }}>{s.value}</div>
                  <div style={{ color: C.textMuted, fontSize: 10, textTransform: "uppercase" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <PixelButton variant="secondary" size="sm" onClick={() => setEditMode(!editMode)}>
              {editMode ? "CANCEL" : "EDIT"}
            </PixelButton>
            <PixelButton variant="ghost" size="sm" onClick={() => navigate("landing")}>LOGOUT</PixelButton>
          </div>
        </div>
      </PixelCard>

      <PixelTabs tabs={tabs} active={activeTab} onChange={setActiveTab} className="mb-6" />

      {/* Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Skill radar */}
          <PixelCard className="p-5">
            <div className="flex flex-col gap-4">
              {[
                { skill: "Go / Backend", level: 92 },
                { skill: "Kubernetes", level: 85 },
                { skill: "React / Frontend", level: 70 },
                { skill: "DevOps / CI/CD", level: 78 },
                { skill: "Databases", level: 65 },
                { skill: "Machine Learning", level: 45 },
              ].map((s) => (
                <div key={s.skill}>
                  <div className="flex justify-between mb-1">
                    <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{s.skill}</span>
                    <span style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{s.level}%</span>
                  </div>
                  <PixelProgress value={s.level} max={100} showValue={false} />
                </div>
              ))}
            </div>
          </PixelCard>

          {/* Terminal summary */}
          <div className="flex flex-col gap-4">
            <TerminalWindow title="profile.sh">
              <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 5 }}>
                <div><span style={{ color: C.green }}>$ </span><span style={{ color: C.textMuted }}>whoami</span></div>
                <div style={{ color: C.text, paddingLeft: 16 }}>grace_go</div>
                <div><span style={{ color: C.green }}>$ </span><span style={{ color: C.textMuted }}>cat skills.txt</span></div>
                <div style={{ color: C.text, paddingLeft: 16 }}>Go, Kubernetes, React, DevOps</div>
                <div><span style={{ color: C.green }}>$ </span><span style={{ color: C.textMuted }}>hack --stats</span></div>
                <div style={{ color: C.text, paddingLeft: 16 }}>
                  <div>Events:      <span style={{ color: C.green }}>5</span></div>
                  <div>Best rank:   <span style={{ color: C.green }}>#3</span></div>
                  <div>Total pts:   <span style={{ color: C.green }}>32,440</span></div>
                  <div>Streak:      <span style={{ color: C.green }}>3 events</span></div>
                </div>
                <div><span style={{ color: C.green }}>$ </span><span className="cursor-blink" style={{ color: C.green }}></span></div>
              </div>
            </TerminalWindow>

            {/* Current team */}
            <PixelCard className="p-4" glow>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, background: "rgba(34,197,94,0.1)", border: `1px solid ${C.green}`, display: "grid", placeItems: "center", borderRadius: 0 }}>
                  <span style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700 }}>T</span>
                </div>
                <div>
                  <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600 }}>Segfault Heroes</div>
                  <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>SEAL Hack 2026 · Rank #3</div>
                </div>
              </div>
              <PixelProgress value={8440} max={10000} label="Team score" />
              <div className="flex gap-2 mt-3">
                <PixelButton size="sm" onClick={() => navigate("teams")}>VIEW TEAM</PixelButton>
                <PixelButton size="sm" variant="secondary" onClick={() => navigate("submissions")}>SUBMISSION</PixelButton>
              </div>
            </PixelCard>
          </div>
        </div>
      )}

      {/* Achievements */}
      {activeTab === "achievements" && (
        <div>
          <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginBottom: 16 }}>
            {achievements.filter((a) => a.earned).length}/{achievements.length} achievements earned
          </div>
          <PixelProgress
            value={achievements.filter((a) => a.earned).length}
            max={achievements.length}
            label="Achievement progress"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {achievements.map((ach) => (
              <PixelCard
                key={ach.id}
                className="p-5"
                glow={ach.earned}
                style={{ opacity: ach.earned ? 1 : 0.4 }}
              >
                <div className="flex items-start gap-4">
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      background: ach.earned ? "rgba(34,197,94,0.15)" : C.surface2,
                      border: `2px solid ${ach.earned ? C.green : C.border}`,
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                      borderRadius: 0,
                      boxShadow: ach.earned ? `0 0 12px rgba(34,197,94,0.3)` : "none",
                    }}
                  >
                    <span style={{ color: ach.earned ? C.green : C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700 }}>{ach.id}</span>
                  </div>
                  <div>
                    <div style={{ color: ach.earned ? C.text : C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                      {ach.title}
                    </div>
                    <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, lineHeight: 1.5 }}>
                      {ach.desc}
                    </div>
                    {!ach.earned && (
                      <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, marginTop: 6 }}>LOCKED</div>
                    )}
                  </div>
                </div>
              </PixelCard>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {activeTab === "history" && (
        <PixelCard className="p-5">
          <div className="flex flex-col">
            {activityHistory.map((item, i) => (
              <div key={i} className="flex gap-4" style={{ marginBottom: i < activityHistory.length - 1 ? 0 : 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 24 }}>
                  <div style={{ width: 10, height: 10, background: actColors[item.type], borderRadius: 0, flexShrink: 0, marginTop: 4 }} />
                  {i < activityHistory.length - 1 && (
                    <div style={{ flex: 1, width: 1, background: `linear-gradient(to bottom, ${actColors[item.type]}, rgba(34,197,94,0.05))`, minHeight: 32, margin: "4px 0" }} />
                  )}
                </div>
                <div style={{ paddingBottom: i < activityHistory.length - 1 ? 20 : 0 }}>
                  <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, marginBottom: 2 }}>{item.date}</div>
                  <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>{item.action}</div>
                </div>
              </div>
            ))}
          </div>
        </PixelCard>
      )}

      {/* Settings */}
      {activeTab === "settings" && (
        <div className="flex flex-col gap-5">
          <PixelCard className="p-5">
            <div className="flex flex-col gap-4">
              <PixelInput label="Username" value={username} onChange={(e) => setUsername(e.target.value)} prefix="@" />
              <PixelInput label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <div>
                <label style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", display: "block", marginBottom: 8, textTransform: "uppercase" }}>
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  style={{
                    width: "100%",
                    background: C.surface2,
                    border: `1px solid ${C.border}`,
                    color: C.text,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 13,
                    padding: "10px 12px",
                    resize: "vertical",
                    outline: "none",
                    caretColor: C.green,
                    borderRadius: 0,
                  }}
                  onFocus={(e) => (e.target.style.borderColor = C.green)}
                  onBlur={(e) => (e.target.style.borderColor = C.border)}
                />
              </div>
            </div>
          </PixelCard>

          <PixelCard className="p-5">
            <div className="flex flex-col gap-4">
              <PixelInput label="Current Password" type="password" placeholder="••••••••" />
              <PixelInput label="New Password" type="password" placeholder="••••••••" />
              <PixelInput label="Confirm New Password" type="password" placeholder="••••••••" />
              <div className="flex items-center gap-3">
                <input type="checkbox" style={{ accentColor: C.green, width: 16, height: 16 }} />
                <label style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, cursor: "pointer" }}>
                  Enable two-factor authentication (2FA)
                </label>
              </div>
            </div>
          </PixelCard>

          <div className="flex gap-3">
            <PixelButton>SAVE CHANGES</PixelButton>
            <PixelButton variant="danger">DELETE ACCOUNT</PixelButton>
          </div>
        </div>
      )}
    </div>
  );
}
