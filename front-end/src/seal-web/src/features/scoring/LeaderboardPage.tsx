import { useState, useEffect } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  C, GradientText, PixelCard, PixelBadge,
} from "@/shared/components/PixelComponents";
import {
  teamsApi, eventsApi, roundsApi, resultsApi, ApiError, Round, RoundResult, HackathonEvent,
} from "@/shared/apiClient";

const selectStyle: React.CSSProperties = {
  marginTop: 6, padding: "10px 12px", background: C.surface2, border: `1px solid ${C.border}`,
  color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, borderRadius: 0, outline: "none", width: "100%",
};

// Podium metals for the final round's top 3 — gold / silver / bronze.
const MEDAL: Record<number, { name: string; metal: string; soft: string; glow: string; icon: string }> = {
  1: { name: "Champion",  metal: "#FFD24A", soft: "rgba(255,210,74,0.16)",  glow: "rgba(255,210,74,0.45)",  icon: "👑" },
  2: { name: "Runner-up", metal: "#CBD5E1", soft: "rgba(203,213,225,0.13)", glow: "rgba(203,213,225,0.35)", icon: "🥈" },
  3: { name: "3rd Place", metal: "#E0915A", soft: "rgba(224,145,90,0.13)",  glow: "rgba(224,145,90,0.35)",  icon: "🥉" },
};

export function LeaderboardPage() {
  const { currentUser } = useAuth();

  const [events, setEvents] = useState<HackathonEvent[]>([]);
  const [eventId, setEventId] = useState<number | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [trackFilter, setTrackFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load the event list and pick a sensible default: the participant's team
  // event, else the active one, else the most recent completed season (so the
  // previous season's champions are visible even before the running event has
  // any published results).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const evs = await eventsApi.getAll().then(r => r.data ?? []).catch(() => []);
      let teamEventId: number | null = null;
      try {
        const my = await teamsApi.getMy().then(r => r.data).catch(() => null);
        if (my?.eventId != null) teamEventId = my.eventId;
      } catch { /* not in a team */ }
      if (cancelled) return;
      // Newest first (by year then season order) for the dropdown.
      const ordered = [...evs].sort((a, b) => b.year - a.year || b.eventId - a.eventId);
      setEvents(ordered);
      const defaultEv =
        (teamEventId != null && ordered.find(e => e.eventId === teamEventId)) ||
        ordered.find(e => e.status === 'IN_PROGRESS' || e.status === 'OPEN') ||
        ordered.find(e => e.status === 'COMPLETED') ||
        ordered[0];
      setEventId(defaultEv?.eventId ?? null);
      if (defaultEv == null) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // Load rounds whenever the selected event changes.
  useEffect(() => {
    if (eventId == null) { setRounds([]); setSelectedRoundId(null); return; }
    let cancelled = false;
    setLoading(true);
    roundsApi.getAll(eventId).then(r => r.data ?? []).catch(() => [])
      .then(rs => {
        if (cancelled) return;
        const sorted = [...rs].sort((a, b) => (a.orderNumber ?? a.roundId) - (b.orderNumber ?? b.roundId));
        setRounds(sorted);
        // Prefer the final round so champions show first; else the first round.
        setSelectedRoundId((sorted.find(r => r.isFinal) ?? sorted[0])?.roundId ?? null);
        setTrackFilter("");
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [eventId]);

  // Load published results for the selected round.
  useEffect(() => {
    if (eventId == null || selectedRoundId == null) { setResults([]); return; }
    setError(null);
    resultsApi.getPublished(eventId, selectedRoundId)
      .then(res => setResults(res.data ?? []))
      .catch(err => { setResults([]); if (err instanceof ApiError && err.status !== 404) setError(err.message); });
  }, [eventId, selectedRoundId]);

  const selectedRound = rounds.find(r => r.roundId === selectedRoundId);
  const isFinalRound = selectedRound?.isFinal ?? false;
  const topN = selectedRound?.topNAdvance ?? null;

  const trackNames = [...new Set(results.map(r => r.trackName).filter(Boolean) as string[])];
  // The final round is global (not per-track), so the track filter doesn't apply there.
  const activeTrackFilter = isFinalRound ? "" : trackFilter;
  const rows = (activeTrackFilter ? results.filter(r => r.trackName === activeTrackFilter) : results)
    .slice().sort((a, b) => a.rankPosition - b.rankPosition);

  // Per-track rounds advance Top N within each track (backend ranks per track), so
  // group the rows by track. The final round stays a single global table.
  const rankGroups: { key: string; trackName: string | null; rows: RoundResult[] }[] = isFinalRound
    ? [{ key: "all", trackName: null, rows }]
    : (() => {
        const m = new Map<string, RoundResult[]>();
        for (const r of rows) {
          const k = r.trackName ?? "—";
          if (!m.has(k)) m.set(k, []);
          m.get(k)!.push(r);
        }
        return [...m.entries()].map(([k, gr]) => ({ key: k, trackName: k === "—" ? null : k, rows: gr }));
      })();

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800 }}>
          <GradientText>Leaderboard</GradientText>
        </h1>
      </div>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "10px 14px" }}>ERROR: {error}</div>
      )}

      <PixelCard style={{ padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <div>
            <label style={{ color: C.greenMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>Event</label>
            <select value={eventId ?? 0} onChange={(e) => setEventId(Number(e.target.value) || null)} style={selectStyle}>
              {events.length === 0 && <option value={0}>No events</option>}
              {events.map(ev => (
                <option key={ev.eventId} value={ev.eventId}>
                  {ev.name}{ev.status === 'COMPLETED' ? " (Completed)" : ev.status === 'IN_PROGRESS' ? " (Live)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ color: C.greenMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>Round</label>
            <select value={selectedRoundId ?? 0} onChange={(e) => setSelectedRoundId(Number(e.target.value) || null)} style={selectStyle}>
              {rounds.length === 0 && <option value={0}>No rounds</option>}
              {rounds.map(r => <option key={r.roundId} value={r.roundId}>{r.name}{r.isFinal ? " (Final)" : ""}</option>)}
            </select>
          </div>
          {!isFinalRound && (
            <div>
              <label style={{ color: C.greenMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>Track</label>
              <select value={trackFilter} onChange={(e) => setTrackFilter(e.target.value)} style={selectStyle}>
                <option value="">All Tracks</option>
                {trackNames.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}
        </div>
      </PixelCard>

      {loading ? (
        <PixelCard style={{ padding: 40, textAlign: "center" }}>
          <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>Loading...</div>
        </PixelCard>
      ) : rows.length === 0 ? (
        <PixelCard style={{ padding: 40, textAlign: "center" }}>
          <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>Rankings not yet published for this round.</div>
        </PixelCard>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Final round — podium for the top 3 */}
          {isFinalRound && rows.some(r => r.rankPosition <= 3) && (
            <PixelCard glow gradient style={{ padding: "10px 12px 18px" }}>
              <div style={{ textAlign: "center", padding: "12px 0 2px", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: MEDAL[1].metal }}>
                🏆 Grand Final · Champions
              </div>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 14, flexWrap: "wrap", paddingTop: 16 }}>
                {[2, 1, 3].map(place => {
                  const row = rows.find(r => r.rankPosition === place);
                  if (!row) return null;
                  const m = MEDAL[place];
                  const first = place === 1;
                  const mine = currentUser?.team_id === row.teamId;
                  return (
                    <div key={place} style={{
                      width: 158,
                      background: `linear-gradient(180deg, ${m.soft}, transparent)`,
                      border: `1px solid ${m.metal}40`,
                      borderTop: `3px solid ${m.metal}`,
                      boxShadow: first ? `0 0 30px ${m.glow}` : "none",
                      padding: first ? "18px 14px 24px" : "14px 14px 16px",
                      marginBottom: first ? 18 : 0,
                      textAlign: "center",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      <div style={{ fontSize: first ? 32 : 24, lineHeight: 1 }}>{m.icon}</div>
                      <div style={{
                        width: first ? 46 : 38, height: first ? 46 : 38, borderRadius: "50%",
                        margin: "10px auto 0", display: "flex", alignItems: "center", justifyContent: "center",
                        background: m.metal, color: "#0d1117", fontWeight: 800, fontSize: first ? 19 : 15,
                        boxShadow: `0 0 16px ${m.glow}`,
                      }}>{place}</div>
                      <div title={row.teamName} style={{ color: C.text, fontWeight: 800, fontSize: first ? 15 : 13, marginTop: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {row.teamName}{mine && <span style={{ color: C.green }}> ★</span>}
                      </div>
                      <div style={{ color: m.metal, fontWeight: 800, fontSize: first ? 24 : 19, marginTop: 4 }}>{Number(row.totalScore).toFixed(1)}</div>
                      <div style={{ color: C.textMuted, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", marginTop: 6 }}>{m.name}</div>
                    </div>
                  );
                })}
              </div>
            </PixelCard>
          )}

          {/* Standings table — per-track groups for prelim, one global table for final */}
          <PixelCard glow gradient style={{ padding: 0, overflow: "hidden" }}>
            {rankGroups.map((g) => (
              <div key={g.key}>
                {!isFinalRound && g.trackName && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 18px 12px", borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ width: 6, height: 22, background: C.green, boxShadow: `0 0 12px ${C.greenGlow}` }} />
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 17, fontWeight: 800, color: C.text, letterSpacing: "0.06em", textTransform: "uppercase" }}>{g.trackName}</span>
                    <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: C.textMuted, border: `1px solid ${C.border}`, padding: "3px 10px", letterSpacing: "0.06em" }}>{g.rows.length} {g.rows.length === 1 ? "TEAM" : "TEAMS"}</span>
                  </div>
                )}
                {isFinalRound && (
                  <div style={{ padding: "12px 18px", borderBottom: `1px solid ${C.border}`, background: "rgba(13,17,23,0.4)", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: C.textMuted }}>
                    Full Standings
                  </div>
                )}
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono', monospace" }}>
                    <thead>
                      <tr style={{ background: C.surface2, borderBottom: `1px solid ${C.border}` }}>
                        {["Rank", "Team", ...(isFinalRound ? [] : ["Track"]), "Total Score", "Status"].map(h => (
                          <th key={h} style={{ color: C.green, fontSize: 10, letterSpacing: "0.12em", textAlign: "left", padding: "14px 16px", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {g.rows.map((r, i) => {
                        const isMyTeam = currentUser?.team_id === r.teamId;
                        // Preliminary/semi rounds eliminate teams outside their track's Top N → dimmed.
                        const eliminated = !isFinalRound && topN != null && !r.advanced;
                        // Final crowns winners (no elimination). Winner tier = coordinator's Top N if
                        // set, else the podium (top 3). Top-3 also get a gold/silver/bronze medal.
                        const isWinner = isFinalRound && (topN != null ? r.advanced : r.rankPosition <= 3);
                        const medal = isFinalRound && r.rankPosition <= 3 ? MEDAL[r.rankPosition] : null;
                        const highlighted = isFinalRound ? isWinner : r.advanced;
                        const rowBg = isMyTeam ? "rgba(34,197,94,0.12)"
                          : eliminated ? "rgba(239,68,68,0.04)"
                          : medal ? `linear-gradient(90deg, ${medal.soft}, transparent)`
                          : highlighted ? "rgba(34,197,94,0.06)"
                          : i % 2 === 0 ? C.surface : C.surface2;
                        const accentBar = medal ? `inset 4px 0 0 ${medal.metal}`
                          : (isFinalRound && isWinner) ? `inset 4px 0 0 ${C.green}`
                          : isMyTeam ? `inset 3px 0 0 ${C.green}` : "none";
                        return (
                          <tr key={r.resultId} style={{
                            borderBottom: `1px solid rgba(34,197,94,0.06)`,
                            background: rowBg,
                            boxShadow: accentBar,
                            opacity: eliminated && !isMyTeam ? 0.5 : 1,
                          }}>
                            <td style={{ padding: "14px 16px" }}>
                              {medal ? (
                                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: "50%", background: medal.metal, color: "#0d1117", fontWeight: 800, fontSize: 13, boxShadow: `0 0 10px ${medal.glow}` }}>{r.rankPosition}</span>
                              ) : (
                                <span style={{ color: eliminated ? C.textMuted : C.cyan, fontSize: 16, fontWeight: 700 }}>#{r.rankPosition}</span>
                              )}
                            </td>
                            <td style={{ color: medal ? medal.metal : C.text, fontSize: 13, padding: "14px 16px", fontWeight: medal ? 800 : 600 }}>
                              {r.teamName}
                              {isMyTeam && <span style={{ marginLeft: 8 }}><PixelBadge color="green">YOU</PixelBadge></span>}
                            </td>
                            {!isFinalRound && <td style={{ color: C.textMuted, fontSize: 12, padding: "14px 16px" }}>{r.trackName ?? "—"}</td>}
                            <td style={{ color: medal ? medal.metal : C.green, fontSize: 14, fontWeight: 700, padding: "14px 16px" }}>{Number(r.totalScore).toFixed(1)}</td>
                            <td style={{ padding: "14px 16px" }}>
                              <PixelBadge color={r.rankPosition === 1 && isFinalRound ? "yellow" : highlighted ? "green" : "gray"}>{isFinalRound ? (isWinner ? "Winner" : "Finalist") : r.advanced ? "Advanced" : eliminated ? "Eliminated" : "—"}</PixelBadge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </PixelCard>
        </div>
      )}
    </div>
  );
}
