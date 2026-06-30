import { useState, useEffect, useCallback, Fragment } from "react";
import {
  C, GradientText, PixelCard, PixelButton, PixelBadge,
} from "@/shared/components/PixelComponents";
import {
  eventsApi, roundsApi, submissionsApi, scoringApi, resultsApi, coordinatorApi, ApiError, apiErrorMessage,
  HackathonEvent, Round, Submission, RoundResult,
} from "@/shared/apiClient";
import { useNotifications } from "@/app/providers/NotificationProvider";

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
  const { addToast } = useNotifications();
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

  const sortedResults = results.slice().sort((a, b) => a.rankPosition - b.rankPosition);
  const topN = selectedRound?.topNAdvance ?? null;
  const isFinalRound = selectedRound?.isFinal ?? false;

  // Final round → one global ranking table. Per-track round → one table per track,
  // matching the backend which now ranks (and advances Top N) within each track.
  const rankGroups: { key: string; trackName: string | null; rows: RoundResult[] }[] = isFinalRound
    ? [{ key: "all", trackName: null, rows: sortedResults }]
    : (() => {
        const m = new Map<string, RoundResult[]>();
        for (const r of sortedResults) {
          const k = r.trackName ?? "—";
          if (!m.has(k)) m.set(k, []);
          m.get(k)!.push(r);
        }
        return [...m.entries()].map(([k, rows]) => ({ key: k, trackName: k === "—" ? null : k, rows }));
      })();

  async function finalize() {
    if (selectedEventId == null || selectedRoundId == null) return;
    setBusy(true); setActionError(null); setNotice(null);
    try {
      await resultsApi.finalize(selectedEventId, selectedRoundId);
      await loadResults(selectedEventId, selectedRoundId);
      setNotice("Rankings calculated.");
      addToast({ type: 'success', title: 'RANKINGS CALCULATED', message: 'Round rankings have been calculated.' });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to finalize results.");
      addToast({ type: 'warning', title: 'CALCULATE FAILED', message: apiErrorMessage(err, 'Failed to finalize results.') });
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
      addToast({ type: 'success', title: 'RESULTS PUBLISHED', message: 'Round results are now visible to participants.' });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to publish results.");
      addToast({ type: 'warning', title: 'PUBLISH FAILED', message: apiErrorMessage(err, 'Failed to publish results.') });
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
          {rankGroups.map((g) => {
            const gAdvancing = g.rows.filter(r => r.advanced).length;
            const gTooLarge = topN != null && g.rows.length > 0 && topN >= g.rows.length;
            const gMissing = topN == null && g.rows.length > 0;
            return (
            <div key={g.key}>
              {/* Track sub-header (per-track rounds only) */}
              {!isFinalRound && g.trackName && (
                <div style={{ padding: "10px 18px", borderBottom: `1px solid ${C.border}`, background: "rgba(34,197,94,0.05)", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: C.green, letterSpacing: "0.04em" }}>
                  ▸ {g.trackName}
                </div>
              )}
              {/* Advancement summary — per track for normal rounds, overall (winners) for the final */}
              <div style={{ padding: "10px 18px", borderBottom: `1px solid ${C.border}`, background: "rgba(13,17,23,0.4)", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                <span style={{ color: C.text }}>
                  {isFinalRound ? "Winners: " : "Cut-off: "}<span style={{ color: C.green, fontWeight: 700 }}>Top {topN ?? "—"}</span>
                  {" · "}<span style={{ color: C.green, fontWeight: 700 }}>{gAdvancing}</span> of {g.rows.length} {isFinalRound ? "win (overall)" : `advance${g.trackName ? " in this track" : ""}`}
                </span>
                {gMissing && (
                  <div style={{ color: C.yellow, marginTop: 6 }}>⚠ No cut-off set for this round — no team is marked. Set Top N in the Events → Rounds tab.</div>
                )}
                {gTooLarge && (
                  <div style={{ color: C.yellow, marginTop: 6 }}>⚠ Top N ({topN}) ≥ {isFinalRound ? `ranked teams (${g.rows.length})` : `teams in this track (${g.rows.length})`} — every team {isFinalRound ? "wins" : "advances"}.</div>
                )}
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
                    {g.rows.map((r, i) => {
                      const next = g.rows[i + 1];
                      const showCutLine = r.advanced && next != null && !next.advanced;
                      // Non-final rounds eliminate teams outside their track's Top N.
                      // Eliminated rows are dimmed (faded back), not painted bright red.
                      const eliminated = !isFinalRound && topN != null && !r.advanced;
                      return (
                      <Fragment key={r.resultId}>
                      <tr style={{ borderBottom: `1px solid rgba(34,197,94,0.06)`, background: eliminated ? "rgba(239,68,68,0.04)" : r.advanced ? "rgba(34,197,94,0.07)" : i % 2 === 0 ? C.surface : C.surface2, opacity: eliminated ? 0.5 : 1 }}>
                        <td style={{ color: eliminated ? C.textMuted : C.cyan, fontSize: 14, fontWeight: 700, padding: "12px 14px" }}>#{r.rankPosition}</td>
                        <td style={{ color: C.text, fontSize: 13, padding: "12px 14px" }}>{r.teamName}</td>
                        <td style={{ color: C.textMuted, fontSize: 11, padding: "12px 14px" }}>{r.trackName ?? "—"}</td>
                        <td style={{ color: C.green, fontSize: 14, fontWeight: 700, padding: "12px 14px" }}>{Number(r.totalScore).toFixed(1)}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <PixelBadge color={r.advanced ? "green" : "gray"}>{r.advanced ? (isFinalRound ? "WINNER" : "ADVANCED") : eliminated ? "ELIMINATED" : "—"}</PixelBadge>
                        </td>
                      </tr>
                      {showCutLine && (
                        <tr>
                          <td colSpan={5} style={{ padding: 0 }}>
                            <div style={{ borderTop: `2px dashed ${C.green}`, padding: "3px 14px", color: C.green, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", background: "rgba(34,197,94,0.05)" }}>
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
