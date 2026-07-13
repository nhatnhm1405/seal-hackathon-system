import { useCallback, useEffect, useMemo, useState } from "react";
import { C, GradientText, PixelBadge, PixelButton, PixelCard, PixelInput } from "@/shared/components/PixelComponents";
import { ApiError, apiErrorMessage, eventsApi, HackathonEvent, Prize, prizesApi, Round, roundsApi, Team, teamsApi } from "@/shared/apiClient";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { useNotifications } from "@/app/providers/NotificationProvider";

const mono = "'JetBrains Mono', monospace";

const selectStyle: React.CSSProperties = {
  padding: "10px 12px",
  background: C.surface2,
  border: `1px solid ${C.border}`,
  color: C.text,
  fontFamily: mono,
  fontSize: 12,
  borderRadius: 0,
  outline: "none",
  minWidth: 220,
};

const MEDAL_COLOR: Record<number, string> = {
  1: "#FFD24A",
  2: "#CBD5E1",
  3: "#E0915A",
};

const medalColor = (rank: number) => MEDAL_COLOR[rank] ?? C.green;

// No manual event switcher here — unlike Assignments/Scoring (strictly "the
// one live event", COMPLETED moves to History), this page's own workflow
// still needs a COMPLETED event: participant certificates only export once
// the event has ended (see exportParticipantsCsv below). So prefer the live
// event, but fall back to the most recently completed one rather than
// hiding it — that's the event a coordinator would come back here for.
function pickCurrentEvent(events: HackathonEvent[]): HackathonEvent | null {
  if (events.length === 0) return null;
  const active = events.find((event) => event.status === "IN_PROGRESS")
    ?? events.find((event) => event.status === "COMPLETED");
  return active ?? events[events.length - 1];
}

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(filename: string, header: string[], rows: unknown[][]) {
  const lines = [header.join(","), ...rows.map((row) => row.map(csvCell).join(","))];
  const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}

export function CoordPrizesPage() {
  const { addToast } = useNotifications();
  const [events, setEvents] = useState<HackathonEvent[]>([]);
  const currentEvent = useMemo(() => pickCurrentEvent(events), [events]);
  const selectedEventId = currentEvent?.eventId ?? null;
  const [finalRound, setFinalRound] = useState<Round | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [topNInput, setTopNInput] = useState(3);
  const [confirmAnnounce, setConfirmAnnounce] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Prize | null>(null);

  useEffect(() => {
    setLoading(true);
    setLoadError(null);

    eventsApi.getAll()
      .then((response) => setEvents(response.data ?? []))
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Failed to load events."))
      .finally(() => setLoading(false));
  }, []);

  const reloadPrizes = useCallback((eventId: number) =>
    prizesApi.getAll(eventId)
      .then((response) => setPrizes(response.data ?? []))
      .catch(() => setPrizes([])), []);

  useEffect(() => {
    if (selectedEventId == null) {
      setFinalRound(null);
      setTeams([]);
      setPrizes([]);
      return;
    }

    const eventId = selectedEventId;

    roundsApi.getAll(eventId)
      .then((response) => setFinalRound((response.data ?? []).find((round) => round.isFinal) ?? null))
      .catch(() => setFinalRound(null));

    teamsApi.getByEvent(eventId)
      .then((response) => setTeams(response.data ?? []))
      .catch(() => setTeams([]));

    reloadPrizes(eventId);
  }, [selectedEventId, reloadPrizes]);

  const selectedEvent = currentEvent;
  const finalReady = finalRound?.status === "FINALIZED";
  const sortedPrizes = prizes.slice().sort((a, b) => a.rankPosition - b.rankPosition);
  const announced = sortedPrizes.length > 0 && sortedPrizes.every((prize) => prize.announced);
  const allHaveTeam = sortedPrizes.length > 0 && sortedPrizes.every((prize) => prize.teamId != null);

  async function run(action: () => Promise<unknown>, success?: string) {
    if (selectedEventId == null) return;

    setBusy(true);
    try {
      await action();
      await reloadPrizes(selectedEventId);

      if (success) {
        addToast({ type: "success", title: "DONE", message: success });
      }
    } catch (err) {
      addToast({ type: "warning", title: "FAILED", message: apiErrorMessage(err, "Action failed.") });
    } finally {
      setBusy(false);
    }
  }

  function autoGenerate() {
    if (selectedEventId == null) return;

    if (!finalReady) {
      addToast({ type: "warning", title: "FINAL NOT READY", message: "Finalize the final round first." });
      return;
    }

    if (finalRound?.topNAdvance != null && topNInput > finalRound.topNAdvance) {
      addToast({ type: "warning", title: "TOP N TOO HIGH", message: `Top N (${topNInput}) exceeds the final round's winner cutoff (${finalRound.topNAdvance}). Lower Top N or update the round configuration.` });
      return;
    }

    run(() => prizesApi.autoGenerate(selectedEventId, topNInput), `Generated top ${topNInput} from the final ranking.`);
  }

  function addSlot() {
    if (selectedEventId == null) return;

    const lastPrize = sortedPrizes[sortedPrizes.length - 1];
    const nextRank = (lastPrize?.rankPosition ?? 0) + 1;

    run(() => prizesApi.create(selectedEventId, { name: `Prize #${nextRank}`, rankPosition: nextRank }), "Slot added.");
  }

  function updatePrize(prizeId: number, patch: Partial<Pick<Prize, "name" | "description">> & { teamId?: number | null }) {
    if (selectedEventId == null) return;

    run(() => prizesApi.update(selectedEventId, prizeId, patch));
  }

  async function deletePrize(prizeId: number) {
    if (selectedEventId == null) return;

    await run(() => prizesApi.remove(selectedEventId, prizeId), "Slot removed.");
    setConfirmDelete(null);
  }

  // Pre-check, then hand over to the type-to-confirm dialog.
  function requestAnnounce() {
    if (selectedEventId == null) return;

    if (!allHaveTeam) {
      addToast({ type: "warning", title: "INCOMPLETE", message: "Every prize must have a winning team first." });
      return;
    }

    setConfirmAnnounce(true);
  }

  async function announce() {
    if (selectedEventId == null) return;

    await run(() => prizesApi.announce(selectedEventId), "Prizes announced - winners notified.");
    setConfirmAnnounce(false);
  }

  const eventSlug = (selectedEvent?.name ?? "event").replace(/\s+/g, "_");

  function exportWinnersCsv() {
    const eventName = selectedEvent?.name ?? "";
    const rows = sortedPrizes
      .filter((prize) => prize.teamId != null)
      .map((prize) => [
        prize.rankPosition,
        prize.name,
        prize.teamName ?? "",
        prize.teamTrackName ?? "",
        prize.finalScore ?? "",
        prize.awardedAt ?? "",
        eventName,
        `This certifies that team ${prize.teamName ?? ""} received the ${prize.name} award at ${eventName}.`,
      ]);

    if (rows.length === 0) return;

    downloadCsv(
      `winners-${eventSlug}.csv`,
      ["rank", "prize", "team", "track", "final_score", "awarded_at", "event", "certificate_statement"],
      rows,
    );
  }

  function exportParticipantsCsv() {
    if (selectedEvent?.status !== "COMPLETED") {
      addToast({ type: "warning", title: "EVENT NOT ENDED", message: "Participant certificates are available only after the event has ended." });
      return;
    }

    const eventName = selectedEvent.name;
    const rows = teams.flatMap((team) => (team.members ?? []).map((member) => {
      const role = (member.memberRole ?? member.role) === "LEADER" ? "Team Leader" : "Member";

      return [
        member.fullName,
        member.email,
        team.name,
        team.trackName ?? "",
        role,
        eventName,
        `This is to certify that ${member.fullName} participated in ${eventName} as ${role} of team ${team.name}.`,
      ];
    }));

    if (rows.length === 0) {
      addToast({ type: "warning", title: "NO PARTICIPANTS", message: "This event has no team members yet." });
      return;
    }

    downloadCsv(
      `participants-${eventSlug}.csv`,
      ["full_name", "email", "team", "track", "role", "event", "certificate_statement"],
      rows,
    );
  }

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontFamily: mono, fontSize: 28, fontWeight: 800 }}>
          <GradientText>Awards</GradientText>
        </h1>
        {selectedEvent && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: C.text, fontFamily: mono, fontSize: 13, fontWeight: 700 }}>{selectedEvent.name}</span>
            <PixelBadge color={selectedEvent.status === "IN_PROGRESS" ? "green" : "gray"}>{selectedEvent.status}</PixelBadge>
            <PixelBadge color={announced ? "green" : "gray"}>{announced ? "ANNOUNCED" : "DRAFT"}</PixelBadge>
          </div>
        )}
      </div>

      {loadError && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: mono, fontSize: 11, padding: "10px 14px" }}>
          ERROR: {loadError}
        </div>
      )}

      {!loading && selectedEvent == null && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: 18, color: C.textMuted, fontFamily: mono, fontSize: 13 }}>
          No event to show awards for yet.
        </div>
      )}

      {loading ? (
        <PixelCard style={{ padding: 40, textAlign: "center" }}>
          <div style={{ color: C.textMuted, fontFamily: mono, fontSize: 13 }}>Loading...</div>
        </PixelCard>
      ) : selectedEvent == null ? null : (
        <>
          <PixelCard style={{ padding: 16, display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
              {!finalReady && (
                <div style={{ color: C.yellow, fontFamily: mono, fontSize: 12 }}>
                  The final round is not finalized yet - finalize it before generating prizes.
                </div>
              )}

              {finalReady && !announced && (
                <>
                  <div style={{ maxWidth: 140 }}>
                    <PixelInput label="Top N" type="number" value={String(topNInput)} min="1" onChange={(event) => setTopNInput(Math.max(1, Number(event.target.value) || 1))} />
                  </div>
                  <PixelButton variant="cyber" onClick={autoGenerate} disabled={busy}>AUTO-GENERATE FROM FINAL</PixelButton>
                  <PixelButton variant="ghost" onClick={addSlot} disabled={busy}>ADD SLOT</PixelButton>
                </>
              )}

              {announced && (
                <div style={{ color: C.green, fontFamily: mono, fontSize: 12 }}>
                  Prizes announced - each winning team has been notified.
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {finalReady && !announced && (
                <PixelButton variant="primary" onClick={requestAnnounce} disabled={busy || sortedPrizes.length === 0 || !allHaveTeam}>ANNOUNCE</PixelButton>
              )}
              {sortedPrizes.some((prize) => prize.teamId != null) && (
                <PixelButton variant="secondary" onClick={exportWinnersCsv} disabled={busy}>EXPORT WINNERS CSV</PixelButton>
              )}
            </div>
          </PixelCard>

          <PixelCard style={{ padding: 16, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
            <div style={{ color: C.text, fontFamily: mono, fontSize: 13, fontWeight: 700 }}>Participation certificates</div>
            <PixelButton variant="secondary" onClick={exportParticipantsCsv} disabled={busy || teams.length === 0 || selectedEvent.status !== "COMPLETED"}>
              EXPORT PARTICIPANTS CSV
            </PixelButton>
          </PixelCard>

          {sortedPrizes.length === 0 ? (
            <PixelCard style={{ padding: 40, textAlign: "center" }}>
              <div style={{ color: C.textMuted, fontFamily: mono, fontSize: 13 }}>
                No prizes yet. Use Auto-generate from final or Add slot.
              </div>
            </PixelCard>
          ) : (
            <PixelCard glow gradient style={{ padding: 0, overflow: "hidden" }}>
              {sortedPrizes.map((prize) => {
                const locked = prize.announced;

                return (
                  <div key={prize.prizeId} className="row-actionable" style={{ padding: 16, borderBottom: `1px solid ${C.border}`, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: "50%", background: medalColor(prize.rankPosition), color: "#0d1117", fontWeight: 800, fontFamily: mono, fontSize: 13 }}>
                      {prize.rankPosition}
                    </span>

                    <div style={{ minWidth: 160, flex: "1 1 180px" }}>
                      {locked ? (
                        <div style={{ color: C.text, fontFamily: mono, fontSize: 14, fontWeight: 700 }}>{prize.name}</div>
                      ) : (
                        <PixelInput label="" value={prize.name} onChange={(event) => setPrizes((previous) => previous.map((item) => item.prizeId === prize.prizeId ? { ...item, name: event.target.value } : item))} />
                      )}
                    </div>

                    <div style={{ minWidth: 200, flex: "1 1 220px" }}>
                      {locked ? (
                        <div style={{ color: prize.teamId ? C.green : C.textMuted, fontFamily: mono, fontSize: 13 }}>
                          {prize.teamName ?? "-"}{prize.finalScore != null ? ` - ${Number(prize.finalScore).toFixed(1)}` : ""}
                        </div>
                      ) : (
                        <select
                          value={prize.teamId ?? 0}
                          onChange={(event) => updatePrize(prize.prizeId, { teamId: Number(event.target.value) || null })}
                          style={{ ...selectStyle, minWidth: 200 }}
                          disabled={busy}
                        >
                          <option value={0}>pick winning team</option>
                          {teams.map((team) => (
                            <option key={team.teamId} value={team.teamId}>
                              {team.name}{team.trackName ? ` (${team.trackName})` : ""}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <PixelBadge color={prize.announced ? "green" : "gray"}>{prize.announced ? "ANNOUNCED" : "DRAFT"}</PixelBadge>

                    {!locked && (
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <PixelButton variant="ghost" onClick={() => updatePrize(prize.prizeId, { name: prize.name })} disabled={busy}>SAVE</PixelButton>
                        <span className="row-action">
                          <PixelButton variant="danger" onClick={() => setConfirmDelete(prize)} disabled={busy}>DELETE</PixelButton>
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </PixelCard>
          )}
        </>
      )}

      {confirmAnnounce && selectedEvent && (
        <ConfirmDialog
          title="Announce these prizes?"
          message={`Publish all ${sortedPrizes.length} prize(s) of "${selectedEvent.name}" and notify every winning team.`}
          warning="Cannot be undone - every winning team is notified immediately and the prize list locks."
          confirmLabel="ANNOUNCE PRIZES"
          variant="cyber"
          requireTypedText={selectedEvent.name}
          working={busy}
          onConfirm={announce}
          onClose={() => { if (!busy) setConfirmAnnounce(false); }}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete this prize slot?"
          message={`"${confirmDelete.name}" (rank #${confirmDelete.rankPosition}) will be removed from the prize list.`}
          confirmLabel="DELETE SLOT"
          variant="danger"
          working={busy}
          onConfirm={() => deletePrize(confirmDelete.prizeId)}
          onClose={() => { if (!busy) setConfirmDelete(null); }}
        />
      )}
    </div>
  );
}