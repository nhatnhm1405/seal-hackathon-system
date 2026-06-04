import { useState } from "react";
import { C, PixelCard, PixelBadge, PixelButton, PixelInput, PixelTabs, PixelProgress, PixelTable } from "@/shared/components/PixelComponents";

type Page = "landing" | "auth" | "dashboard" | "events" | "teams" | "submissions" | "leaderboard" | "judge" | "admin" | "profile";

const users = [
  { id: "U001", username: "alice_dev", email: "alice@seal.io", role: "judge", status: "active", joined: "Jan 12, 2026", submissions: 0 },
  { id: "U002", username: "bob_42", email: "bob@example.com", role: "hacker", status: "active", joined: "Feb 5, 2026", submissions: 3 },
  { id: "U003", username: "carol_ml", email: "carol@ml.io", role: "hacker", status: "active", joined: "Mar 1, 2026", submissions: 1 },
  { id: "U004", username: "dave_sys", email: "dave@sys.dev", role: "hacker", status: "suspended", joined: "Mar 20, 2026", submissions: 0 },
  { id: "U005", username: "eve_web", email: "eve@web.dev", role: "hacker", status: "active", joined: "Apr 4, 2026", submissions: 2 },
  { id: "U006", username: "frank_rs", email: "frank@rust.io", role: "hacker", status: "active", joined: "Apr 14, 2026", submissions: 2 },
];

const systemLogs = [
  { time: "10:42:01", level: "INFO", message: "Leaderboard scores recalculated", service: "score-engine" },
  { time: "10:40:33", level: "WARN", message: "Rate limit hit for user U004", service: "api-gateway" },
  { time: "10:38:15", level: "INFO", message: "Database backup completed (2.4GB)", service: "db-backup" },
  { time: "10:35:02", level: "INFO", message: "Team NullPntr submission verified", service: "submission-svc" },
  { time: "10:31:44", level: "ERROR", message: "Failed to send email to dave@sys.dev", service: "mailer" },
  { time: "10:28:12", level: "INFO", message: "New user registered: frank_rs", service: "auth-svc" },
];

const logColors = { INFO: C.green, WARN: "#facc15", ERROR: "#ef4444" };

const settings = [
  { group: "Hackathon", items: [
    { key: "Max Team Size", value: "4", type: "number" },
    { key: "Submission Deadline Buffer (min)", value: "15", type: "number" },
    { key: "Auto-close registrations at capacity", value: "true", type: "toggle" },
  ]},
  { group: "Email", items: [
    { key: "SMTP Server", value: "smtp.seal.io", type: "text" },
    { key: "Sender Address", value: "noreply@seal-hms.io", type: "text" },
    { key: "Enable email notifications", value: "true", type: "toggle" },
  ]},
  { group: "Security", items: [
    { key: "Session timeout (min)", value: "60", type: "number" },
    { key: "Enable 2FA enforcement", value: "false", type: "toggle" },
    { key: "IP allowlist enabled", value: "false", type: "toggle" },
  ]},
];

export function AdminPage({ navigate }: { navigate: (page: Page) => void }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [userSearch, setUserSearch] = useState("");

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "users", label: "Users" },
    { id: "logs", label: "System Logs" },
    { id: "settings", label: "Settings" },
  ];

  const filteredUsers = users.filter(
    (u) => !userSearch || u.username.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div style={{ padding: 24 }}>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 4 }}>
            // admin_panel
          </div>
          <h1 style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700 }}>Administration</h1>
        </div>
        <PixelBadge color="red">ADMIN ACCESS</PixelBadge>
      </div>

      <PixelTabs tabs={tabs} active={activeTab} onChange={setActiveTab} className="mb-6" />

      {/* Overview tab */}
      {activeTab === "overview" && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Users", value: "2,412", color: C.text },
              { label: "Active Now", value: "148", color: C.green },
              { label: "Suspended", value: "7", color: "#ef4444" },
              { label: "Pending Review", value: "23", color: "#facc15" },
            ].map((s) => (
              <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "14px 16px", fontFamily: "'JetBrains Mono', monospace" }}>
                <div style={{ color: s.color, fontSize: 24, fontWeight: 700 }}>{s.value}</div>
                <div style={{ color: C.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Platform health */}
            <PixelCard className="p-5" glow>
              <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 16 }}>
                // platform_health
              </div>
              <div className="flex flex-col gap-4">
                {[
                  { name: "API Uptime", value: 99.97, max: 100, color: C.green },
                  { name: "DB Response (ms)", value: 12, max: 100, color: C.green },
                  { name: "Cache Hit Rate", value: 94, max: 100, color: C.green },
                  { name: "Storage Used (GB)", value: 68, max: 200, color: "#facc15" },
                ].map((m) => (
                  <PixelProgress key={m.name} value={m.value} max={m.max} label={m.name} color={m.color} />
                ))}
              </div>
            </PixelCard>

            {/* Quick actions */}
            <PixelCard className="p-5">
              <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 16 }}>
                // admin_actions
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { label: "Recalculate All Scores", color: "primary" as const },
                  { label: "Export Submissions CSV", color: "secondary" as const },
                  { label: "Announce Winners", color: "primary" as const },
                  { label: "Backup Database", color: "secondary" as const },
                  { label: "Clear Cache", color: "ghost" as const },
                  { label: "Send Bulk Email", color: "ghost" as const },
                ].map((action) => (
                  <PixelButton key={action.label} variant={action.color} size="sm" className="justify-start">
                    {action.label}
                  </PixelButton>
                ))}
              </div>
            </PixelCard>
          </div>
        </div>
      )}

      {/* Users tab */}
      {activeTab === "users" && (
        <div>
          <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
            <PixelInput placeholder="search users..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
            <PixelButton size="sm">+ ADD USER</PixelButton>
          </div>

          <PixelCard>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono', monospace" }}>
                <thead>
                  <tr style={{ background: C.surface2, borderBottom: `1px solid ${C.border}` }}>
                    {["ID", "Username", "Email", "Role", "Status", "Joined", "Actions"].map((h) => (
                      <th key={h} style={{ color: C.green, fontSize: 10, letterSpacing: "0.1em", textAlign: "left", padding: "10px 14px", fontWeight: 600, textTransform: "uppercase" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, i) => (
                    <tr key={user.id} style={{ borderBottom: `1px solid rgba(34,197,94,0.07)`, background: i % 2 === 0 ? C.surface : "transparent" }}>
                      <td style={{ color: C.textMuted, fontSize: 11, padding: "10px 14px" }}>{user.id}</td>
                      <td style={{ color: C.text, fontSize: 12, padding: "10px 14px" }}>@{user.username}</td>
                      <td style={{ color: C.textMuted, fontSize: 11, padding: "10px 14px" }}>{user.email}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <PixelBadge color={user.role === "judge" ? "blue" : user.role === "admin" ? "red" : "gray"}>
                          {user.role}
                        </PixelBadge>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <PixelBadge color={user.status === "active" ? "green" : "red"}>{user.status}</PixelBadge>
                      </td>
                      <td style={{ color: C.textMuted, fontSize: 11, padding: "10px 14px" }}>{user.joined}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <div className="flex gap-1">
                          <button style={{ background: "none", border: `1px solid ${C.border}`, color: C.textMuted, cursor: "pointer", padding: "3px 8px", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, borderRadius: 0 }}>
                            EDIT
                          </button>
                          {user.status === "active" ? (
                            <button style={{ background: "none", border: `1px solid rgba(239,68,68,0.3)`, color: "#ef4444", cursor: "pointer", padding: "3px 8px", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, borderRadius: 0 }}>
                              SUSPEND
                            </button>
                          ) : (
                            <button style={{ background: "none", border: `1px solid ${C.border}`, color: C.green, cursor: "pointer", padding: "3px 8px", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, borderRadius: 0 }}>
                              RESTORE
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PixelCard>
        </div>
      )}

      {/* Logs tab */}
      {activeTab === "logs" && (
        <div>
          <PixelCard>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12, background: C.surface2 }}>
              <div style={{ width: 8, height: 8, background: C.green, borderRadius: 0, animation: "glowPulse 1.5s infinite" }} />
              <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                sys.log — LIVE STREAM
              </span>
            </div>
            <div style={{ padding: "8px 0", maxHeight: 480, overflowY: "auto", background: "#050905" }}>
              {systemLogs.map((log, i) => (
                <div
                  key={i}
                  style={{
                    padding: "6px 16px",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                    display: "grid",
                    gridTemplateColumns: "70px 50px 120px 1fr",
                    gap: 12,
                    borderBottom: `1px solid rgba(34,197,94,0.04)`,
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: C.textMuted }}>{log.time}</span>
                  <span style={{ color: logColors[log.level as keyof typeof logColors] }}>[{log.level}]</span>
                  <span style={{ color: "#60a5fa" }}>{log.service}</span>
                  <span style={{ color: C.text }}>{log.message}</span>
                </div>
              ))}
            </div>
          </PixelCard>
        </div>
      )}

      {/* Settings tab */}
      {activeTab === "settings" && (
        <div className="flex flex-col gap-6">
          {settings.map((group) => (
            <PixelCard key={group.group} className="p-5">
              <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 16 }}>
                // {group.group.toLowerCase()}_config
              </div>
              <div className="flex flex-col gap-4">
                {group.items.map((item) => (
                  <div key={item.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                    <div>
                      <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>{item.key}</div>
                    </div>
                    {item.type === "toggle" ? (
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          defaultChecked={item.value === "true"}
                          style={{ accentColor: C.green, width: 16, height: 16 }}
                        />
                        <span style={{ color: item.value === "true" ? C.green : C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                          {item.value === "true" ? "enabled" : "disabled"}
                        </span>
                      </label>
                    ) : (
                      <input
                        defaultValue={item.value}
                        style={{
                          background: C.surface2,
                          border: `1px solid ${C.border}`,
                          color: C.text,
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 12,
                          padding: "6px 10px",
                          width: 200,
                          outline: "none",
                          borderRadius: 0,
                        }}
                        onFocus={(e) => (e.target.style.borderColor = C.green)}
                        onBlur={(e) => (e.target.style.borderColor = C.border)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </PixelCard>
          ))}
          <PixelButton>SAVE ALL SETTINGS</PixelButton>
        </div>
      )}
    </div>
  );
}
