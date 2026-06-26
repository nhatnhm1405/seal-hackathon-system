import { useState, useEffect, useCallback } from "react";
import {
  C, GradientText, PixelCard, PixelButton, PixelBadge, PixelInput,
} from "@/shared/components/PixelComponents";
import {
  eventsApi, roundsApi, teamsApi, prizesApi, ApiError, apiErrorMessage,
  HackathonEvent, Round, Team, Prize,
} from "@/shared/apiClient";
import { useNotifications } from "@/app/providers/NotificationProvider";

const selectStyle: React.CSSProperties = {
  padding: "10px 12px", background: C.surface2, border: `1px solid ${C.border}`,
  color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, borderRadius: 0,
  outline: "none", minWidth: 220,
};

const MEDAL_COLOR: Record<number, string> = { 1: "#FFD24A", 2: "#CBD5E1", 3: "#E0915A" };
const medalColor = (rank: number) => MEDAL_COLOR[rank] ?? C.green;

// ── CSV helpers (winner record / participant mail-merge source) ────
const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
function downloadCsv(filename: string, header: string[], rows: unknown[][]) {
  const lines = [header.join(","), ...rows.map(r => r.map(csvCell).join(","))];
  // Leading BOM so Excel opens UTF-8 (Vietnamese names) without mojibake.
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function pickDefaultEvent(events: HackathonEvent[]): number | null {
  if (events.length === 0) return null;
  const active = events.find(e => e.status === 'IN_PROGRESS') ?? events.find(e => e.status === 'COMPLETED');
  return (active ?? events[events.length - 1]).eventId;
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

  // Events on mount.
  useEffect(() => {
    setLoading(true);
    eventsApi.getAll()
      .then(res => {
        const evs = res.data ?? [];
        setEvents(evs);
        setSelectedEventId(pickDefaultEvent(evs));
      })
      .catch(err => setLoadError(err instanceof ApiError ? err.message : "Failed to load events."))
      .finally(() => setLoading(false));
  }, []);

  const reloadPrizes = useCallback((eventId: number) =>
    prizesApi.getAll(eventId).then(res => setPrizes(res.data ?? [])).catch(() => setPrizes([])), []);

  // Final round + teams + prizes when event changes.
  useEffect(() => {
    if (selectedEventId == null) { setPrizes([]); setTeams([]); setFinalRound(null); return; }
    const eventId = selectedEventId;
    roundsApi.getAll(eventId)
      .then(res => setFinalRound((res.data ?? []).find(r => r.isFinal) ?? null))
      .catch(() => setFinalRound(null));
    teamsApi.getByEvent(eventId).then(res => setTeams(res.data ?? [])).catch(() => setTeams([]));
    reloadPrizes(eventId);
  }, [selectedEventId, reloadPrizes]);

  const selectedEvent = events.find(e => e.eventId === selectedEventId) ?? null;
  const finalReady = finalRound?.status === 'FINALIZED';
  const announced = prizes.length > 0 && prizes.every(p => p.announced);
  const allHaveTeam = prizes.length > 0 && prizes.every(p => p.teamId != null);
  const sortedPrizes = prizes.slice().sort((a, b) => a.rankPosition - b.rankPosition);

  async function run<T>(fn: () => Promise<T>, okMsg?: string) {
    if (selectedEventId == null) return;
    setBusy(true);
    try {
      await fn();
      await reloadPrizes(selectedEventId);
      if (okMsg) addToast({ type: 'success', title: 'DONE', message: okMsg });
    } catch (err) {
      addToast({ type: 'warning', title: 'FAILED', message: apiErrorMessage(err, 'Action failed.') });
    } finally {
      setBusy(false);
    }
  }

  const autoGenerate = () => {
    if (selectedEventId == null) return;
    if (!finalReady) {
      addToast({ type: 'warning', title: 'FINAL NOT READY', message: 'Finalize the final round first.' });
      return;
    }
    run(() => prizesApi.autoGenerate(selectedEventId, topNInput), `Generated top ${topNInput} from the final ranking.`);
  };

  const addSlot = () => {
    if (selectedEventId == null) return;
    const nextRank = (sortedPrizes.at(-1)?.rankPosition ?? 0) + 1;
    run(() => prizesApi.create(selectedEventId, { name: `Prize #${nextRank}`, rankPosition: nextRank }), 'Slot added.');
  };

  const updatePrize = (prizeId: number, patch: Partial<Pick<Prize, 'name' | 'description'>> & { teamId?: number | null }) =>
    run(() => prizesApi.update(selectedEventId!, prizeId, patch));

  const deletePrize = (prizeId: number) => run(() => prizesApi.remove(selectedEventId!, prizeId), 'Slot removed.');

  const announce = () => {
    if (selectedEventId == null) return;
    if (!allHaveTeam) {
      addToast({ type: 'warning', title: 'INCOMPLETE', message: 'Every prize must have a winning team first.' });
      return;
    }
    if (!window.confirm('Announce these prizes? Each winning team will be notified. This cannot be undone.')) return;
    run(() => prizesApi.announce(selectedEventId), 'Prizes announced — winners notified.');
  };

  const eventSlug = (selectedEvent?.name ?? "event").replace(/\s+/g, "_");

  // Winners "certificate" record — one CSV row per awarded team. English statement.
  const exportWinnersCsv = () => {
    const ev = selectedEvent?.name ?? "";
    const rows = sortedPrizes.filter(p => p.teamId != null)
      .map(p => [p.rankPosition, p.name, p.teamName ?? "", p.teamTrackName ?? "",
        p.finalScore ?? "", p.awardedAt ?? "", ev,
        `This certifies that team ${p.teamName ?? ""} received the ${p.name} award at ${ev}.`]);
    if (rows.length === 0) return;
    downloadCsv(`winners-${eventSlug}.csv`,
      ["rank", "prize", "team", "track", "final_score", "awarded_at", "event", "certificate_statement"], rows);
  };

  // Participation certificate mail-merge source — one row per participant. English
  // statement, and only available once the event has ended (COMPLETED).
  const exportParticipantsCsv = () => {
    if (selectedEvent?.status !== 'COMPLETED') {
      addToast({ type: 'warning', title: 'EVENT NOT ENDED', message: 'Participant certificates are available only after the event has ended.' });
      return;
    }
    const ev = selectedEvent.name;
    const rows = teams.flatMap(t => (t.members ?? []).map(m => {
      const roleLabel = (m.memberRole ?? m.role) === 'LEADER' ? 'Team Leader' : 'Member';
      return [m.fullName, m.email, t.name, t.trackName ?? "", roleLabel, ev,
        `This is to certify that ${m.fullName} participated in ${ev} as ${roleLabel} of team ${t.name}.`];
    }));
    if (rows.length === 0) {
      addToast({ type: 'warning', title: 'NO PARTICIPANTS', message: 'This event has no team members yet.' });
      return;
    }
    downloadCsv(`participants-${eventSlug}.csv`,
      ["full_name", "email", "team", "track", "role", "event", "certificate_statement"], rows);
  };

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800 }}>
          <GradientText>Awards</GradientText>
        </h1>
        <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginTop: 4 }}>
          Event-wide prizes — winners are the top teams of the final round (all tracks combined).
        </p>
      </div>

      {loadError && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "10px 14px" }}>ERROR: {loadError}</div>
      )}

      <PixelCard style={{ padding: 16, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <label style={{ display: "block", color: C.greenMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Event</label>
          <select value={selectedEventId ?? 0} onChange={(e) => setSelectedEventId(Number(e.target.value) || null)} style={selectStyle}>
            {events.length === 0 && <option value={0}>No events</option>}
            {events.map(ev => (
              <option key={ev.eventId} value={ev.eventId}>
                {ev.name}{ev.status === 'COMPLETED' ? " (Completed)" : ev.status === 'IN_PROGRESS' ? " (Live)" : ""}
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
          <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>Loading...</div>
        </PixelCard>
      ) : selectedEvent == null ? null : (
        <>
          {/* Generate / announce toolbar */}
          <PixelCard style={{ padding: 16, display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
            {!finalReady && (
              <div style={{ color: C.yellow, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                ⚠ The final round isn't finalized yet — finalize it before generating prizes.
              </div>
            )}
            {finalReady && !announced && (
              <>
                <div style={{ maxWidth: 140 }}>
                  <PixelInput label="Top N" type="number" value={String(topNInput)} onChange={(e) => setTopNInput(Math.max(1, Number(e.target.value) || 1))} />
                </div>
                <PixelButton variant="cyber" onClick={autoGenerate} disabled={busy}>AUTO-GENERATE FROM FINAL</PixelButton>
                <PixelButton variant="ghost" onClick={addSlot} disabled={busy}>+ ADD SLOT</PixelButton>
                <div style={{ marginLeft: "auto" }}>
                  <PixelButton variant="primary" onClick={announce} disabled={busy || prizes.length === 0 || !allHaveTeam}>📣 ANNOUNCE</PixelButton>
                </div>
              </>
            )}
            {announced && (
              <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                ✓ Prizes announced — each winning team has been notified.
              </div>
            )}
            {prizes.some(p => p.teamId != null) && (
              <div style={{ marginLeft: "auto" }}>
                <PixelButton variant="secondary" onClick={exportWinnersCsv} disabled={busy}>⬇ EXPORT WINNERS CSV</PixelButton>
              </div>
            )}
          </PixelCard>

          {/* Participation certificates — mail-merge source for ALL participants.
              Only available once the event has ended (COMPLETED). */}
          <PixelCard style={{ padding: 16, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 280px" }}>
              <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700 }}>Participation certificates</div>
              <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginTop: 4 }}>
                Export every participant (name, email, team, track, role) with an English certificate statement to mail-merge into your template.
              </div>
              {selectedEvent.status !== 'COMPLETED' && (
                <div style={{ color: C.yellow, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginTop: 6 }}>
                  ⚠ Available only after the event has ended (status COMPLETED).
                </div>
              )}
            </div>
            <PixelButton variant="secondary" onClick={exportParticipantsCsv} disabled={busy || teams.length === 0 || selectedEvent.status !== 'COMPLETED'}>⬇ EXPORT PARTICIPANTS CSV</PixelButton>
          </PixelCard>

          {/* Prize list */}
          {sortedPrizes.length === 0 ? (
            <PixelCard style={{ padding: 40, textAlign: "center" }}>
              <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
                No prizes yet. Use “Auto-generate from final” or “Add slot”.
              </div>
            </PixelCard>
          ) : (
            <PixelCard glow gradient style={{ padding: 0, overflow: "hidden" }}>
              {sortedPrizes.map(p => {
                const locked = p.announced;
                return (
                  <div key={p.prizeId} style={{ padding: 16, borderBottom: `1px solid ${C.border}`, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: "50%", background: medalColor(p.rankPosition), color: "#0d1117", fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>{p.rankPosition}</span>

                    <div style={{ minWidth: 160, flex: "1 1 180px" }}>
                      {locked ? (
                        <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700 }}>{p.name}</div>
                      ) : (
                        <PixelInput label="" value={p.name} onChange={(e) => setPrizes(prev => prev.map(x => x.prizeId === p.prizeId ? { ...x, name: e.target.value } : x))} />
                      )}
                    </div>

                    {/* Winning team */}
                    <div style={{ minWidth: 200, flex: "1 1 220px" }}>
                      {locked ? (
                        <div style={{ color: p.teamId ? C.green : C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
                          {p.teamName ?? "—"}{p.finalScore != null ? `  ·  ${Number(p.finalScore).toFixed(1)}` : ""}
                        </div>
                      ) : (
                        <select
                          value={p.teamId ?? 0}
                          onChange={(e) => updatePrize(p.prizeId, { teamId: Number(e.target.value) || null })}
                          style={{ ...selectStyle, minWidth: 200 }}
                          disabled={busy}
                        >
                          <option value={0}>— pick winning team —</option>
                          {teams.map(t => <option key={t.teamId} value={t.teamId}>{t.name}{t.trackName ? ` (${t.trackName})` : ""}</option>)}
                        </select>
                      )}
                    </div>

                    <PixelBadge color={p.announced ? "green" : "gray"}>{p.announced ? "ANNOUNCED" : "DRAFT"}</PixelBadge>

                    {!locked && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <PixelButton variant="ghost" onClick={() => updatePrize(p.prizeId, { name: p.name })} disabled={busy}>SAVE</PixelButton>
                        <PixelButton variant="danger" onClick={() => deletePrize(p.prizeId)} disabled={busy}>DELETE</PixelButton>
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
