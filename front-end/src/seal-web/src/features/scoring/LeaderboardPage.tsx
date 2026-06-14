import { useState, useEffect } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  C, GradientText, PixelCard, PixelBadge,
} from "@/shared/components/PixelComponents";
import {
  teamsApi, eventsApi, roundsApi, resultsApi, ApiError, Round, RoundResult,
} from "@/shared/apiClient";

const selectStyle: React.CSSProperties = {
  marginTop: 6, padding: "10px 12px", background: C.surface2, border: `1px solid ${C.border}`,
  color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, borderRadius: 0, outline: "none", width: "100%",
};

export function LeaderboardPage() {
  const { currentUser } = useAuth();

  const [eventId, setEventId] = useState<number | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [trackFilter, setTrackFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resolve the relevant event (the participant's team event, else active event).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let evId: number | null = null;
      try {
        const my = await teamsApi.getMy().then(r => r.data).catch(() => null);
        if (my?.eventId != null) evId = my.eventId;
      } catch { /* not in a team */ }
      if (evId == null) {
        const events = await eventsApi.getAll().then(r => r.data ?? []).catch(() => []);
        const ev = events.find(e => e.status === 'IN_PROGRESS' || e.status === 'OPEN') ?? events[events.length - 1];
        evId = ev?.eventId ?? null;
      }
      if (cancelled) return;
      setEventId(evId);
      if (evId != null) {
        const rs = await roundsApi.getAll(evId).then(r => r.data ?? []).catch(() => []);
        if (cancelled) return;
        const sorted = [...rs].sort((a, b) => (a.orderNumber ?? a.roundId) - (b.orderNumber ?? b.roundId));
        setRounds(sorted);
        setSelectedRoundId(sorted[0]?.roundId ?? null);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

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

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em" }}>// leaderboard</div>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800 }}>
          <GradientText>Leaderboard</GradientText>
        </h1>
      </div>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "10px 14px" }}>ERROR: {error}</div>
      )}

      <PixelCard style={{ padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
                {rows.map((r, i) => {
                  const isMyTeam = currentUser?.team_id === r.teamId;
                  return (
                    <tr key={r.resultId} style={{
                      borderBottom: `1px solid rgba(34,197,94,0.06)`,
                      background: isMyTeam ? "rgba(34,197,94,0.12)" : i % 2 === 0 ? C.surface : C.surface2,
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
                        <PixelBadge color={r.advanced ? "green" : "gray"}>{r.advanced ? "Advanced" : "—"}</PixelBadge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </PixelCard>
      )}
    </div>
  );
}
