import { useState, useEffect } from "react";
import {
  C, GradientText, PixelCard, PixelBadge,
} from "@/shared/components/PixelComponents";
import {
  assignmentsApi, eventsApi, roundsApi, submissionsApi, scoringApi, ApiError,
} from "@/shared/apiClient";

function fmtDateTime(iso?: string) {
  return iso ? new Date(iso).toLocaleString("en-US") : "—";
}

interface HistoryRow {
  submissionId: number;
  teamName: string;
  roundName: string;
  total: number;
  isDraft: boolean;
  scoredAt?: string;
}

export function JudgeHistoryPage() {
  const [eventName, setEventName] = useState("");
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const assignment = (await assignmentsApi.getJudgeAssignments()).data;
        const roundIds = [...new Set((assignment?.teams ?? []).map(t => t.roundId))];
        if (!cancelled) setEventName(assignment?.eventName ?? "");

        const events = await eventsApi.getAll().then(r => r.data ?? []).catch(() => []);
        const event = events.find(e => e.name === assignment?.eventName)
          ?? events.find(e => e.status === 'IN_PROGRESS' || e.status === 'OPEN')
          ?? events[events.length - 1];
        const rounds = event ? await roundsApi.getAll(event.eventId).then(r => r.data ?? []).catch(() => []) : [];
        const eventId = event?.eventId ?? null;

        const perRound = await Promise.all(roundIds.map(async roundId => {
          const [myScores, crit, subs] = await Promise.all([
            scoringApi.getMyScoresForRound(roundId).then(r => r.data ?? []).catch(() => []),
            eventId != null ? scoringApi.getCriteria(eventId, roundId).then(r => r.data ?? []).catch(() => []) : Promise.resolve([]),
            submissionsApi.getAllForRound(roundId).then(r => r.data ?? []).catch(() => []),
          ]);
          const weightByCrit = new Map(crit.map(c => [c.criteriaId, Number(c.weight)]));
          const teamBySub = new Map(subs.map(s => [s.submissionId, s.teamName]));
          const roundName = rounds.find(r => r.roundId === roundId)?.name ?? `Round #${roundId}`;

          // Group my scores by submission.
          const bySub = new Map<number, typeof myScores>();
          myScores.forEach(s => { const a = bySub.get(s.submissionId) ?? []; a.push(s); bySub.set(s.submissionId, a); });

          return [...bySub.entries()].map(([submissionId, scs]) => {
            const total = scs.reduce((acc, sc) => acc + Number(sc.value) * (weightByCrit.get(sc.criteriaId) ?? 0), 0);
            const isDraft = scs.some(s => s.isDraft);
            const scoredAt = scs.map(s => s.updatedAt ?? s.scoredAt).filter(Boolean).sort().pop();
            return { submissionId, teamName: teamBySub.get(submissionId) ?? `#${submissionId}`, roundName, total, isDraft, scoredAt } as HistoryRow;
          });
        }));

        if (cancelled) return;
        const flat = perRound.flat().sort((a, b) => (b.scoredAt ?? "").localeCompare(a.scoredAt ?? ""));
        setRows(flat);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load scoring history.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const finalCount = rows.filter(r => !r.isDraft).length;
  const draftCount = rows.filter(r => r.isDraft).length;

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800 }}>
          <GradientText>Scoring History</GradientText>
        </h1>
        <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginTop: 6 }}>
          {eventName ? <>{eventName} · </> : null}{finalCount} final · {draftCount} draft
        </p>
      </div>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "10px 14px" }}>
          ERROR: {error}
        </div>
      )}

      <PixelCard style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono', monospace" }}>
            <thead>
              <tr style={{ background: C.surface2, borderBottom: `1px solid ${C.border}` }}>
                {["Team", "Round", "Weighted Total", "Scored At", "Status"].map(h => (
                  <th key={h} style={{ color: C.green, fontSize: 10, letterSpacing: "0.12em", textAlign: "left", padding: "12px 16px", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} style={{ padding: 20, color: C.textMuted, fontSize: 12, textAlign: "center" }}>Loading...</td></tr>
              )}
              {!loading && !error && rows.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 20, color: C.textMuted, fontSize: 12, textAlign: "center" }}>No scoring history yet.</td></tr>
              )}
              {!loading && rows.map((r, i) => (
                <tr key={`${r.submissionId}-${i}`} style={{ borderBottom: `1px solid rgba(34,197,94,0.06)`, background: i % 2 === 0 ? C.surface : C.surface2 }}>
                  <td style={{ color: C.text, fontSize: 13, padding: "12px 16px" }}>{r.teamName}</td>
                  <td style={{ color: C.textMuted, fontSize: 12, padding: "12px 16px" }}>{r.roundName}</td>
                  <td style={{ color: C.cyan, fontSize: 14, fontWeight: 700, padding: "12px 16px" }}>{r.total.toFixed(2)}</td>
                  <td style={{ color: C.textMuted, fontSize: 11, padding: "12px 16px" }}>{fmtDateTime(r.scoredAt)}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <PixelBadge color={r.isDraft ? "yellow" : "green"}>{r.isDraft ? "Draft" : "Final"}</PixelBadge>
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
