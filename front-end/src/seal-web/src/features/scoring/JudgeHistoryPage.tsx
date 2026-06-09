import { useAuth } from "@/app/providers/AuthProvider";
import {
  C, GradientText, PixelCard, PixelBadge,
} from "@/shared/components/PixelComponents";
import {
  scores, submissions, teams, rounds, events, criteria,
} from "@/shared/mocks/mockData";

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US");
}

export function JudgeHistoryPage() {
  const { currentUser, currentEvent } = useAuth();
  if (!currentUser) return null;

  // Group scores by submission for this judge
  const mySubScores = new Map<number, typeof scores>();
  scores.filter(s => s.judge_user_id === currentUser.user_id).forEach(s => {
    const arr = mySubScores.get(s.submission_id) ?? [];
    arr.push(s);
    mySubScores.set(s.submission_id, arr);
  });

  const allRows = Array.from(mySubScores.entries()).map(([subId, sScores]) => {
    const sub = submissions.find(s => s.submission_id === subId);
    const team = sub ? teams.find(t => t.team_id === sub.team_id) : null;
    const round = sub ? rounds.find(r => r.round_id === sub.round_id) : null;
    const event = round ? events.find(e => e.event_id === round.event_id) : null;

    let totalWeight = 0;
    let weightedSum = 0;
    sScores.forEach(sc => {
      const crit = criteria.find(c => c.criteria_id === sc.criteria_id);
      if (crit) {
        weightedSum += sc.value * crit.weight;
        totalWeight += crit.weight;
      }
    });
    const totalScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const isDraft = sScores.some(s => s.is_draft);
    const scoredAt = sScores[0]?.scored_at;

    return { subId, team, round, event, totalScore, isDraft, scoredAt };
  });

  const rows = currentEvent
    ? allRows.filter(r => r.event?.event_id === currentEvent.event_id)
    : allRows;

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800 }}>
          <GradientText>Scoring History</GradientText>
        </h1>
      </div>

      <PixelCard style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono', monospace" }}>
            <thead>
              <tr style={{ background: C.surface2, borderBottom: `1px solid ${C.border}` }}>
                {["Team", "Round", "Event", "Total Score", "Scored At", "Status"].map(h => (
                  <th key={h} style={{ color: C.green, fontSize: 10, letterSpacing: "0.12em", textAlign: "left", padding: "12px 16px", fontWeight: 600, textTransform: "uppercase" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 20, color: C.textMuted, fontSize: 12, textAlign: "center" }}>No scoring history yet.</td></tr>
              )}
              {rows.map((r, i) => (
                <tr key={r.subId} style={{ borderBottom: `1px solid rgba(34,197,94,0.06)`, background: i % 2 === 0 ? C.surface : C.surface2 }}>
                  <td style={{ color: C.text, fontSize: 13, padding: "12px 16px" }}>{r.team?.name}</td>
                  <td style={{ color: C.textMuted, fontSize: 12, padding: "12px 16px" }}>{r.round?.name}</td>
                  <td style={{ color: C.textMuted, fontSize: 12, padding: "12px 16px" }}>{r.event?.name}</td>
                  <td style={{ color: C.cyan, fontSize: 14, fontWeight: 700, padding: "12px 16px" }}>{r.totalScore.toFixed(1)}</td>
                  <td style={{ color: C.textMuted, fontSize: 11, padding: "12px 16px" }}>{r.scoredAt ? fmtDateTime(r.scoredAt) : "—"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <PixelBadge color={r.isDraft ? "yellow" : "green"}>
                      {r.isDraft ? "Draft" : "Final"}
                    </PixelBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PixelCard>
    </div>
  );
}
