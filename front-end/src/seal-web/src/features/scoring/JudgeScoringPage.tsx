import { useState, useEffect, useMemo, useCallback } from "react";
import {
  C, GradientText, PixelCard, PixelButton, PixelBadge,
} from "@/shared/components/PixelComponents";
import {
  assignmentsApi, eventsApi, roundsApi, submissionsApi, scoringApi, ApiError,
  Round, Submission, ScoringCriteria, ScoreRecord,
} from "@/shared/apiClient";

type SubStatus = "not_scored" | "draft" | "scored";
type FilterType = "all" | SubStatus;

function fmtDateTime(iso?: string) {
  return iso ? new Date(iso).toLocaleString("en-US") : "—";
}

function roundIsOpen(status?: string): boolean {
  const s = (status ?? "").toUpperCase();
  return s === "ACTIVE" || s === "OPEN";
}

export function JudgeScoringPage() {
  // Assignment / event context
  const [eventId, setEventId] = useState<number | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [teamsByRound, setTeamsByRound] = useState<Record<number, Set<number>>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingCtx, setLoadingCtx] = useState(true);

  // Selection
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const [selectedSubId, setSelectedSubId] = useState<number | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");

  // Round data
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [criteria, setCriteria] = useState<ScoringCriteria[]>([]);
  const [myScores, setMyScores] = useState<ScoreRecord[]>([]);
  const [loadingRound, setLoadingRound] = useState(false);

  // Form
  const [scoreInputs, setScoreInputs] = useState<Record<number, { value: number; comment: string }>>({});
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // ── Load assignment → event → rounds ────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoadingCtx(true);
    setLoadError(null);
    (async () => {
      try {
        const assignment = (await assignmentsApi.getJudgeAssignments()).data;
        const teams = assignment?.teams ?? [];
        const map: Record<number, Set<number>> = {};
        teams.forEach(t => { (map[t.roundId] ??= new Set()).add(t.teamId); });

        const events = await eventsApi.getAll().then(r => r.data ?? []).catch(() => []);
        const event = events.find(e => e.name === assignment?.eventName)
          ?? events.find(e => e.status === 'IN_PROGRESS' || e.status === 'OPEN')
          ?? events[events.length - 1];
        const rs = event ? await roundsApi.getAll(event.eventId).then(r => r.data ?? []).catch(() => []) : [];

        if (cancelled) return;
        setTeamsByRound(map);
        setEventId(event?.eventId ?? null);
        // Only rounds the judge is actually assigned to.
        const assignedRounds = rs.filter(r => map[r.roundId])
          .sort((a, b) => (a.orderNumber ?? a.roundId) - (b.orderNumber ?? b.roundId));
        setRounds(assignedRounds);
        setSelectedRoundId(assignedRounds[0]?.roundId ?? null);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "Failed to load assignments.");
      } finally {
        if (!cancelled) setLoadingCtx(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Load round data (submissions / criteria / my scores) ────────────
  const loadRound = useCallback((evId: number, roundId: number) => {
    setLoadingRound(true);
    const allowed = teamsByRound[roundId];
    return Promise.all([
      submissionsApi.getAllForRound(roundId).then(r => r.data ?? []).catch(() => []),
      scoringApi.getCriteria(evId, roundId).then(r => r.data ?? []).catch(() => []),
      scoringApi.getMyScoresForRound(roundId).then(r => r.data ?? []).catch(() => []),
    ]).then(([subs, crit, scores]) => {
      // Restrict to the teams this judge is assigned to score.
      setSubmissions(allowed ? subs.filter(s => allowed.has(s.teamId)) : subs);
      setCriteria([...crit].sort((a, b) => (a.orderNumber ?? 0) - (b.orderNumber ?? 0)));
      setMyScores(scores);
    }).finally(() => setLoadingRound(false));
  }, [teamsByRound]);

  useEffect(() => {
    if (eventId == null || selectedRoundId == null) return;
    setSelectedSubId(null);
    setScoreInputs({});
    setActionError(null);
    setNotice(null);
    loadRound(eventId, selectedRoundId);
  }, [eventId, selectedRoundId, loadRound]);

  // ── Derived ─────────────────────────────────────────────────────────
  const statusOf = useCallback((subId: number): SubStatus => {
    const s = myScores.filter(x => x.submissionId === subId);
    if (s.length === 0) return "not_scored";
    if (s.some(x => !x.isDraft)) return "scored";
    return "draft";
  }, [myScores]);

  const selectedRound = rounds.find(r => r.roundId === selectedRoundId) ?? null;
  const selectedSub = submissions.find(s => s.submissionId === selectedSubId) ?? null;
  const isReadOnly = selectedSub ? statusOf(selectedSub.submissionId) === "scored" : false;
  const open = roundIsOpen(selectedRound?.status);

  const filteredSubs = submissions.filter(s => filter === "all" || statusOf(s.submissionId) === filter);

  // Prefill form when a submission is selected.
  useEffect(() => {
    if (!selectedSub) { setScoreInputs({}); return; }
    const map: Record<number, { value: number; comment: string }> = {};
    myScores.filter(s => s.submissionId === selectedSub.submissionId)
      .forEach(s => { map[s.criteriaId] = { value: Number(s.value), comment: s.comment ?? "" }; });
    setScoreInputs(map);
    setNotice(null);
    setActionError(null);
  }, [selectedSubId, selectedSub, myScores]);

  function getVal(critId: number): number {
    return scoreInputs[critId]?.value ?? 0;
  }

  const weightedTotal = useMemo(() => {
    return criteria.reduce((acc, c) => acc + getVal(c.criteriaId) * Number(c.weight), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criteria, scoreInputs]);

  function setVal(critId: number, value: number) {
    setScoreInputs(prev => ({ ...prev, [critId]: { value, comment: prev[critId]?.comment ?? "" } }));
  }
  function setComment(critId: number, comment: string) {
    setScoreInputs(prev => ({ ...prev, [critId]: { value: prev[critId]?.value ?? 0, comment } }));
  }

  async function save(draft: boolean) {
    if (!selectedSub) return;
    setActionError(null);
    // Client-side validation against maxScore.
    for (const c of criteria) {
      const v = getVal(c.criteriaId);
      if (v < 0 || v > Number(c.maxScore)) {
        setActionError(`"${c.name}": score must be between 0 and ${c.maxScore}.`);
        return;
      }
    }
    setBusy(true);
    try {
      await scoringApi.submitScores({
        submissionId: selectedSub.submissionId,
        draft,
        scores: criteria.map(c => ({
          criteriaId: c.criteriaId,
          value: getVal(c.criteriaId),
          comment: scoreInputs[c.criteriaId]?.comment || undefined,
        })),
      });
      setNotice(draft ? "Draft saved." : "Scores submitted as final.");
      if (eventId != null && selectedRoundId != null) await loadRound(eventId, selectedRoundId);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to save scores.");
    } finally {
      setBusy(false);
    }
  }

  const statusBadge = (st: SubStatus) =>
    <PixelBadge color={st === "scored" ? "green" : st === "draft" ? "yellow" : "gray"}>{st.replace("_", " ")}</PixelBadge>;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800 }}>
          <GradientText>Score Submissions</GradientText>
        </h1>
      </div>

      {loadError && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "10px 14px", marginBottom: 16 }}>
          ERROR: {loadError}
        </div>
      )}

      {!loadingCtx && rounds.length === 0 && !loadError ? (
        <PixelCard style={{ padding: 32, textAlign: "center" }}>
          <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>No rounds assigned to you.</p>
        </PixelCard>
      ) : (
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* Left panel */}
          <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 }}>
            <PixelCard style={{ padding: 14 }}>
              <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Rounds</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {rounds.map(r => {
                  const active = selectedRoundId === r.roundId;
                  return (
                    <button key={r.roundId} onClick={() => setSelectedRoundId(r.roundId)}
                      style={{
                        padding: "10px 12px", background: active ? "rgba(34,197,94,0.1)" : C.surface2,
                        border: active ? `1px solid ${C.green}` : `1px solid ${C.border}`,
                        color: active ? C.green : C.text, fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 12, textAlign: "left", cursor: "pointer", borderRadius: 0,
                        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6,
                      }}>
                      <span>{r.name}{r.isFinal ? " · Final" : ""}</span>
                      <PixelBadge color={roundIsOpen(r.status) ? "green" : "gray"}>{r.status ?? "—"}</PixelBadge>
                    </button>
                  );
                })}
              </div>
            </PixelCard>

            {selectedRoundId && (
              <PixelCard style={{ padding: 14 }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
                  {(["all", "not_scored", "draft", "scored"] as FilterType[]).map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                      style={{
                        padding: "4px 8px", background: filter === f ? "rgba(59,130,246,0.15)" : "transparent",
                        border: filter === f ? `1px solid ${C.blue}` : `1px solid ${C.border}`,
                        color: filter === f ? C.blueBright : C.textMuted, fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", borderRadius: 0,
                      }}>
                      {f.replace("_", " ")}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {loadingRound && <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>Loading...</div>}
                  {!loadingRound && filteredSubs.length === 0 && (
                    <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>No submissions</div>
                  )}
                  {!loadingRound && filteredSubs.map(sub => {
                    const st = statusOf(sub.submissionId);
                    const active = selectedSubId === sub.submissionId;
                    return (
                      <button key={sub.submissionId} onClick={() => setSelectedSubId(sub.submissionId)}
                        style={{
                          padding: "10px 12px", background: active ? "rgba(34,197,94,0.1)" : C.surface2,
                          border: active ? `1px solid ${C.green}` : `1px solid ${C.border}`,
                          color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                          textAlign: "left", cursor: "pointer", borderRadius: 0,
                          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6,
                        }}>
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub.teamName}</span>
                        {statusBadge(st)}
                      </button>
                    );
                  })}
                </div>
              </PixelCard>
            )}
          </div>

          {/* Right panel */}
          <div style={{ flex: 1, minWidth: 320 }}>
            {!selectedSub ? (
              <PixelCard style={{ padding: 40, textAlign: "center" }}>
                <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>Select a submission to score.</p>
              </PixelCard>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <PixelCard glow gradient style={{ padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div>
                      <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700 }}>{selectedSub.teamName}</div>
                      <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginTop: 4 }}>
                        {selectedRound?.name} · Submitted {fmtDateTime(selectedSub.submittedAt)}
                      </div>
                    </div>
                    {isReadOnly && <PixelBadge color="green">SCORES SUBMITTED</PixelBadge>}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                    {selectedSub.repoUrl && <a href={selectedSub.repoUrl} target="_blank" rel="noreferrer"><PixelButton variant="secondary" size="sm">OPEN REPO</PixelButton></a>}
                    {selectedSub.demoUrl && <a href={selectedSub.demoUrl} target="_blank" rel="noreferrer"><PixelButton variant="secondary" size="sm">OPEN DEMO</PixelButton></a>}
                    {selectedSub.slideUrl && <a href={selectedSub.slideUrl} target="_blank" rel="noreferrer"><PixelButton variant="secondary" size="sm">OPEN SLIDES</PixelButton></a>}
                  </div>
                </PixelCard>

                {!open && !isReadOnly && (
                  <div style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.35)", color: "#eab308", padding: "10px 14px", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                    Round is not open for scoring — saving is disabled.
                  </div>
                )}

                <PixelCard style={{ padding: 20 }}>
                  {criteria.length === 0 ? (
                    <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>No criteria configured for this round.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {criteria.map(c => (
                        <div key={c.criteriaId} style={{ padding: 14, background: C.surface2, border: `1px solid ${C.border}` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 10 }}>
                            <div>
                              <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                              <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginTop: 2 }}>
                                {c.description ? `${c.description} · ` : ""}weight {Number(c.weight)}
                              </div>
                            </div>
                            <PixelBadge color="blue">Max: {Number(c.maxScore)}</PixelBadge>
                          </div>
                          <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
                            <input
                              type="number" min={0} max={Number(c.maxScore)} step={0.1}
                              value={scoreInputs[c.criteriaId]?.value ?? ""}
                              disabled={isReadOnly}
                              onChange={(e) => setVal(c.criteriaId, e.target.value === "" ? 0 : Number(e.target.value))}
                              style={{ width: 80, padding: "8px 10px", background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, borderRadius: 0, outline: "none" }}
                            />
                            <textarea
                              placeholder="Comment..." disabled={isReadOnly}
                              value={scoreInputs[c.criteriaId]?.comment ?? ""}
                              onChange={(e) => setComment(c.criteriaId, e.target.value)}
                              style={{ flex: 1, padding: "8px 10px", background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, borderRadius: 0, outline: "none", minHeight: 38, resize: "vertical" }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </PixelCard>

                <PixelCard glow glowColor="cyan" style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ color: C.cyanBright, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em" }}>
                    WEIGHTED TOTAL (Σ value × weight)
                  </div>
                  <div style={{ color: C.cyan, fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 800 }}>{weightedTotal.toFixed(2)}</div>
                </PixelCard>

                {actionError && (
                  <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, padding: "10px 14px", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                    ERROR: {actionError}
                  </div>
                )}
                {notice && (
                  <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.35)", color: C.green, padding: "12px 14px", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                    {notice}
                  </div>
                )}

                {isReadOnly ? (
                  <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                    Final scores submitted — editing is locked. Ask a coordinator to reopen if a correction is needed.
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 12 }}>
                    <PixelButton variant="secondary" disabled={busy || !open || criteria.length === 0} onClick={() => save(true)}>
                      SAVE DRAFT
                    </PixelButton>
                    <PixelButton variant="cyber" disabled={busy || !open || criteria.length === 0} onClick={() => save(false)}>
                      {busy ? "SAVING…" : "SUBMIT FINAL"}
                    </PixelButton>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
