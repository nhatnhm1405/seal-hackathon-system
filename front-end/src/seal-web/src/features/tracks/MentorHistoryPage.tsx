import { useState, useEffect } from "react";
import { C, GradientText, PixelCard, PixelBadge } from "@/shared/components/PixelComponents";
import { assignmentsApi, MentorHistoryEntry, ApiError } from "@/shared/apiClient";

const MEDAL_COLOR: Record<number, string> = { 1: "#FFD24A", 2: "#CBD5E1", 3: "#E0915A" };
const mono = "'JetBrains Mono', monospace";

export function MentorHistoryPage() {
  const [entries, setEntries] = useState<MentorHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<number>>(new Set());

  useEffect(() => {
    assignmentsApi.getMentorHistory()
      .then(res => setEntries(res.data ?? []))
      .catch(err => setError(err instanceof ApiError ? err.message : "Failed to load history."))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id: number) =>
    setOpen(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 style={{ fontFamily: mono, fontSize: 28, fontWeight: 800 }}><GradientText>Mentoring History</GradientText></h1>
        <p style={{ color: C.textMuted, fontFamily: mono, fontSize: 12, marginTop: 4 }}>
          Events you mentored — your tracks, the teams you supported, and how they finished.
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
          <div style={{ color: C.textMuted, fontFamily: mono, fontSize: 13 }}>You haven't been assigned to any event yet.</div>
        </PixelCard>
      ) : (
        entries.map(h => {
          const isOpen = open.has(h.eventId);
          const teamCount = h.tracks.reduce((n, t) => n + t.teams.length, 0);
          return (
            <PixelCard key={h.eventId} glow gradient style={{ padding: 0, overflow: "hidden", borderLeft: `4px solid ${C.green}` }}>
              <div
                onClick={() => toggle(h.eventId)}
                style={{ padding: "16px 18px", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", cursor: "pointer", borderBottom: isOpen ? `1px solid ${C.border}` : "none" }}
              >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 64, padding: "6px 8px", background: C.surface2, border: `1px solid ${C.border}` }}>
                  <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 800, color: C.green, textTransform: "uppercase" }}>{(h.season ?? "—").slice(0, 3)}</span>
                  <span style={{ fontFamily: mono, fontSize: 10, color: C.textMuted }}>{h.year ?? ""}</span>
                </div>
                <div style={{ flex: "1 1 220px" }}>
                  <div style={{ fontFamily: mono, fontSize: 17, fontWeight: 800, color: C.text }}>{h.eventName}</div>
                  <div style={{ fontFamily: mono, fontSize: 11, color: C.textMuted, marginTop: 5 }}>
                    {h.tracks.length} track{h.tracks.length === 1 ? "" : "s"} · {teamCount} team{teamCount === 1 ? "" : "s"} mentored
                  </div>
                </div>
                <PixelBadge color={h.eventStatus === "COMPLETED" ? "gray" : "green"}>{h.eventStatus}</PixelBadge>
                <span style={{ color: C.textMuted, fontFamily: mono, fontSize: 14 }}>{isOpen ? "▾" : "▸"}</span>
              </div>

              {isOpen && (
                <div style={{ padding: "18px", display: "flex", flexDirection: "column", gap: 18 }}>
                  {h.tracks.map(tr => (
                    <div key={tr.trackId}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <span style={{ width: 5, height: 18, background: C.green }} />
                        <span style={{ fontFamily: mono, fontSize: 14, fontWeight: 800, color: C.text, textTransform: "uppercase", letterSpacing: "0.04em" }}>{tr.trackName}</span>
                      </div>
                      {tr.teams.length === 0 ? (
                        <div style={{ color: C.textMuted, fontFamily: mono, fontSize: 12 }}>No approved teams.</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {tr.teams
                            .slice()
                            .sort((a, b) => (a.finalRank ?? 99) - (b.finalRank ?? 99))
                            .map(team => (
                              <div key={team.teamId} style={{ display: "flex", gap: 12, alignItems: "center", fontFamily: mono, fontSize: 12, flexWrap: "wrap" }}>
                                <span style={{ color: C.text, minWidth: 170, fontWeight: 600 }}>{team.teamName}</span>
                                <span style={{ color: C.cyan, minWidth: 70 }}>{team.finalRank != null ? `Final #${team.finalRank}` : "—"}</span>
                                {team.prizeName && (
                                  <span style={{ color: MEDAL_COLOR[1], fontWeight: 700 }}>🏆 {team.prizeName}</span>
                                )}
                                <PixelBadge color={team.teamStatus === "DISQUALIFIED" ? "red" : "gray"}>{team.teamStatus}</PixelBadge>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </PixelCard>
          );
        })
      )}
    </div>
  );
}
