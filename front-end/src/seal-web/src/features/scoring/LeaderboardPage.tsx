import { useState, useEffect, Fragment } from "react";
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

  const trackNames = [...new Set(results.map(r => r.trackName).filter(Boolean) as string[])];
  const rows = (trackFilter ? results.filter(r => r.trackName === trackFilter) : results)
    .slice().sort((a, b) => a.rankPosition - b.rankPosition);

  const selectedRound = rounds.find(r => r.roundId === selectedRoundId);
  const isFinalRound = selectedRound?.isFinal ?? false;
  const topN = selectedRound?.topNAdvance ?? null;

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
          <div>
            <label style={{ color: C.greenMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>Track</label>
            <select value={trackFilter} onChange={(e) => setTrackFilter(e.target.value)} style={selectStyle}>
              <option value="">All Tracks</option>
              {trackNames.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
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
        <PixelCard glow gradient style={{ padding: 0, overflow: "hidden" }}>
          {rankGroups.map((g) => {
            const gAdvancing = g.rows.filter(r => r.advanced).length;
            return (
            <div key={g.key}>
              {!isFinalRound && g.trackName && (
                <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, background: "rgba(34,197,94,0.05)", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: C.green, letterSpacing: "0.04em" }}>
                  ▸ {g.trackName}
                </div>
              )}
              {topN != null && (
                <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, background: "rgba(13,17,23,0.4)", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: C.text }}>
                  {isFinalRound ? "Winners: " : "Cut-off: "}<span style={{ color: C.green, fontWeight: 700 }}>Top {topN}</span>
                  {" · "}<span style={{ color: C.green, fontWeight: 700 }}>{gAdvancing}</span> of {g.rows.length} {isFinalRound ? "win (overall)" : `advance${g.trackName ? " in this track" : ""}`}
                </div>
              )}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono', monospace" }}>
                  <thead>
                    <tr style={{ background: C.surface2, borderBottom: `1px solid ${C.border}` }}>
                      {["Rank", "Team", "Track", "Total Score", "Status"].map(h => (
                        <th key={h} style={{ color: C.green, fontSize: 10, letterSpacing: "0.12em", textAlign: "left", padding: "14px 16px", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map((r, i) => {
                      const isMyTeam = currentUser?.team_id === r.teamId;
                      const next = g.rows[i + 1];
                      const showCutLine = r.advanced && next != null && !next.advanced;
                      return (
                        <Fragment key={r.resultId}>
                        <tr style={{
                          borderBottom: `1px solid rgba(34,197,94,0.06)`,
                          background: isMyTeam ? "rgba(34,197,94,0.12)" : r.advanced ? "rgba(34,197,94,0.06)" : i % 2 === 0 ? C.surface : C.surface2,
                          boxShadow: isMyTeam ? `inset 3px 0 0 ${C.green}` : "none",
                        }}>
                          <td style={{ color: C.cyan, fontSize: 16, fontWeight: 700, padding: "14px 16px" }}>#{r.rankPosition}</td>
                          <td style={{ color: C.text, fontSize: 13, padding: "14px 16px", fontWeight: 600 }}>
                            {r.teamName}
                            {isMyTeam && <span style={{ marginLeft: 8 }}><PixelBadge color="green">YOU</PixelBadge></span>}
                          </td>
                          <td style={{ color: C.textMuted, fontSize: 12, padding: "14px 16px" }}>{r.trackName ?? "—"}</td>
                          <td style={{ color: C.green, fontSize: 14, fontWeight: 700, padding: "14px 16px" }}>{Number(r.totalScore).toFixed(1)}</td>
                          <td style={{ padding: "14px 16px" }}>
                            <PixelBadge color={r.advanced ? "green" : "gray"}>{r.advanced ? (isFinalRound ? "Winner" : "Advanced") : "—"}</PixelBadge>
                          </td>
                        </tr>
                        {showCutLine && (
                          <tr>
                            <td colSpan={5} style={{ padding: 0 }}>
                              <div style={{ borderTop: `2px dashed ${C.green}`, padding: "3px 16px", color: C.green, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", background: "rgba(34,197,94,0.05)" }}>
                                ▲ Top {topN} {isFinalRound ? "win" : "advance"} · cut-off line ▼
                              </div>
                            </td>
                          </tr>
                        )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            );
          })}
        </PixelCard>
      )}
    </div>
  );
}
