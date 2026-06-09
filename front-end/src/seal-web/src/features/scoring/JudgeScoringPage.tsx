import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  C, GradientText, PixelCard, PixelButton, PixelBadge, PixelInput,
} from "@/shared/components/PixelComponents";
import {
  userEventRoles, rounds, submissions, teams, scores as initialScores, criteria,
} from "@/shared/mocks/mockData";

type FilterType = "all" | "not_scored" | "draft" | "scored";

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US");
}

interface ScoreInput {
  value: number;
  comment: string;
}

export function JudgeScoringPage() {
  const { currentUser, currentEvent } = useAuth();
  const myAssignments = currentUser ? userEventRoles.filter(r => r.user_id === currentUser.user_id && r.role_name === 'JUDGE') : [];
  const myRoundIds = myAssignments.map(a => a.round_id).filter((id): id is number => id !== null);
  const allMyRounds = rounds.filter(r => myRoundIds.includes(r.round_id));
  const myRounds = currentEvent
    ? allMyRounds.filter(r => r.event_id === currentEvent.event_id)
    : allMyRounds;

  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(myRounds[0]?.round_id ?? null);
  const [selectedSubId, setSelectedSubId] = useState<number | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [scoreInputs, setScoreInputs] = useState<Record<number, ScoreInput>>({});
  const [scoreState, setScoreState] = useState(initialScores);
  const [submittedMsg, setSubmittedMsg] = useState<string | null>(null);

  useEffect(() => {
    setSelectedRoundId(myRounds[0]?.round_id ?? null);
    setSelectedSubId(null);
    setScoreInputs({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEvent?.event_id]);

  if (!currentUser) return null;

  if (myRounds.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <PixelCard style={{ padding: 32, textAlign: "center" }}>
          <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
            No rounds assigned.
          </p>
        </PixelCard>
      </div>
    );
  }

  const roundSubmissions = selectedRoundId
    ? submissions.filter(s => s.round_id === selectedRoundId)
    : [];

  function statusOf(subId: number): FilterType {
    const subScores = scoreState.filter(s => s.submission_id === subId && s.judge_user_id === currentUser!.user_id);
    if (subScores.length === 0) return "not_scored";
    if (subScores.some(s => s.is_draft)) return "draft";
    if (subScores.length >= criteria.length) return "scored";
    return "draft";
  }

  const filteredSubs = roundSubmissions.filter(s => filter === "all" || statusOf(s.submission_id) === filter);

  const selectedSub = selectedSubId ? submissions.find(s => s.submission_id === selectedSubId) : null;
  const selectedTeam = selectedSub ? teams.find(t => t.team_id === selectedSub.team_id) : null;
  const selectedRound = selectedSub ? rounds.find(r => r.round_id === selectedSub.round_id) : null;
  const isReadOnly = selectedSub ? statusOf(selectedSub.submission_id) === "scored" : false;

  const existingScores = useMemo(() => {
    if (!selectedSub) return {};
    const map: Record<number, number> = {};
    scoreState.filter(s => s.submission_id === selectedSub.submission_id && s.judge_user_id === currentUser.user_id)
      .forEach(s => { map[s.criteria_id] = s.value; });
    return map;
  }, [selectedSub, scoreState, currentUser.user_id]);

  function getScoreVal(critId: number): number {
    if (scoreInputs[critId] !== undefined) return scoreInputs[critId].value;
    return existingScores[critId] ?? 0;
  }

  const weighted = useMemo(() => {
    let totalWeight = 0;
    let weightedSum = 0;
    criteria.forEach(c => {
      const v = getScoreVal(c.criteria_id);
      weightedSum += v * c.weight;
      totalWeight += c.weight;
    });
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }, [scoreInputs, existingScores]);

  function updateScore(critId: number, value: number) {
    setScoreInputs(prev => ({ ...prev, [critId]: { value, comment: prev[critId]?.comment ?? "" } }));
  }
  function updateComment(critId: number, comment: string) {
    setScoreInputs(prev => ({ ...prev, [critId]: { value: prev[critId]?.value ?? 0, comment } }));
  }

  function saveScores(isDraft: boolean) {
    if (!selectedSub || !currentUser) return;
    const now = new Date().toISOString();
    setScoreState(prev => {
      const without = prev.filter(
        s => !(s.submission_id === selectedSub.submission_id && s.judge_user_id === currentUser.user_id)
      );
      const maxId = prev.length > 0 ? Math.max(...prev.map(s => s.score_id)) : 0;
      return [
        ...without,
        ...criteria.map((c, i) => ({
          score_id: maxId + i + 1,
          submission_id: selectedSub.submission_id,
          judge_user_id: currentUser.user_id,
          criteria_id: c.criteria_id,
          value: scoreInputs[c.criteria_id]?.value ?? existingScores[c.criteria_id] ?? 0,
          is_draft: isDraft,
          scored_at: now,
        })),
      ];
    });
    if (!isDraft) setScoreInputs({});
    setSubmittedMsg(isDraft ? "Draft saved." : "Scores submitted as final.");
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800 }}>
          <GradientText>Score Submissions</GradientText>
        </h1>
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        {/* Left panel */}
        <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          <PixelCard style={{ padding: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {myRounds.map(r => {
                const active = selectedRoundId === r.round_id;
                return (
                  <button
                    key={r.round_id}
                    onClick={() => { setSelectedRoundId(r.round_id); setSelectedSubId(null); }}
                    style={{
                      padding: "10px 12px",
                      background: active ? "rgba(34,197,94,0.1)" : C.surface2,
                      border: active ? `1px solid ${C.green}` : `1px solid ${C.border}`,
                      color: active ? C.green : C.text,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 12,
                      textAlign: "left",
                      cursor: "pointer",
                      borderRadius: 0,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>{r.name}</span>
                    <PixelBadge color={r.status === 'ACTIVE' ? 'green' : r.status === 'UPCOMING' ? 'yellow' : 'red'}>{r.status}</PixelBadge>
                  </button>
                );
              })}
            </div>
          </PixelCard>

          {selectedRoundId && (
            <PixelCard style={{ padding: 14 }}>
              <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
                {(["all", "not_scored", "draft", "scored"] as FilterType[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    style={{
                      padding: "4px 8px",
                      background: filter === f ? "rgba(59,130,246,0.15)" : "transparent",
                      border: filter === f ? `1px solid ${C.blue}` : `1px solid ${C.border}`,
                      color: filter === f ? C.blueBright : C.textMuted,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 9,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                      borderRadius: 0,
                    }}
                  >
                    {f.replace("_", " ")}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {filteredSubs.length === 0 && (
                  <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>No submissions</div>
                )}
                {filteredSubs.map(sub => {
                  const team = teams.find(t => t.team_id === sub.team_id);
                  const st = statusOf(sub.submission_id);
                  const active = selectedSubId === sub.submission_id;
                  return (
                    <button
                      key={sub.submission_id}
                      onClick={() => setSelectedSubId(sub.submission_id)}
                      style={{
                        padding: "10px 12px",
                        background: active ? "rgba(34,197,94,0.1)" : C.surface2,
                        border: active ? `1px solid ${C.green}` : `1px solid ${C.border}`,
                        color: C.text,
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 12,
                        textAlign: "left",
                        cursor: "pointer",
                        borderRadius: 0,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>{team?.name}</span>
                      <PixelBadge color={st === "scored" ? "green" : st === "draft" ? "yellow" : "gray"}>
                        {st.replace("_", " ")}
                      </PixelBadge>
                    </button>
                  );
                })}
              </div>
            </PixelCard>
          )}
        </div>

        {/* Right panel */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selectedSub ? (
            <PixelCard style={{ padding: 40, textAlign: "center" }}>
              <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
                Select a submission to score.
              </p>
            </PixelCard>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <PixelCard glow gradient style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div>
                    <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700 }}>
                      {selectedTeam?.name}
                    </div>
                    <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginTop: 4 }}>
                      {selectedRound?.name} · Submitted {fmtDateTime(selectedSub.submitted_at)}
                    </div>
                  </div>
                  {isReadOnly && <PixelBadge color="green">SCORES SUBMITTED</PixelBadge>}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  {selectedSub.repo_url && (
                    <a href={`https://${selectedSub.repo_url}`} target="_blank" rel="noreferrer">
                      <PixelButton variant="secondary" size="sm">OPEN REPO</PixelButton>
                    </a>
                  )}
                  {selectedSub.demo_url && (
                    <a href={`https://${selectedSub.demo_url}`} target="_blank" rel="noreferrer">
                      <PixelButton variant="secondary" size="sm">OPEN DEMO</PixelButton>
                    </a>
                  )}
                  {selectedSub.slide_url && (
                    <a href={`https://${selectedSub.slide_url}`} target="_blank" rel="noreferrer">
                      <PixelButton variant="secondary" size="sm">OPEN SLIDES</PixelButton>
                    </a>
                  )}
                </div>
              </PixelCard>

              <PixelCard style={{ padding: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {criteria.map(c => {
                    const val = getScoreVal(c.criteria_id);
                    return (
                      <div key={c.criteria_id} style={{ padding: 14, background: C.surface2, border: `1px solid ${C.border}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                          <div>
                            <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600 }}>
                              {c.name}
                            </div>
                            <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginTop: 2 }}>
                              {c.description} · weight {c.weight}
                            </div>
                          </div>
                          <PixelBadge color="blue">Max: {c.max_score}</PixelBadge>
                        </div>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <input
                            type="number"
                            min={0}
                            max={c.max_score}
                            value={val}
                            disabled={isReadOnly}
                            onChange={(e) => updateScore(c.criteria_id, Number(e.target.value))}
                            style={{
                              width: 80,
                              padding: "8px 10px",
                              background: C.surface,
                              border: `1px solid ${C.border}`,
                              color: C.text,
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 14,
                              borderRadius: 0,
                              outline: "none",
                            }}
                          />
                          <textarea
                            placeholder="Comment..."
                            disabled={isReadOnly}
                            value={scoreInputs[c.criteria_id]?.comment ?? ""}
                            onChange={(e) => updateComment(c.criteria_id, e.target.value)}
                            style={{
                              flex: 1,
                              padding: "8px 10px",
                              background: C.surface,
                              border: `1px solid ${C.border}`,
                              color: C.text,
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 12,
                              borderRadius: 0,
                              outline: "none",
                              minHeight: 38,
                              resize: "vertical",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </PixelCard>

              <PixelCard glow glowColor="cyan" style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ color: C.cyanBright, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em" }}>
                  WEIGHTED SCORE
                </div>
                <div style={{ color: C.cyan, fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 800 }}>
                  {weighted.toFixed(2)}
                </div>
              </PixelCard>

              {submittedMsg && (
                <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.35)", color: C.green, padding: "12px 14px", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                  {submittedMsg}
                </div>
              )}

              {!isReadOnly && (
                <div style={{ display: "flex", gap: 12 }}>
                  <PixelButton variant="secondary" onClick={() => saveScores(true)}>SAVE DRAFT</PixelButton>
                  <PixelButton variant="cyber" onClick={() => saveScores(false)}>SUBMIT FINAL</PixelButton>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
