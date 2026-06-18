import { useState, useEffect, useCallback } from "react";
import {
  C, GradientText, PixelCard, PixelButton, PixelBadge,
} from "@/shared/components/PixelComponents";
import {
  eventsApi, roundsApi, submissionsApi, scoringApi, resultsApi, coordinatorApi, ApiError,
  HackathonEvent, Round, Submission, RoundResult,
} from "@/shared/apiClient";

const selectStyle: React.CSSProperties = {
  padding: "10px 12px", background: C.surface2, border: `1px solid ${C.border}`,
  color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, borderRadius: 0,
  outline: "none", minWidth: 200,
};

function pickDefaultEvent(events: HackathonEvent[]): number | null {
  if (events.length === 0) return null;
  const active = events.find(e => e.status === 'IN_PROGRESS') ?? events.find(e => e.status === 'OPEN');
  return (active ?? events[events.length - 1]).eventId;
}

export function CoordScoringPage() {
  const [events, setEvents] = useState<HackathonEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [judgeCount, setJudgeCount] = useState(0);
  const [scoresBySub, setScoresBySub] = useState<Record<number, number>>({});
  const [results, setResults] = useState<RoundResult[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Events on mount.
  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    eventsApi.getAll()
      .then(res => {
        const evs = res.data ?? [];
        setEvents(evs);
        setSelectedEventId(pickDefaultEvent(evs));
      })
      .catch(err => setLoadError(err instanceof ApiError ? err.message : "Failed to load events."))
      .finally(() => setLoading(false));
  }, []);

  // Rounds when event changes.
  useEffect(() => {
    if (selectedEventId == null) { setRounds([]); setSelectedRoundId(null); return; }
    roundsApi.getAll(selectedEventId)
      .then(res => {
        const rs = res.data ?? [];
        setRounds(rs);
        setSelectedRoundId(rs[0]?.roundId ?? null);
      })
      .catch(() => { setRounds([]); setSelectedRoundId(null); });
  }, [selectedEventId]);

  const loadResults = useCallback((eventId: number, roundId: number) => {
    return resultsApi.getAll(eventId, roundId)
      .then(res => setResults(res.data ?? []))
      .catch(() => setResults([]));
  }, []);

  // Submissions + score completion + results when round changes.
  useEffect(() => {
    if (selectedEventId == null || selectedRoundId == null) {
      setSubmissions([]); setScoresBySub({}); setResults([]); setJudgeCount(0);
      return;
    }
    const eventId = selectedEventId, roundId = selectedRoundId;
    setActionError(null); setNotice(null);

    // Distinct judges assigned to this round.
    coordinatorApi.getJudgeRoster(eventId)
      .then(res => {
        const ids = new Set((res.data ?? []).filter(a => a.roundId === roundId).map(a => a.judgeUserId));
        setJudgeCount(ids.size);
      })
      .catch(() => setJudgeCount(0));

    loadResults(eventId, roundId);

    submissionsApi.getAllForRound(roundId)
      .then(res => {
        const subs = res.data ?? [];
        setSubmissions(subs);
        // Per submission: how many distinct judges have submitted (non-draft) scores.
        return Promise.all(subs.map(s =>
          scoringApi.getScoresForSubmission(s.submissionId)
            .then(r => {
              const judges = new Set((r.data ?? []).filter(x => !x.isDraft).map(x => x.judgeUserId));
              return [s.submissionId, judges.size] as const;
            })
            .catch(() => [s.submissionId, 0] as const)));
      })
      .then(pairs => setScoresBySub(Object.fromEntries(pairs ?? [])))
      .catch(() => { setSubmissions([]); setScoresBySub({}); });
  }, [selectedEventId, selectedRoundId, loadResults]);

  const selectedRound = rounds.find(r => r.roundId === selectedRoundId);
  const allPublished = results.length > 0 && results.every(r => r.isPublished);

  async function finalize() {
    if (selectedEventId == null || selectedRoundId == null) return;
    setBusy(true); setActionError(null); setNotice(null);
    try {
      await resultsApi.finalize(selectedEventId, selectedRoundId);
      await loadResults(selectedEventId, selectedRoundId);
      setNotice("Rankings calculated.");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to finalize results.");
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (selectedEventId == null || selectedRoundId == null) return;
    setBusy(true); setActionError(null); setNotice(null);
    try {
      await resultsApi.publish(selectedEventId, selectedRoundId);
      await loadResults(selectedEventId, selectedRoundId);
      setNotice("Results published.");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to publish results.");
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const header = "rank_position,team_name,total_score,advanced";
    const rows = results.slice().sort((a, b) => a.rankPosition - b.rankPosition)
      .map(r => `${r.rankPosition},"${r.teamName}",${r.totalScore},${r.advanced}`);
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800 }}>
          <GradientText>Scoring & Results</GradientText>
        </h1>
        <select value={selectedEventId ?? 0} onChange={(e) => setSelectedEventId(Number(e.target.value) || null)} style={selectStyle}>
          {events.length === 0 && <option value={0}>No events</option>}
          {events.map(ev => <option key={ev.eventId} value={ev.eventId}>{ev.name}</option>)}
        </select>
      </div>

      {loadError && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "10px 14px" }}>
          ERROR: {loadError}
        </div>
      )}

      {/* Round selector */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {rounds.length === 0 && !loading && (
          <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>No rounds in this event.</span>
        )}
        {rounds.map(r => {
          const active = selectedRoundId === r.roundId;
          return (
            <button key={r.roundId} onClick={() => setSelectedRoundId(r.roundId)}
              style={{
                padding: "10px 16px",
                background: active ? "rgba(34,197,94,0.12)" : C.surface2,
                border: active ? `1px solid ${C.green}` : `1px solid ${C.border}`,
                color: active ? C.green : C.text,
                fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: "0.06em",
                textTransform: "uppercase", cursor: "pointer", borderRadius: 0,
                display: "flex", alignItems: "center", gap: 8,
              }}>
              {r.name}{r.isFinal ? " · Final" : ""}
              {r.status && <PixelBadge color={r.status === 'ACTIVE' ? 'green' : r.status === 'UPCOMING' ? 'yellow' : 'gray'}>{r.status}</PixelBadge>}
            </button>
          );
        })}
      </div>

      {actionError && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "10px 14px" }}>
          ERROR: {actionError}
        </div>
      )}
      {notice && (
        <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.35)", color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, padding: "10px 14px" }}>
          {notice}
        </div>
      )}

      {/* Submission status table */}
      <PixelCard style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono', monospace" }}>
            <thead>
              <tr style={{ background: C.surface2, borderBottom: `1px solid ${C.border}` }}>
                {["Team", "Submitted", "Judges Scored", "Status"].map(h => (
                  <th key={h} style={{ color: C.green, fontSize: 10, letterSpacing: "0.12em", textAlign: "left", padding: "12px 14px", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={4} style={{ padding: 20, color: C.textMuted, fontSize: 12, textAlign: "center" }}>Loading...</td></tr>
              )}
              {!loading && submissions.length === 0 && (
                <tr><td colSpan={4} style={{ padding: 20, color: C.textMuted, fontSize: 12, textAlign: "center" }}>No submissions</td></tr>
              )}
              {!loading && submissions.map((s, i) => {
                const scored = scoresBySub[s.submissionId] ?? 0;
                const complete = judgeCount > 0 && scored >= judgeCount;
                return (
                  <tr key={s.submissionId} style={{ borderBottom: `1px solid rgba(34,197,94,0.06)`, background: i % 2 === 0 ? C.surface : C.surface2 }}>
                    <td style={{ color: C.text, fontSize: 13, padding: "12px 14px" }}>{s.teamName}</td>
                    <td style={{ color: C.textMuted, fontSize: 11, padding: "12px 14px" }}>{s.submittedAt ? new Date(s.submittedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                    <td style={{ color: C.textMuted, fontSize: 12, padding: "12px 14px" }}>{scored}/{judgeCount}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <PixelBadge color={complete ? "green" : "yellow"}>{complete ? "COMPLETE" : "PENDING"}</PixelBadge>
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
        <PixelButton variant="cyber" disabled={busy || selectedRoundId == null} onClick={finalize}>
          {busy ? "WORKING…" : "CALCULATE RANKINGS"}
        </PixelButton>
        <PixelButton variant="secondary" disabled={busy || results.length === 0 || allPublished} onClick={publish}>
          {allPublished ? "PUBLISHED" : "PUBLISH RESULTS"}
        </PixelButton>
        <PixelButton variant="ghost" disabled={results.length === 0} onClick={exportCsv}>EXPORT CSV</PixelButton>
      </div>

      {/* Results table */}
      {results.length > 0 && (
        <PixelCard glow gradient style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700 }}>
              {selectedRound?.name} — Rankings
            </span>
            <PixelBadge color={allPublished ? "green" : "yellow"}>{allPublished ? "PUBLISHED" : "DRAFT"}</PixelBadge>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono', monospace" }}>
              <thead>
                <tr style={{ background: "rgba(13,17,23,0.7)", borderBottom: `1px solid ${C.border}` }}>
                  {["Position", "Team", "Track", "Total Score", "Advanced"].map(h => (
                    <th key={h} style={{ color: C.green, fontSize: 10, letterSpacing: "0.12em", textAlign: "left", padding: "12px 14px", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.slice().sort((a, b) => a.rankPosition - b.rankPosition).map((r, i) => (
                  <tr key={r.resultId} style={{ borderBottom: `1px solid rgba(34,197,94,0.06)`, background: i % 2 === 0 ? C.surface : C.surface2 }}>
                    <td style={{ color: C.cyan, fontSize: 14, fontWeight: 700, padding: "12px 14px" }}>#{r.rankPosition}</td>
                    <td style={{ color: C.text, fontSize: 13, padding: "12px 14px" }}>{r.teamName}</td>
                    <td style={{ color: C.textMuted, fontSize: 11, padding: "12px 14px" }}>{r.trackName ?? "—"}</td>
                    <td style={{ color: C.green, fontSize: 14, fontWeight: 700, padding: "12px 14px" }}>{Number(r.totalScore).toFixed(1)}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <PixelBadge color={r.advanced ? "green" : "gray"}>{r.advanced ? "ADVANCED" : "—"}</PixelBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PixelCard>
      )}
    </div>
  );
}
