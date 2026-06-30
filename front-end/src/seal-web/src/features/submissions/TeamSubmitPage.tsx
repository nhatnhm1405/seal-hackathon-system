import { useState, useEffect, useCallback } from "react";
import {
  C, GradientText, PixelCard, PixelButton, PixelInput, PixelBadge,
} from "@/shared/components/PixelComponents";
import { teamsApi, roundsApi, submissionsApi, ApiError, apiErrorMessage, MyTeam, Round, Submission } from "@/shared/apiClient";
import { useNotifications } from "@/app/providers/NotificationProvider";
import { useAuth } from "@/app/providers/AuthProvider";

function fmtDateTime(iso?: string) {
  return iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
}

function eventOptionLabel(team: MyTeam): string {
  const name = team.eventName ?? `Event #${team.eventId ?? "—"}`;
  const status = team.eventStatus
    ? team.eventStatus.toLowerCase().replace(/(^|_)([a-z])/g, (_, sep, char) => `${sep === "_" ? " " : ""}${char.toUpperCase()}`)
    : null;
  return status ? `${name} (${status})` : name;
}

export function TeamSubmitPage() {
  const { addToast } = useNotifications();
  const { currentUser } = useAuth();
  const [team, setTeam] = useState<MyTeam | null>(null);
  const [teamHistory, setTeamHistory] = useState<MyTeam[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const [existing, setExisting] = useState<Submission | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [repoUrl, setRepoUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [slideUrl, setSlideUrl] = useState("");
  const [description, setDescription] = useState("");

  const isLeader = team?.myRole === 'LEADER';

  async function loadRoundsForTeam(nextTeam: MyTeam, cancelled = false) {
    if (nextTeam.eventId == null) {
      setRounds([]);
      setSelectedRoundId(null);
      return;
    }
    const rs = await roundsApi.getAll(nextTeam.eventId).then(r => r.data ?? []).catch(() => []);
    if (cancelled) return;
    const sorted = [...rs].sort((a, b) => (a.orderNumber ?? a.roundId) - (b.orderNumber ?? b.roundId));
    setRounds(sorted);
    const open = sorted.find(r => ["ACTIVE", "OPEN"].includes((r.status ?? "").toUpperCase()));
    setSelectedRoundId((open ?? sorted[0])?.roundId ?? null);
  }

  // Load team history + rounds for the default selected event.
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setLoadError(null);
    (async () => {
      try {
        const history = (await teamsApi.getMyHistory()).data ?? [];
        if (cancelled) return;
        setTeamHistory(history);
        const firstTeam = history[0] ?? null;
        setTeam(firstTeam);
        setSelectedEventId(firstTeam?.eventId ?? null);
        if (firstTeam) {
          await loadRoundsForTeam(firstTeam, cancelled);
        } else {
          setRounds([]);
          setSelectedRoundId(null);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 404) setLoadError("You are not part of any team yet.");
          else setLoadError(err instanceof ApiError ? err.message : "Failed to load.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleEventChange(eventId: number) {
    setLoading(true);
    setLoadError(null);
    setActionError(null);
    setNotice(null);
    setExisting(null);
    setRepoUrl("");
    setDemoUrl("");
    setSlideUrl("");
    setDescription("");
    try {
      const nextTeam = (await teamsApi.getMyForEvent(eventId)).data;
      setTeam(nextTeam);
      setSelectedEventId(nextTeam.eventId ?? null);
      setTeamHistory(prev => prev.map(t => t.eventId === eventId ? nextTeam : t));
      await loadRoundsForTeam(nextTeam);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Failed to load this event.");
    } finally {
      setLoading(false);
    }
  }

  // Load existing submission for the selected round.
  const loadSubmission = useCallback((roundId: number) => {
    submissionsApi.getMyForRound(roundId)
      .then(res => {
        const s = res.data;
        setExisting(s ?? null);
        setRepoUrl(s?.repoUrl ?? "");
        setDemoUrl(s?.demoUrl ?? "");
        setSlideUrl(s?.slideUrl ?? "");
        setDescription(s?.description ?? "");
      })
      .catch(() => {
        setExisting(null);
        setRepoUrl(""); setDemoUrl(""); setSlideUrl(""); setDescription("");
      });
  }, []);

  useEffect(() => {
    setNotice(null); setActionError(null);
    if (selectedRoundId != null) loadSubmission(selectedRoundId);
  }, [selectedRoundId, loadSubmission]);

  const selectedRound = rounds.find(r => r.roundId === selectedRoundId) ?? null;
  const deadlinePassed = selectedRound?.submissionDeadline ? new Date(selectedRound.submissionDeadline).getTime() < Date.now() : false;
  const teamApproved = (team?.status ?? "").toUpperCase() === "APPROVED";
  const readOnly = currentUser?.is_active === false;
  const roundOpen = ["ACTIVE", "OPEN"].includes((selectedRound?.status ?? "").toUpperCase());
  const eventAllowsSubmit = ["OPEN", "IN_PROGRESS"].includes((team?.eventStatus ?? "").toUpperCase());
  const canSubmit = !readOnly && isLeader && teamApproved && roundOpen && eventAllowsSubmit && !deadlinePassed;

  async function submit() {
    if (!selectedRoundId) return;
    setActionError(null); setNotice(null);
    if (!repoUrl.trim()) {
      setActionError("Repository URL is required.");
      addToast({ type: "warning", title: "MISSING REPO URL", message: "Repository URL is required." });
      return;
    }
    setBusy(true);
    try {
      await submissionsApi.submit({
        roundId: selectedRoundId,
        repoUrl: repoUrl.trim(),
        demoUrl: demoUrl.trim() || undefined,
        slideUrl: slideUrl.trim() || undefined,
        description: description.trim() || undefined,
      });
      setNotice(existing ? "Submission updated." : "Submission saved.");
      addToast({
        type: "success",
        title: existing ? "SUBMISSION UPDATED" : "SUBMISSION SAVED",
        message: existing ? "Your submission was updated." : "Your project was submitted.",
      });
      loadSubmission(selectedRoundId);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to submit.");
      addToast({ type: "warning", title: "SUBMIT FAILED", message: apiErrorMessage(err, "Failed to submit.") });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 24 }}><PixelCard style={{ padding: 32, textAlign: "center" }}>
      <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>Loading...</p>
    </PixelCard></div>;
  }

  if (loadError || !team) {
    return <div style={{ padding: 24 }}><PixelCard style={{ padding: 24 }}>
      <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>{loadError ?? "No team."}</p>
    </PixelCard></div>;
  }

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800 }}>
          <GradientText>Submit Project</GradientText>
        </h1>
      </div>

      {teamHistory.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 520 }}>
          <label style={{ color: C.greenMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Event
          </label>
          <select
            value={selectedEventId ?? ""}
            onChange={(e) => handleEventChange(Number(e.target.value))}
            disabled={teamHistory.length <= 1}
            style={{
              width: "100%",
              background: C.surface2,
              border: `1px solid ${C.border}`,
              color: C.text,
              padding: "13px 16px",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              fontWeight: 700,
              borderRadius: 0,
              outline: "none",
            }}
          >
            {teamHistory.map(item => (
              <option key={item.teamId} value={item.eventId ?? ""}>
                {eventOptionLabel(item)}
              </option>
            ))}
          </select>
        </div>
      )}

      {!isLeader && (
        <div style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.35)", color: "#eab308", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, padding: "10px 14px" }}>
          Only the team leader can submit. You can view the current submission below.
        </div>
      )}
      {readOnly && (
        <div style={{ background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.25)", color: "#06b6d4", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, padding: "10px 14px", lineHeight: 1.7 }}>
          READ-ONLY: You can view submitted project information, but submitting or updating project links requires participation access.
        </div>
      )}
      {!teamApproved && (
        <div style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.35)", color: "#eab308", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, padding: "10px 14px" }}>
          Your team is not approved yet — submitting is disabled until a coordinator approves it.
        </div>
      )}
      {teamApproved && !eventAllowsSubmit && (
        <div style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.35)", color: "#3b82f6", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, padding: "10px 14px" }}>
          This event is not accepting submissions. You can view existing submission data only.
        </div>
      )}

      {/* Round selector */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {rounds.length === 0 && <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>No rounds yet.</span>}
        {rounds.map(r => {
          const active = selectedRoundId === r.roundId;
          return (
            <button key={r.roundId} onClick={() => setSelectedRoundId(r.roundId)}
              style={{
                padding: "10px 16px", background: active ? "rgba(34,197,94,0.12)" : C.surface2,
                border: active ? `1px solid ${C.green}` : `1px solid ${C.border}`, color: active ? C.green : C.text,
                fontFamily: "'JetBrains Mono', monospace", fontSize: 12, textTransform: "uppercase", cursor: "pointer",
                borderRadius: 0, display: "flex", alignItems: "center", gap: 8,
              }}>
              {r.name}{r.isFinal ? " · Final" : ""}
              {r.status && <PixelBadge color={["ACTIVE", "OPEN"].includes((r.status).toUpperCase()) ? "green" : "gray"}>{r.status}</PixelBadge>}
            </button>
          );
        })}
      </div>

      {selectedRound && (
        <>
          <PixelCard glow style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700 }}>{selectedRound.name}</div>
                <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginTop: 4 }}>
                  Deadline: {fmtDateTime(selectedRound.submissionDeadline)}
                  {existing?.submittedAt ? ` · Last submitted ${fmtDateTime(existing.submittedAt)}` : ""}
                </div>
              </div>
              {existing ? <PixelBadge color="green">SUBMITTED</PixelBadge> : <PixelBadge color="gray">NOT SUBMITTED</PixelBadge>}
            </div>
          </PixelCard>

          {deadlinePassed && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, padding: "12px 16px", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
              DEADLINE PASSED — the submission window is closed for this round.
            </div>
          )}

          <PixelCard style={{ padding: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <PixelInput label="Repository URL" value={repoUrl} onChange={e => setRepoUrl(e.target.value)} placeholder="https://github.com/your-team/project" disabled={!canSubmit} />
              <PixelInput label="Demo URL" value={demoUrl} onChange={e => setDemoUrl(e.target.value)} placeholder="https://demo.example.com" disabled={!canSubmit} />
              <PixelInput label="Slide Deck URL" value={slideUrl} onChange={e => setSlideUrl(e.target.value)} placeholder="https://slides.google.com/..." disabled={!canSubmit} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ color: C.greenMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>Description (optional)</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} disabled={!canSubmit}
                  placeholder="Brief description of your submission"
                  style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.text, padding: "10px 12px", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, borderRadius: 0, outline: "none", minHeight: 70, resize: "vertical" }} />
              </div>

              {actionError && (
                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "10px 12px" }}>ERROR: {actionError}</div>
              )}
              {notice && (
                <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.35)", color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, padding: "10px 12px" }}>{notice}</div>
              )}

              {canSubmit && (
                <div>
                  <PixelButton variant="cyber" onClick={submit} disabled={busy}>
                    {busy ? "SAVING…" : existing ? "UPDATE SUBMISSION" : "SUBMIT"}
                  </PixelButton>
                </div>
              )}
            </div>
          </PixelCard>
        </>
      )}
    </div>
  );
}
