import { useState } from "react";
import {
  C, GradientText, PixelCard, PixelButton, PixelBadge,
} from "@/shared/components/PixelComponents";
import {
  rounds, submissions, teams, userEventRoles, scores, rankings as initialRankings, criteria, RoundResult,
} from "@/shared/mocks/mockData";

export function CoordScoringPage() {
  const [selectedRoundId, setSelectedRoundId] = useState<number>(rounds[0]?.round_id ?? 0);
  const [rankings, setRankings] = useState<RoundResult[]>(initialRankings);
  const [showRankings, setShowRankings] = useState(false);
  const [published, setPublished] = useState(false);

  const selectedRound = rounds.find(r => r.round_id === selectedRoundId);
  const roundSubs = submissions.filter(s => s.round_id === selectedRoundId);
  const roundJudges = userEventRoles.filter(r => r.role_name === 'JUDGE' && r.round_id === selectedRoundId);
  const roundRankings = rankings.filter(r => r.round_id === selectedRoundId);

  function calculateRankings() {
    setShowRankings(true);
  }

  function advanceTopN() {
    const n = selectedRound?.top_n_advance ?? 0;
    setRankings(prev => prev.map(r => r.round_id === selectedRoundId ? { ...r, advanced: r.rank_position <= n } : r));
  }

  function publishResults() {
    setPublished(true);
  }

  function exportCsv() {
    const header = "rank_position,team_id,total_score,advanced";
    const rows = roundRankings.map(r => `${r.rank_position},${r.team_id},${r.total_score},${r.advanced}`);
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `rankings-round-${selectedRoundId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800 }}>
          <GradientText>Scoring & Results</GradientText>
        </h1>
      </div>

      {/* Round selector */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {rounds.map(r => {
          const active = selectedRoundId === r.round_id;
          return (
            <button key={r.round_id} onClick={() => { setSelectedRoundId(r.round_id); setShowRankings(false); }}
              style={{
                padding: "10px 16px",
                background: active ? "rgba(34,197,94,0.12)" : C.surface2,
                border: active ? `1px solid ${C.green}` : `1px solid ${C.border}`,
                color: active ? C.green : C.text,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase",
                cursor: "pointer", borderRadius: 0, display: "flex", alignItems: "center", gap: 8,
              }}>
              {r.name}
              <PixelBadge color={r.status === 'ACTIVE' ? 'green' : r.status === 'PENDING' ? 'yellow' : 'red'}>{r.status}</PixelBadge>
            </button>
          );
        })}
      </div>

      {/* Submission status table */}
      <PixelCard style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono', monospace" }}>
            <thead>
              <tr style={{ background: C.surface2, borderBottom: `1px solid ${C.border}` }}>
                {["Team", "Judges Assigned", "Scores Received", "Status"].map(h => (
                  <th key={h} style={{ color: C.green, fontSize: 10, letterSpacing: "0.12em", textAlign: "left", padding: "12px 14px", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roundSubs.length === 0 && (
                <tr><td colSpan={4} style={{ padding: 20, color: C.textMuted, fontSize: 12, textAlign: "center" }}>No submissions</td></tr>
              )}
              {roundSubs.map((s, i) => {
                const team = teams.find(t => t.team_id === s.team_id);
                const subScores = scores.filter(sc => sc.submission_id === s.submission_id && !sc.is_draft);
                const expectedScores = roundJudges.length * criteria.length;
                const allScored = subScores.length >= expectedScores && expectedScores > 0;
                return (
                  <tr key={s.submission_id} style={{ borderBottom: `1px solid rgba(34,197,94,0.06)`, background: i % 2 === 0 ? C.surface : C.surface2 }}>
                    <td style={{ color: C.text, fontSize: 13, padding: "12px 14px" }}>{team?.name}</td>
                    <td style={{ color: C.textMuted, fontSize: 12, padding: "12px 14px" }}>{roundJudges.length}</td>
                    <td style={{ color: C.textMuted, fontSize: 12, padding: "12px 14px" }}>{subScores.length}/{expectedScores}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <PixelBadge color={allScored ? "green" : "yellow"}>
                        {allScored ? "COMPLETE" : "PENDING"}
                      </PixelBadge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </PixelCard>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <PixelButton variant="cyber" disabled={selectedRound?.status !== 'CLOSED'} onClick={calculateRankings}>
          CALCULATE RANKINGS
        </PixelButton>
        {showRankings && (
          <>
            <PixelButton variant="secondary" onClick={advanceTopN}>ADVANCE TOP N</PixelButton>
            <PixelButton variant="secondary" onClick={publishResults}>PUBLISH RESULTS</PixelButton>
            <PixelButton variant="ghost" onClick={exportCsv}>EXPORT CSV</PixelButton>
          </>
        )}
      </div>

      {published && (
        <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.35)", color: C.green, padding: "12px 14px", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
          Results published successfully.
        </div>
      )}

      {showRankings && roundRankings.length > 0 && (
        <PixelCard glow gradient style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono', monospace" }}>
              <thead>
                <tr style={{ background: "rgba(13,17,23,0.7)", borderBottom: `1px solid ${C.border}` }}>
                  {["Position", "Team", "Total Score", "Is Advanced"].map(h => (
                    <th key={h} style={{ color: C.green, fontSize: 10, letterSpacing: "0.12em", textAlign: "left", padding: "12px 14px", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roundRankings.sort((a, b) => a.rank_position - b.rank_position).map((r, i) => {
                  const team = teams.find(t => t.team_id === r.team_id);
                  return (
                    <tr key={r.result_id} style={{ borderBottom: `1px solid rgba(34,197,94,0.06)`, background: i % 2 === 0 ? C.surface : C.surface2 }}>
                      <td style={{ color: C.cyan, fontSize: 14, fontWeight: 700, padding: "12px 14px" }}>#{r.rank_position}</td>
                      <td style={{ color: C.text, fontSize: 13, padding: "12px 14px" }}>{team?.name}</td>
                      <td style={{ color: C.green, fontSize: 14, fontWeight: 700, padding: "12px 14px" }}>{r.total_score.toFixed(1)}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <PixelBadge color={r.advanced ? "green" : "gray"}>{r.advanced ? "ADVANCED" : "—"}</PixelBadge>
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
