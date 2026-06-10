import { useState } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  C, GradientText, PixelCard, PixelBadge,
} from "@/shared/components/PixelComponents";
import { rounds, rankings, teams, tracks } from "@/shared/mocks/mockData";

export function LeaderboardPage() {
  const { currentUser } = useAuth();
  const publishedRound = rounds.find(r => rankings.some(rk => rk.round_id === r.round_id)) ?? rounds[0];
  const [selectedRoundId, setSelectedRoundId] = useState<number>(publishedRound?.round_id ?? 1);
  const [selectedTrackId, setSelectedTrackId] = useState<number>(0);

  const roundRankings = rankings
    .filter(r => r.round_id === selectedRoundId)
    .sort((a, b) => a.position - b.position);

  const filtered = roundRankings.filter(r => {
    if (!selectedTrackId) return true;
    const team = teams.find(t => t.team_id === r.team_id);
    return team?.track_id === selectedTrackId;
  });

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em" }}>
          // leaderboard
        </div>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800 }}>
          <GradientText>Leaderboard</GradientText>
        </h1>
      </div>

      <PixelCard style={{ padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ color: C.greenMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>Round</label>
            <select value={selectedRoundId} onChange={(e) => setSelectedRoundId(Number(e.target.value))} style={selectStyle}>
              {rounds.map(r => <option key={r.round_id} value={r.round_id}>{r.round_name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ color: C.greenMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>Track</label>
            <select value={selectedTrackId} onChange={(e) => setSelectedTrackId(Number(e.target.value))} style={selectStyle}>
              <option value={0}>All Tracks</option>
              {tracks.map(t => <option key={t.track_id} value={t.track_id}>{t.track_name}</option>)}
            </select>
          </div>
        </div>
      </PixelCard>

      {filtered.length === 0 ? (
        <PixelCard style={{ padding: 40, textAlign: "center" }}>
          <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
            Rankings not yet published for this round.
          </div>
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
                {filtered.map((r, i) => {
                  const team = teams.find(t => t.team_id === r.team_id);
                  const track = team ? tracks.find(tr => tr.track_id === team.track_id) : null;
                  const isMyTeam = currentUser?.team_id === r.team_id;
                  const status = team?.status === 'ELIMINATED' ? 'Eliminated' : r.is_advanced ? 'Advanced' : 'In Progress';
                  return (
                    <tr key={r.ranking_id} style={{
                      borderBottom: `1px solid rgba(34,197,94,0.06)`,
                      background: isMyTeam ? "rgba(34,197,94,0.12)" : i % 2 === 0 ? C.surface : C.surface2,
                      boxShadow: isMyTeam ? `inset 3px 0 0 ${C.green}` : "none",
                    }}>
                      <td style={{ color: C.cyan, fontSize: 16, fontWeight: 700, padding: "14px 16px" }}>#{r.position}</td>
                      <td style={{ color: C.text, fontSize: 13, padding: "14px 16px", fontWeight: 600 }}>
                        {team?.team_name}
                        {isMyTeam && <span style={{ marginLeft: 8 }}><PixelBadge color="green">YOU</PixelBadge></span>}
                      </td>
                      <td style={{ color: C.textMuted, fontSize: 12, padding: "14px 16px" }}>{track?.track_name}</td>
                      <td style={{ color: C.green, fontSize: 14, fontWeight: 700, padding: "14px 16px" }}>{r.total_score.toFixed(1)}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <PixelBadge color={status === 'Advanced' ? 'green' : status === 'Eliminated' ? 'red' : 'yellow'}>
                          {status}
                        </PixelBadge>
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

const selectStyle: React.CSSProperties = {
  marginTop: 6,
  padding: "10px 12px",
  background: C.surface2,
  border: `1px solid ${C.border}`,
  color: C.text,
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 12,
  borderRadius: 0,
  outline: "none",
  width: "100%",
};
