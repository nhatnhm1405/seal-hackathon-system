import { useEffect, useState, ReactNode } from "react";
import {
  C, GradientText, PixelCard, PixelButton, PixelBadge, PixelInput, PixelTabs,
} from "@/shared/components/PixelComponents";
import { apiFetch, ApiError, reopenRequestsApi, type ReopenRequest } from "@/shared/apiClient";
import { ConfirmDialog, type ConfirmVariant } from "@/shared/components/ConfirmDialog";
import { usePermissions } from "@/shared/permissions";
import { useNotifications } from "@/app/providers/NotificationProvider";
import {
  EventStatus, TrackMode, EventRow, ApiEvent,
  normalizeEvent, eventStatusBadge, eventMeta, nextStatusActions, statusChangeCopy, pickDefaultEvent,
} from "@/features/events/eventUtils";

// Coordinator's event console. Coordinators run an event's forward lifecycle
// (OPEN → SETUP → IN_PROGRESS → COMPLETED) and configure tracks/rounds/criteria,
// but they CANNOT create an event (Admin does) and CANNOT reopen a COMPLETED one
// — for a completed event they file a reopen request for the Admin to approve.
// Every status change is gated behind a confirmation dialog.

// ── Detail API shapes (track/round/criteria stay local to this page) ──
interface ApiTrack {
  id?: number; trackId?: number; track_id?: number;
  eventId?: number; event_id?: number;
  name?: string;
  description?: string | null;
  capacity?: number | null;
}

interface ApiRound {
  id?: number; roundId?: number; round_id?: number;
  eventId?: number; event_id?: number;
  name?: string;
  orderNumber?: number; order_number?: number;
  submissionDeadline?: string; submission_deadline?: string;
  topNAdvance?: number | null; top_n_advance?: number | null;
  status?: string;
}

interface ApiCriteria {
  id?: number; criteriaId?: number; criteria_id?: number;
  roundId?: number; round_id?: number;
  name?: string;
  description?: string | null;
  weight?: number;
  maxScore?: number; max_score?: number;
  orderNumber?: number; order_number?: number;
}

interface TrackRow {
  trackId: number;
  name: string;
  description: string;
  capacity: number | null;
}

interface RoundRow {
  roundId: number;
  name: string;
  orderNumber: number;
  submissionDeadline: string;
  topNAdvance: number | null;
  status: string;
}

interface CriteriaRow {
  criteriaId: number;
  roundId: number;
  name: string;
  description: string;
  weight: number;
  maxScore: number;
  orderNumber: number;
}

function normalizeTrack(item: ApiTrack): TrackRow {
  return {
    trackId:     item.id ?? item.trackId ?? item.track_id ?? 0,
    name:        item.name ?? '',
    description: item.description ?? '',
    capacity:    item.capacity ?? null,
  };
}

function normalizeRound(item: ApiRound): RoundRow {
  return {
    roundId:            item.id ?? item.roundId ?? item.round_id ?? 0,
    name:               item.name ?? '',
    orderNumber:        item.orderNumber ?? item.order_number ?? 0,
    submissionDeadline: item.submissionDeadline ?? item.submission_deadline ?? '',
    topNAdvance:        item.topNAdvance ?? item.top_n_advance ?? null,
    status:             (item.status ?? 'PENDING').toUpperCase(),
  };
}

function normalizeCriteria(item: ApiCriteria): CriteriaRow {
  return {
    criteriaId:  item.id ?? item.criteriaId ?? item.criteria_id ?? 0,
    roundId:     item.roundId ?? item.round_id ?? 0,
    name:        item.name ?? '',
    description: item.description ?? '',
    weight:      item.weight ?? 0,
    maxScore:    item.maxScore ?? item.max_score ?? 0,
    orderNumber: item.orderNumber ?? item.order_number ?? 0,
  };
}

// A queued action awaiting confirmation in the dialog.
interface PendingAction {
  title: string;
  message: ReactNode;
  warning?: ReactNode;
  confirmLabel: string;
  variant: ConfirmVariant;
  withReason?: boolean;          // show optional reason textarea (reopen request)
  run: (reason?: string) => Promise<void>;
}

export function CoordEventsPage() {
  const { canChangeEventStatus, canCompleteEvent, canRequestReopen } = usePermissions();
  const { addToast } = useNotifications();

  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);

  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [detailTab, setDetailTab] = useState<string>("tracks");

  // Detail data for the selected event
  const [tracks, setTracks] = useState<TrackRow[]>([]);
  const [rounds, setRounds] = useState<RoundRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Criteria are per-round in the API — load them for the selected round.
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const [criteria, setCriteria] = useState<CriteriaRow[]>([]);
  const [criteriaLoading, setCriteriaLoading] = useState(false);
  const [criteriaError, setCriteriaError] = useState<string | null>(null);

  // Confirmation dialog state (shared by every status change + reopen request).
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionWorking, setActionWorking] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  // Latest reopen request for the selected (COMPLETED) event, if any.
  const [reopenReq, setReopenReq] = useState<ReopenRequest | null>(null);

  // Track form
  const [trkName, setTrkName] = useState("");
  const [trkDesc, setTrkDesc] = useState("");

  // Round form
  const [rdName, setRdName] = useState("");
  const [rdOrder, setRdOrder] = useState(1);
  const [rdStart, setRdStart] = useState("");
  const [rdEnd, setRdEnd] = useState("");
  const [rdDeadline, setRdDeadline] = useState("");
  const [rdTopN, setRdTopN] = useState(3);

  // Criteria form
  const [crName, setCrName] = useState("");
  const [crDesc, setCrDesc] = useState("");
  const [crMax, setCrMax] = useState(10);
  const [crWeight, setCrWeight] = useState(1.0);

  const selectedEvent = selectedEventId ? events.find(e => e.eventId === selectedEventId) ?? null : null;

  // ── Load events on mount ──────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    setFetchError(null);
    apiFetch<{ data: ApiEvent[] }>('/api/events')
      .then(res => {
        const rows = (res.data ?? []).map(normalizeEvent);
        setEvents(rows);
        // Default-highlight the running event (or the most recently finished one);
        // only on first load — `prev ??` keeps the actor's manual selection.
        setSelectedEventId(prev => prev ?? pickDefaultEvent(rows)?.eventId ?? null);
      })
      .catch(err => setFetchError(err instanceof ApiError ? err.message : "Failed to load events."))
      .finally(() => setLoading(false));
  }, []);

  // ── Load tracks + rounds when the selected event changes ──────────
  useEffect(() => {
    if (selectedEventId == null) {
      setTracks([]); setRounds([]); setSelectedRoundId(null);
      return;
    }
    setDetailLoading(true);
    setDetailError(null);
    Promise.all([
      apiFetch<{ data: ApiTrack[] }>(`/api/events/${selectedEventId}/tracks`),
      apiFetch<{ data: ApiRound[] }>(`/api/events/${selectedEventId}/rounds`),
    ])
      .then(([trackRes, roundRes]) => {
        setTracks((trackRes.data ?? []).map(normalizeTrack));
        const roundRows = (roundRes.data ?? []).map(normalizeRound).sort((a, b) => a.orderNumber - b.orderNumber);
        setRounds(roundRows);
        setSelectedRoundId(roundRows[0]?.roundId ?? null);
      })
      .catch(err => setDetailError(err instanceof ApiError ? err.message : "Failed to load event details."))
      .finally(() => setDetailLoading(false));
  }, [selectedEventId]);

  // ── Load latest reopen request for a COMPLETED event ──────────────
  useEffect(() => {
    setReopenReq(null);
    if (!selectedEvent || selectedEvent.status !== 'COMPLETED' || !canRequestReopen) return;
    let cancelled = false;
    reopenRequestsApi.getForEvent(selectedEvent.eventId)
      .then(res => { if (!cancelled) setReopenReq(res.data ?? null); })
      .catch(() => { /* non-fatal — button just defaults to "request" */ });
    return () => { cancelled = true; };
  }, [selectedEvent, canRequestReopen]);

  // ── Load criteria when the selected round changes ─────────────────
  useEffect(() => {
    if (selectedEventId == null || selectedRoundId == null) {
      setCriteria([]);
      return;
    }
    setCriteriaLoading(true);
    setCriteriaError(null);
    apiFetch<{ data: ApiCriteria[] }>(`/api/events/${selectedEventId}/rounds/${selectedRoundId}/criteria`)
      .then(res => setCriteria((res.data ?? []).map(normalizeCriteria).sort((a, b) => a.orderNumber - b.orderNumber)))
      .catch(err => setCriteriaError(err instanceof ApiError ? err.message : "Failed to load criteria."))
      .finally(() => setCriteriaLoading(false));
  }, [selectedEventId, selectedRoundId]);

  // ── Confirmation plumbing ─────────────────────────────────────────
  function openConfirm(action: PendingAction) {
    setDialogError(null);
    setReason("");
    setPendingAction(action);
  }

  function closeConfirm() {
    setPendingAction(null);
    setDialogError(null);
    setReason("");
  }

  async function handleConfirmAction() {
    if (!pendingAction) return;
    setActionWorking(true);
    setDialogError(null);
    try {
      await pendingAction.run(reason.trim() || undefined);
      closeConfirm();
    } catch (err) {
      setDialogError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setActionWorking(false);
    }
  }

  // ── Mutations (each is invoked only after dialog confirmation) ────
  async function doUpdateStatus(next: EventStatus) {
    if (!selectedEvent) return;
    await apiFetch(`/api/events/${selectedEvent.eventId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: next }),
    });
    setEvents(prev => prev.map(e => e.eventId === selectedEvent.eventId ? { ...e, status: next } : e));
    addToast({ type: 'success', title: 'STATUS UPDATED', message: `Event moved to ${next}.` });
  }

  async function doRequestReopen(reasonText?: string) {
    if (!selectedEvent) return;
    const res = await reopenRequestsApi.create(selectedEvent.eventId, reasonText);
    setReopenReq(res.data);
    addToast({ type: 'success', title: 'REQUEST SENT', message: 'Your reopen request was sent to System Admin.' });
  }

  // Open the confirm dialog for a lifecycle status change.
  function requestStatusChange(next: EventStatus, label: string, variant: ConfirmVariant) {
    if (!selectedEvent) return;
    const copy = statusChangeCopy(selectedEvent.status, { next, label, variant });
    openConfirm({
      title: copy.title,
      message: copy.message,
      warning: copy.warning,
      confirmLabel: copy.confirmLabel,
      variant: copy.variant,
      run: async () => { await doUpdateStatus(next); },
    });
  }

  // Open the confirm dialog for filing a reopen request.
  function requestReopen() {
    if (!selectedEvent) return;
    openConfirm({
      title: 'Request to reopen this event?',
      message: `Send a request to reopen "${selectedEvent.name}" (currently Completed) to System Admin.`,
      warning: 'You cannot reopen the event yourself. The request is sent to System Admin for review; the event status will not change until an admin approves it.',
      confirmLabel: 'SEND REQUEST',
      variant: 'cyber',
      withReason: true,
      run: async (reasonText) => { await doRequestReopen(reasonText); },
    });
  }

  // Random track draw — only meaningful while the event is in SETUP. includeAssigned
  // false → only teams without a track are drawn; true → re-shuffle every team.
  async function drawTracks(includeAssigned: boolean) {
    if (!selectedEvent || drawing) return;
    setActionError(null);
    setSuccessMsg(null);
    setDrawing(true);
    try {
      const res = await apiFetch<{ data: unknown[] }>(
        `/api/teams/event/${selectedEvent.eventId}/draw-tracks?includeAssigned=${includeAssigned}`,
        { method: 'POST' },
      );
      const count = (res.data ?? []).length;
      setSuccessMsg(`Track draw complete — ${count} team(s) assigned to tracks.`);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to draw tracks.");
    } finally {
      setDrawing(false);
    }
  }

  async function updateEventMode(mode: TrackMode) {
    if (!selectedEvent) return;
    setActionError(null);
    try {
      await apiFetch(`/api/events/${selectedEvent.eventId}`, {
        method: 'PUT',
        body: JSON.stringify({ trackSelectionMode: mode }),
      });
      setEvents(prev => prev.map(e => e.eventId === selectedEvent.eventId ? { ...e, trackSelectionMode: mode } : e));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to update track mode.");
    }
  }

  async function addTrack() {
    if (!selectedEvent || !trkName) return;
    setActionError(null);
    try {
      const res = await apiFetch<{ data: ApiTrack }>(`/api/events/${selectedEvent.eventId}/tracks`, {
        method: 'POST',
        body: JSON.stringify({ name: trkName, description: trkDesc || undefined }),
      });
      setTracks(prev => [...prev, normalizeTrack(res.data)]);
      setTrkName(""); setTrkDesc("");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to add track.");
    }
  }

  async function addRound() {
    if (!selectedEvent || !rdName) return;
    setActionError(null);
    try {
      const res = await apiFetch<{ data: ApiRound }>(`/api/events/${selectedEvent.eventId}/rounds`, {
        method: 'POST',
        body: JSON.stringify({
          name: rdName,
          orderNumber: rdOrder,
          startTime: rdStart || undefined,
          endTime: rdEnd || undefined,
          submissionDeadline: rdDeadline || undefined,
          topNAdvance: rdTopN,
        }),
      });
      setRounds(prev => [...prev, normalizeRound(res.data)].sort((a, b) => a.orderNumber - b.orderNumber));
      setRdName(""); setRdStart(""); setRdEnd(""); setRdDeadline("");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to add round.");
    }
  }

  async function changeRoundStatus(roundId: number, status: string) {
    if (!selectedEvent) return;
    setActionError(null);
    try {
      await apiFetch(`/api/events/${selectedEvent.eventId}/rounds/${roundId}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      setRounds(prev => prev.map(r => r.roundId === roundId ? { ...r, status } : r));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to update round.");
    }
  }

  async function addCriteria() {
    if (!selectedEvent || selectedRoundId == null || !crName) return;
    setActionError(null);
    try {
      const res = await apiFetch<{ data: ApiCriteria }>(`/api/events/${selectedEvent.eventId}/rounds/${selectedRoundId}/criteria`, {
        method: 'POST',
        body: JSON.stringify({
          name: crName,
          description: crDesc || undefined,
          weight: crWeight,
          maxScore: crMax,
          orderNumber: criteria.length + 1,
        }),
      });
      setCriteria(prev => [...prev, normalizeCriteria(res.data)].sort((a, b) => a.orderNumber - b.orderNumber));
      setCrName(""); setCrDesc("");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to add criteria.");
    }
  }

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800 }}>
            <GradientText>Events</GradientText>
          </h1>
        </div>
        {/* Coordinators do not create events — that is a System Admin action. */}
      </div>

      {actionError && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "10px 14px" }}>
          ERROR: {actionError}
        </div>
      )}

      {successMsg && (
        <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.35)", color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "10px 14px" }}>
          {successMsg}
        </div>
      )}

      {/* Events list */}
      <PixelCard style={{ padding: 18 }}>
        {loading ? (
          <div style={{ padding: 20, color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, textAlign: "center" }}>Loading...</div>
        ) : fetchError ? (
          <div style={{ padding: 20, color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, textAlign: "center" }}>{fetchError}</div>
        ) : events.length === 0 ? (
          <div style={{ padding: 20, color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, textAlign: "center" }}>No events yet</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {events.map(ev => {
              const active = selectedEventId === ev.eventId;
              return (
                <button key={ev.eventId} onClick={() => setSelectedEventId(ev.eventId)}
                  style={{
                    padding: "12px 14px",
                    background: active ? "rgba(34,197,94,0.1)" : C.surface2,
                    border: active ? `1px solid ${C.green}` : `1px solid ${C.border}`,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    fontFamily: "'JetBrains Mono', monospace", color: C.text,
                    cursor: "pointer", borderRadius: 0, textAlign: "left",
                  }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{ev.name}</div>
                    <div style={{ color: C.textMuted, fontSize: 11, marginTop: 4 }}>{eventMeta(ev)}</div>
                  </div>
                  {eventStatusBadge(ev.status)}
                </button>
              );
            })}
          </div>
        )}
      </PixelCard>

      {/* Detail panel */}
      {selectedEvent && (
        <PixelCard glow gradient style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700, marginTop: 4 }}>
                {selectedEvent.name}
              </div>
              <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginTop: 4 }}>
                {eventMeta(selectedEvent)}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.05em" }}>TRACK ASSIGNMENT:</span>
                {(selectedEvent.status === 'DRAFT' || selectedEvent.status === 'OPEN') ? (
                  <select value={selectedEvent.trackSelectionMode} onChange={(e) => updateEventMode(e.target.value as TrackMode)}
                    style={{ padding: "4px 8px", background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, borderRadius: 0, outline: "none" }}>
                    <option value="SELF_SELECT">Teams self-select</option>
                    <option value="RANDOM">Random draw</option>
                  </select>
                ) : (
                  <PixelBadge color={selectedEvent.trackSelectionMode === 'RANDOM' ? 'cyan' : 'blue'}>
                    {selectedEvent.trackSelectionMode === 'RANDOM' ? 'RANDOM DRAW' : 'SELF-SELECT'}
                  </PixelBadge>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {selectedEvent.status === 'SETUP' && (
                <>
                  <PixelButton variant="cyber" onClick={() => drawTracks(false)}>
                    {drawing ? "DRAWING..." : "DRAW TRACKS"}
                  </PixelButton>
                  <PixelButton variant="secondary" onClick={() => drawTracks(true)}>
                    REDRAW ALL
                  </PixelButton>
                </>
              )}

              {/* Forward / cancel lifecycle transitions — each confirmed first.
                  COMPLETE is filtered out for non-admins: only System Admin may
                  complete an event (backend enforces it too). */}
              {canChangeEventStatus && nextStatusActions(selectedEvent.status)
                .filter(action => action.next !== 'COMPLETED' || canCompleteEvent)
                .map(action => (
                  <PixelButton key={action.next + action.label} variant={action.variant}
                    onClick={() => requestStatusChange(action.next, action.label, action.variant)}>
                    {action.label}
                  </PixelButton>
                ))}

              {/* COMPLETED: coordinators can only REQUEST a reopen. */}
              {selectedEvent.status === 'COMPLETED' && canRequestReopen && (
                reopenReq?.status === 'PENDING' ? (
                  <PixelBadge color="yellow">AWAITING ADMIN REVIEW</PixelBadge>
                ) : (
                  <PixelButton variant="secondary" onClick={requestReopen}>REQUEST REOPEN</PixelButton>
                )
              )}
            </div>
          </div>

          <PixelTabs
            tabs={[
              { id: "tracks", label: "Tracks" },
              { id: "rounds", label: "Rounds" },
              { id: "criteria", label: "Criteria" },
            ]}
            active={detailTab}
            onChange={setDetailTab}
          />

          {detailError && (
            <div style={{ marginTop: 12, color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{detailError}</div>
          )}

          <div style={{ marginTop: 16 }}>
            {detailTab === "tracks" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {detailLoading && <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>Loading...</div>}
                {!detailLoading && tracks.length === 0 && <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>No tracks yet</div>}
                {tracks.map(t => (
                  <div key={t.trackId} style={{ padding: 12, background: C.surface2, border: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <div>
                      <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600 }}>{t.name}</div>
                      <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginTop: 2 }}>{t.description || "—"}</div>
                    </div>
                    {t.capacity != null && <PixelBadge color="cyan">{t.capacity} SLOTS</PixelBadge>}
                  </div>
                ))}
                <div style={{ padding: 14, background: C.surface, border: `1px solid ${C.border}` }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 10, alignItems: "end" }}>
                    <PixelInput label="Name" value={trkName} onChange={(e) => setTrkName(e.target.value)} placeholder="Track name" />
                    <PixelInput label="Description" value={trkDesc} onChange={(e) => setTrkDesc(e.target.value)} placeholder="What is this track about?" />
                    <PixelButton variant="secondary" onClick={addTrack}>ADD</PixelButton>
                  </div>
                </div>
              </div>
            )}

            {detailTab === "rounds" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {detailLoading && <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>Loading...</div>}
                {!detailLoading && rounds.length === 0 && <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>No rounds yet</div>}
                {rounds.map(r => (
                  <div key={r.roundId} style={{ padding: 12, background: C.surface2, border: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <div>
                      <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600 }}>{r.orderNumber}. {r.name}</div>
                      <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginTop: 2 }}>Deadline: {r.submissionDeadline || "—"}{r.topNAdvance != null ? ` · Top ${r.topNAdvance} advance` : ""}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <PixelBadge color={r.status === 'ACTIVE' ? 'green' : r.status === 'PENDING' ? 'yellow' : r.status === 'FINALIZED' ? 'blue' : 'red'}>{r.status}</PixelBadge>
                      {r.status === 'PENDING' && <PixelButton size="sm" variant="secondary" onClick={() => changeRoundStatus(r.roundId, 'ACTIVE')}>ACTIVATE</PixelButton>}
                      {r.status === 'ACTIVE' && <PixelButton size="sm" variant="danger" onClick={() => changeRoundStatus(r.roundId, 'CLOSED')}>CLOSE</PixelButton>}
                    </div>
                  </div>
                ))}
                <div style={{ padding: 14, background: C.surface, border: `1px solid ${C.border}` }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 70px 1fr 1fr 1fr 70px auto", gap: 10, alignItems: "end" }}>
                    <PixelInput label="Name" value={rdName} onChange={(e) => setRdName(e.target.value)} />
                    <PixelInput label="Order" type="number" value={String(rdOrder)} onChange={(e) => setRdOrder(Number(e.target.value))} />
                    <PixelInput label="Start" type="datetime-local" value={rdStart} onChange={(e) => setRdStart(e.target.value)} />
                    <PixelInput label="End" type="datetime-local" value={rdEnd} onChange={(e) => setRdEnd(e.target.value)} />
                    <PixelInput label="Deadline" type="datetime-local" value={rdDeadline} onChange={(e) => setRdDeadline(e.target.value)} />
                    <PixelInput label="Top N" type="number" value={String(rdTopN)} onChange={(e) => setRdTopN(Number(e.target.value))} />
                    <PixelButton variant="secondary" onClick={addRound}>ADD</PixelButton>
                  </div>
                </div>
              </div>
            )}

            {detailTab === "criteria" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {rounds.length === 0 ? (
                  <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>Add a round first — scoring criteria are configured per round.</div>
                ) : (
                  <>
                    {/* Round selector */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {rounds.map(r => {
                        const active = selectedRoundId === r.roundId;
                        return (
                          <button key={r.roundId} onClick={() => setSelectedRoundId(r.roundId)}
                            style={{
                              padding: "6px 12px",
                              background: active ? "rgba(34,197,94,0.12)" : C.surface2,
                              border: active ? `1px solid ${C.green}` : `1px solid ${C.border}`,
                              color: active ? C.green : C.textMuted,
                              fontFamily: "'JetBrains Mono', monospace", fontSize: 11, cursor: "pointer", borderRadius: 0,
                            }}>
                            {r.orderNumber}. {r.name}
                          </button>
                        );
                      })}
                    </div>

                    {criteriaLoading && <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>Loading...</div>}
                    {criteriaError && <div style={{ color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{criteriaError}</div>}
                    {!criteriaLoading && !criteriaError && criteria.length === 0 && (
                      <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>No criteria for this round yet</div>
                    )}
                    {criteria.map(c => (
                      <div key={c.criteriaId} style={{ padding: 12, background: C.surface2, border: `1px solid ${C.border}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                            <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginTop: 2 }}>{c.description || "—"}</div>
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <PixelBadge color="cyan">MAX {c.maxScore}</PixelBadge>
                            <PixelBadge color="blue">W {c.weight}</PixelBadge>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div style={{ padding: 14, background: C.surface, border: `1px solid ${C.border}` }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 80px 80px auto", gap: 10, alignItems: "end" }}>
                        <PixelInput label="Name" value={crName} onChange={(e) => setCrName(e.target.value)} />
                        <PixelInput label="Description" value={crDesc} onChange={(e) => setCrDesc(e.target.value)} />
                        <PixelInput label="Max" type="number" value={String(crMax)} onChange={(e) => setCrMax(Number(e.target.value))} />
                        <PixelInput label="Weight" type="number" value={String(crWeight)} onChange={(e) => setCrWeight(Number(e.target.value))} />
                        <PixelButton variant="secondary" onClick={addCriteria}>ADD</PixelButton>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </PixelCard>
      )}

      {/* Shared confirmation dialog for every status change + reopen request */}
      {pendingAction && (
        <ConfirmDialog
          title={pendingAction.title}
          message={pendingAction.message}
          warning={pendingAction.warning}
          confirmLabel={pendingAction.confirmLabel}
          variant={pendingAction.variant}
          working={actionWorking}
          error={dialogError}
          onConfirm={handleConfirmAction}
          onClose={closeConfirm}
        >
          {pendingAction.withReason && (
            <div>
              <label style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Reason (optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Why does this event need to be reopened?"
                style={{
                  width: "100%", marginTop: 6, padding: "10px 12px", background: C.surface2,
                  border: `1px solid ${C.border}`, color: C.text, fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12, borderRadius: 0, outline: "none", resize: "vertical",
                }}
              />
            </div>
          )}
        </ConfirmDialog>
      )}
    </div>
  );
}
