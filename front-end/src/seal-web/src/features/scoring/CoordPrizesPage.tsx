import { useCallback, useEffect, useState } from "react";
import { C, GradientText, PixelBadge, PixelButton, PixelCard, PixelInput } from "@/shared/components/PixelComponents";
import { ApiError, apiErrorMessage, eventsApi, HackathonEvent, Prize, prizesApi, Round, roundsApi, Team, teamsApi } from "@/shared/apiClient";
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

function pickDefaultEvent(events: HackathonEvent[]): number | null {
  if (events.length === 0) return null;

  const active = events.find((event) => event.status === "IN_PROGRESS")
    ?? events.find((event) => event.status === "COMPLETED");

  return (active ?? events[events.length - 1]).eventId;
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
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [finalRound, setFinalRound] = useState<Round | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [topNInput, setTopNInput] = useState(3);

  useEffect(() => {
    setLoading(true);
    setLoadError(null);

    eventsApi.getAll()
      .then((response) => {
        const loaded = response.data ?? [];
        setEvents(loaded);
        setSelectedEventId(pickDefaultEvent(loaded));
      })
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

  const selectedEvent = events.find((event) => event.eventId === selectedEventId) ?? null;
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

  function deletePrize(prizeId: number) {
    if (selectedEventId == null) return;

    run(() => prizesApi.remove(selectedEventId, prizeId), "Slot removed.");
  }

  function announce() {
    if (selectedEventId == null) return;

    if (!allHaveTeam) {
      addToast({ type: "warning", title: "INCOMPLETE", message: "Every prize must have a winning team first." });
      return;
    }

    if (!window.confirm("Announce these prizes? Each winning team will be notified. This cannot be undone.")) return;

    run(() => prizesApi.announce(selectedEventId), "Prizes announced - winners notified.");
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
      <div>
        <h1 style={{ fontFamily: mono, fontSize: 28, fontWeight: 800 }}>
          <GradientText>Awards</GradientText>
        </h1>
        <p style={{ color: C.textMuted, fontFamily: mono, fontSize: 12, marginTop: 4 }}>
          Event-wide prizes - winners are the top teams of the final round across all tracks.
        </p>
      </div>

      {loadError && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: mono, fontSize: 11, padding: "10px 14px" }}>
          ERROR: {loadError}
        </div>
      )}

      <PixelCard style={{ padding: 16, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <label style={{ display: "block", color: C.greenMuted, fontFamily: mono, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
            Event
          </label>
          <select value={selectedEventId ?? 0} onChange={(event) => setSelectedEventId(Number(event.target.value) || null)} style={selectStyle} disabled={loading || busy}>
            {events.length === 0 && <option value={0}>No events</option>}
            {events.map((event) => (
              <option key={event.eventId} value={event.eventId}>
                {event.name}
                {event.status === "COMPLETED" ? " (Completed)" : event.status === "IN_PROGRESS" ? " (Live)" : event.status ? ` (${event.status})` : ""}
              </option>
            ))}
          </select>
        </div>

        {selectedEvent && (
          <div style={{ marginTop: 22 }}>
            <PixelBadge color={announced ? "green" : "gray"}>{announced ? "ANNOUNCED" : "DRAFT"}</PixelBadge>
          </div>
        )}
      </PixelCard>

      {loading ? (
        <PixelCard style={{ padding: 40, textAlign: "center" }}>
          <div style={{ color: C.textMuted, fontFamily: mono, fontSize: 13 }}>Loading...</div>
        </PixelCard>
      ) : selectedEvent == null ? null : (
        <>
          <PixelCard style={{ padding: 16, display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
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
                <div style={{ marginLeft: "auto" }}>
                  <PixelButton variant="primary" onClick={announce} disabled={busy || sortedPrizes.length === 0 || !allHaveTeam}>ANNOUNCE</PixelButton>
                </div>
              </>
            )}

            {announced && (
              <div style={{ color: C.green, fontFamily: mono, fontSize: 12 }}>
                Prizes announced - each winning team has been notified.
              </div>
            )}

            {sortedPrizes.some((prize) => prize.teamId != null) && (
              <div style={{ marginLeft: "auto" }}>
                <PixelButton variant="secondary" onClick={exportWinnersCsv} disabled={busy}>EXPORT WINNERS CSV</PixelButton>
              </div>
            )}
          </PixelCard>

          <PixelCard style={{ padding: 16, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 280px" }}>
              <div style={{ color: C.text, fontFamily: mono, fontSize: 13, fontWeight: 700 }}>Participation certificates</div>
              <div style={{ color: C.textMuted, fontFamily: mono, fontSize: 11, marginTop: 4 }}>
                Export every participant with an English certificate statement for mail merge.
              </div>
              {selectedEvent.status !== "COMPLETED" && (
                <div style={{ color: C.yellow, fontFamily: mono, fontSize: 11, marginTop: 6 }}>
                  Available only after the event has ended.
                </div>
              )}
            </div>
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
                  <div key={prize.prizeId} style={{ padding: 16, borderBottom: `1px solid ${C.border}`, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
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
                      <div style={{ display: "flex", gap: 8 }}>
                        <PixelButton variant="ghost" onClick={() => updatePrize(prize.prizeId, { name: prize.name })} disabled={busy}>SAVE</PixelButton>
                        <PixelButton variant="danger" onClick={() => deletePrize(prize.prizeId)} disabled={busy}>DELETE</PixelButton>
                      </div>
                    )}
                  </div>
                );
              })}
            </PixelCard>
          )}
        </>
      )}
    </div>
  );
}