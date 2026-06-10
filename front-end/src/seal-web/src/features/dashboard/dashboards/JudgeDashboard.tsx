import { useNavigate } from "react-router";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  C, GradientText, PixelCard, PixelButton, PixelBadge, PixelProgress,
} from "@/shared/components/PixelComponents";
import {
  judgeAssignments, rounds, submissions, scores, criteria,
} from "@/shared/mocks/mockData";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function JudgeDashboard() {
  const navigate = useNavigate();
  const { currentUser, currentEvent } = useAuth();
  if (!currentUser) return null;

  const myAssignments = judgeAssignments.filter(j => j.judge_id === currentUser.user_id);
  const myRoundIds = myAssignments.map(a => a.round_id);
  const allMyRounds = rounds.filter(r => myRoundIds.includes(r.round_id));
  const myRounds = currentEvent
    ? allMyRounds.filter(r => r.event_id === currentEvent.event_id)
    : allMyRounds;

  // For each round, count submissions vs scored
  const roundStats = myRounds.map(round => {
    const roundSubs = submissions.filter(s => s.round_id === round.round_id);
    const scoredCount = roundSubs.filter(sub => {
      // submission is "scored" if there's at least one final (is_draft=false) score by this judge
      // for ALL criteria assigned to round
      const criteriaCount = criteria.length;
      const finalScores = scores.filter(sc => sc.submission_id === sub.submission_id && sc.judge_id === currentUser.user_id && !sc.is_draft);
      return finalScores.length >= criteriaCount;
    }).length;
    return { round, total: roundSubs.length, scored: scoredCount };
  });

  const totalSubs = roundStats.reduce((acc, r) => acc + r.total, 0);
  const totalScored = roundStats.reduce((acc, r) => acc + r.scored, 0);

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <PixelCard glow gradient style={{ padding: 24 }}>
        <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 6 }}>
          // judge_console
        </div>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 800, lineHeight: 1.2 }}>
          <GradientText>Good day, {currentUser.full_name}</GradientText>
        </h1>
        <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginTop: 6 }}>
          Evaluate hackathon submissions across your assigned rounds.
        </p>
      </PixelCard>

      <PixelCard style={{ padding: 20 }}>
        <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 12 }}>
          // overall_progress
        </div>
        <PixelProgress
          value={totalScored}
          max={totalSubs}
          label={`Total scored across all rounds`}
          gradient
        />
      </PixelCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {roundStats.length === 0 && (
          <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
            No rounds assigned.
          </div>
        )}
        {roundStats.map(({ round, total, scored }) => (
          <PixelCard key={round.round_id} glow glowColor="blue" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700 }}>
                {round.round_name}
              </div>
              <PixelBadge color={round.status === 'ACTIVE' ? 'green' : round.status === 'UPCOMING' ? 'yellow' : 'red'}>
                {round.status}
              </PixelBadge>
            </div>
            <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginBottom: 12 }}>
              Deadline: {fmtDate(round.submission_deadline)}
            </div>
            <PixelProgress value={scored} max={total} label={`${scored}/${total} scored`} />
          </PixelCard>
        ))}
      </div>

      <div>
        <PixelButton variant="cyber" size="lg" onClick={() => navigate('/judge/score')}>
          START SCORING
        </PixelButton>
      </div>
    </div>
  );
}
