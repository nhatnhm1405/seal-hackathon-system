import { useState, useEffect } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { C, GradientText, PixelCard, PixelBadge } from "@/shared/components/PixelComponents";
import { teamsApi, TeamHistoryEntry, ApiError } from "@/shared/apiClient";
import { CertificateModal } from "./CertificateModal";

const MEDAL_COLOR: Record<number, string> = { 1: "#FFD24A", 2: "#CBD5E1", 3: "#E0915A" };
const mono = "'JetBrains Mono', monospace";
const linkStyle: React.CSSProperties = { color: C.cyan, fontFamily: mono, fontSize: 12, textDecoration: "none" };

// Standing summary + the accent colour that themes the whole card.
function standing(h: TeamHistoryEntry): { text: string; color: string } {
  if (h.prize) return { text: h.prize.name, color: MEDAL_COLOR[h.prize.rankPosition] ?? C.green };
  if (h.teamStatus === "DISQUALIFIED") return { text: "Disqualified", color: C.red };
  const finalR = h.rounds.find(r => r.isFinal);
  if (finalR) return { text: `Finalist · #${finalR.rankPosition}`, color: C.green };
  const lastEliminated = [...h.rounds].reverse().find(r => !r.advanced);
  if (lastEliminated) return { text: `Eliminated · ${lastEliminated.roundName}`, color: C.textMuted };
  const last = h.rounds.at(-1);
  if (last) return { text: `${last.roundName} · #${last.rankPosition}`, color: C.cyan };
  return { text: h.teamStatus, color: C.textMuted };
}

export function HistoryPage() {
  const { currentUser } = useAuth();
  const [entries, setEntries] = useState<TeamHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [cert, setCert] = useState<TeamHistoryEntry | null>(null);

  useEffect(() => {
    teamsApi.getMyHistory()
      .then(res => setEntries(res.data ?? []))
      .catch(err => setError(err instanceof ApiError ? err.message : "Failed to load history."))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (teamId: number) =>
    setOpen(prev => { const n = new Set(prev); n.has(teamId) ? n.delete(teamId) : n.add(teamId); return n; });

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 style={{ fontFamily: mono, fontSize: 28, fontWeight: 800 }}><GradientText>History</GradientText></h1>
        <p style={{ color: C.textMuted, fontFamily: mono, fontSize: 12, marginTop: 4 }}>
          Every event you've taken part in — your team, results, prizes and submissions.
        </p>
      </div>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: mono, fontSize: 11, padding: "10px 14px" }}>ERROR: {error}</div>
      )}

      {loading ? (
        <PixelCard style={{ padding: 40, textAlign: "center" }}>
          <div style={{ color: C.textMuted, fontFamily: mono, fontSize: 13 }}>Loading...</div>
        </PixelCard>
      ) : entries.length === 0 ? (
        <PixelCard style={{ padding: 40, textAlign: "center" }}>
          <div style={{ color: C.textMuted, fontFamily: mono, fontSize: 13 }}>You haven't joined any event yet.</div>
        </PixelCard>
      ) : (
        entries.map(h => {
          const s = standing(h);
          const isOpen = open.has(h.teamId);
          const completed = h.eventStatus === "COMPLETED";
          return (
            <PixelCard key={h.teamId} glow gradient style={{ padding: 0, overflow: "hidden", borderLeft: `4px solid ${s.color}` }}>
              {/* Header (click to expand) */}
              <div
                onClick={() => toggle(h.teamId)}
                style={{ padding: "16px 18px", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", cursor: "pointer", borderBottom: isOpen ? `1px solid ${C.border}` : "none" }}
              >
                {/* season chip */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 64, padding: "6px 8px", background: C.surface2, border: `1px solid ${C.border}` }}>
                  <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 800, color: s.color, textTransform: "uppercase" }}>{(h.season ?? "—").slice(0, 3)}</span>
                  <span style={{ fontFamily: mono, fontSize: 10, color: C.textMuted }}>{h.year ?? ""}</span>
                </div>

                <div style={{ flex: "1 1 220px" }}>
                  <div style={{ fontFamily: mono, fontSize: 17, fontWeight: 800, color: C.text, display: "flex", alignItems: "center", gap: 8 }}>
                    {h.prize && <span>🏆</span>}{h.eventName}
                  </div>
                  <div style={{ fontFamily: mono, fontSize: 11, color: C.textMuted, marginTop: 5 }}>
                    Team <b style={{ color: C.text }}>{h.teamName}</b>{h.trackName ? ` · ${h.trackName}` : ""} · {h.myRole === "LEADER" ? "Team Leader" : "Member"}
                  </div>
                </div>

                {/* standing pill */}
                <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 800, color: s.color, background: `${s.color}1A`, border: `1px solid ${s.color}55`, padding: "5px 12px", letterSpacing: "0.04em" }}>
                  {s.text}
                </span>

                {completed && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setCert(h); }}
                    style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", padding: "7px 12px", cursor: "pointer", borderRadius: 0, border: `1px solid ${C.green}`, background: "transparent", color: C.green }}
                  >
                    🎓 CERTIFICATE
                  </button>
                )}

                <PixelBadge color={completed ? "gray" : "green"}>{h.eventStatus}</PixelBadge>
                <span style={{ color: C.textMuted, fontFamily: mono, fontSize: 14 }}>{isOpen ? "▾" : "▸"}</span>
              </div>

              {isOpen && (
                <div style={{ padding: "18px", display: "flex", flexDirection: "column", gap: 18 }}>
                  <div>
                    <div style={sectionLabel}>Team members</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {h.members.map((m, i) => (
                        <span key={i} style={{ fontFamily: mono, fontSize: 12, color: C.text, background: C.surface2, border: `1px solid ${C.border}`, padding: "4px 10px" }}>
                          {m.fullName}{m.role === "LEADER" ? " 👑" : ""}
                        </span>
                      ))}
                    </div>
                  </div>

                  {h.rounds.length > 0 && (
                    <div>
                      <div style={sectionLabel}>Results by round</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {h.rounds.map((r, i) => (
                          <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", fontFamily: mono, fontSize: 12 }}>
                            <span style={{ color: C.text, minWidth: 160 }}>{r.roundName}{r.isFinal ? " (Final)" : ""}</span>
                            <span style={{ color: C.cyan, fontWeight: 700, minWidth: 40 }}>#{r.rankPosition}</span>
                            <span style={{ color: C.green, minWidth: 64 }}>{Number(r.totalScore).toFixed(1)}</span>
                            <PixelBadge color={r.advanced ? "green" : "gray"}>{r.advanced ? (r.isFinal ? "Winner tier" : "Advanced") : (r.isFinal ? "Finalist" : "Eliminated")}</PixelBadge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {h.submissions.length > 0 && (
                    <div>
                      <div style={sectionLabel}>Submissions</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {h.submissions.map((sub, i) => (
                          <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", fontFamily: mono, fontSize: 12, flexWrap: "wrap" }}>
                            <span style={{ color: C.text, minWidth: 160 }}>{sub.roundName}</span>
                            {sub.repoUrl && <a href={sub.repoUrl} target="_blank" rel="noreferrer" style={linkStyle}>repo ↗</a>}
                            {sub.demoUrl && <a href={sub.demoUrl} target="_blank" rel="noreferrer" style={linkStyle}>demo ↗</a>}
                            {sub.slideUrl && <a href={sub.slideUrl} target="_blank" rel="noreferrer" style={linkStyle}>slides ↗</a>}
                            <PixelBadge color={sub.status === "LATE" ? "yellow" : "gray"}>{sub.status}</PixelBadge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </PixelCard>
          );
        })
      )}

      {cert && (
        <CertificateModal entry={cert} recipientName={currentUser?.full_name ?? ""} onClose={() => setCert(null)} />
      )}
    </div>
  );
}

const sectionLabel: React.CSSProperties = {
  fontFamily: mono, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase",
  color: C.green, fontWeight: 700, marginBottom: 8,
};
