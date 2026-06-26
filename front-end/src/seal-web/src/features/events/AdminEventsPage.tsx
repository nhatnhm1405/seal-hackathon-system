import { useEffect, useState, ReactNode } from "react";
import {
  C, GradientText, PixelCard, PixelButton, PixelInput,
} from "@/shared/components/PixelComponents";
import { apiFetch, ApiError, apiErrorMessage, eventsApi, reopenRequestsApi, type ReopenRequest } from "@/shared/apiClient";
import { ConfirmDialog, type ConfirmVariant } from "@/shared/components/ConfirmDialog";
import { usePermissions } from "@/shared/permissions";
import { useNotifications } from "@/app/providers/NotificationProvider";
import {
  TrackMode, EventRow, ApiEvent,
  normalizeEvent, eventStatusBadge, eventMeta, pickDefaultEvent, EventsListCard,
} from "@/features/events/eventUtils";

// System Admin's event console. The Admin is the only role that can CREATE an
// event, COMPLETE a running one, and REOPEN a completed one — and reviews the
// reopen requests filed by Coordinators. Every state change is confirmed first.

interface PendingAction {
  title: string;
  message: ReactNode;
  warning?: ReactNode;
  confirmLabel: string;
  variant: ConfirmVariant;
  run: () => Promise<void>;
}

function fmtDateTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function AdminEventsPage() {
  const { canCreateEvent, canCompleteEvent, canReopenEvent, canManageReopenRequests } = usePermissions();
  const { addToast } = useNotifications();

  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  // Reopen-request review queue
  const [requests, setRequests] = useState<ReopenRequest[]>([]);

  // Create-event form
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [evName, setEvName] = useState("");
  const [evSeason, setEvSeason] = useState<'SPRING' | 'SUMMER' | 'FALL'>("SPRING");
  const [evYear, setEvYear] = useState(String(new Date().getFullYear()));
  const [evRegStart, setEvRegStart] = useState("");
  const [evRegEnd, setEvRegEnd] = useState("");
  const [evStart, setEvStart] = useState("");
  const [evEnd, setEvEnd] = useState("");
  const [evMode, setEvMode] = useState<TrackMode>("SELF_SELECT");

  // Confirmation dialog (complete / reopen / approve / reject)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionWorking, setActionWorking] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const selectedEvent = selectedEventId ? events.find(e => e.eventId === selectedEventId) ?? null : null;

  // ── Load events ───────────────────────────────────────────────────
  function loadEvents() {
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
  }

  function loadRequests() {
    if (!canManageReopenRequests) return;
    reopenRequestsApi.getPending()
      .then(res => setRequests(res.data ?? []))
      .catch(() => { /* non-fatal */ });
  }

  useEffect(() => { loadEvents(); loadRequests(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // ── Confirmation plumbing ─────────────────────────────────────────
  function openConfirm(action: PendingAction) {
    setDialogError(null);
    setPendingAction(action);
  }
  function closeConfirm() {
    setPendingAction(null);
    setDialogError(null);
  }
  async function handleConfirmAction() {
    if (!pendingAction) return;
    setActionWorking(true);
    setDialogError(null);
    try {
      await pendingAction.run();
      closeConfirm();
    } catch (err) {
      setDialogError(err instanceof ApiError ? err.message : "Action failed.");
      addToast({ type: 'warning', title: 'ACTION FAILED', message: apiErrorMessage(err, 'Action failed.') });
    } finally {
      setActionWorking(false);
    }
  }

  // ── Lifecycle mutations ───────────────────────────────────────────
  function confirmComplete() {
    if (!selectedEvent) return;
    openConfirm({
      title: 'Complete this event?',
      message: `Mark "${selectedEvent.name}" as Completed (IN_PROGRESS → COMPLETED).`,
      warning: 'Once completed, only System Admin can reopen the event.',
      confirmLabel: 'CONFIRM COMPLETE',
      variant: 'cyber',
      run: async () => {
        await eventsApi.complete(selectedEvent.eventId);
        setEvents(prev => prev.map(e => e.eventId === selectedEvent.eventId ? { ...e, status: 'COMPLETED' } : e));
        addToast({ type: 'success', title: 'EVENT COMPLETED', message: `"${selectedEvent.name}" moved to COMPLETED.` });
      },
    });
  }

  function confirmReopen(ev: EventRow) {
    openConfirm({
      title: 'Reopen this event?',
      message: `Reopen "${ev.name}" (COMPLETED → IN_PROGRESS). The event will become active again.`,
      confirmLabel: 'CONFIRM REOPEN',
      variant: 'cyber',
      run: async () => {
        await eventsApi.reopen(ev.eventId);
        setEvents(prev => prev.map(e => e.eventId === ev.eventId ? { ...e, status: 'IN_PROGRESS' } : e));
        addToast({ type: 'success', title: 'EVENT REOPENED', message: `"${ev.name}" is active again.` });
      },
    });
  }

  // ── Reopen-request review ─────────────────────────────────────────
  function confirmApprove(req: ReopenRequest) {
    openConfirm({
      title: 'Approve reopen request?',
      message: `Approve the request to reopen "${req.eventName}" from ${req.requesterName ?? 'Coordinator'}. The event will be reopened (IN_PROGRESS).`,
      confirmLabel: 'APPROVE & REOPEN',
      variant: 'cyber',
      run: async () => {
        await reopenRequestsApi.approve(req.requestId);
        setRequests(prev => prev.filter(r => r.requestId !== req.requestId));
        setEvents(prev => prev.map(e => e.eventId === req.eventId ? { ...e, status: 'IN_PROGRESS' } : e));
        addToast({ type: 'success', title: 'APPROVED', message: `Reopened "${req.eventName}".` });
      },
    });
  }

  function confirmReject(req: ReopenRequest) {
    openConfirm({
      title: 'Reject reopen request?',
      message: `Reject the request to reopen "${req.eventName}" from ${req.requesterName ?? 'Coordinator'}. The event status will not change.`,
      confirmLabel: 'REJECT',
      variant: 'danger',
      run: async () => {
        await reopenRequestsApi.reject(req.requestId);
        setRequests(prev => prev.filter(r => r.requestId !== req.requestId));
        addToast({ type: 'warning', title: 'REJECTED', message: `Rejected the reopen request for "${req.eventName}".` });
      },
    });
  }

  // ── Create-form helpers ───────────────────────────────────────────
  // Tracks & rounds are NOT configured here — the Event Coordinator sets them up
  // during the event's SETUP phase. The Admin only creates the event shell.
  function resetCreateForm() {
    setEvName(""); setEvRegStart(""); setEvRegEnd(""); setEvStart(""); setEvEnd(""); setEvMode("SELF_SELECT");
  }

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    if (creating) return;
    if (!evName.trim()) {
      addToast({ type: 'warning', title: 'MISSING NAME', message: 'Please enter an event name.' });
      return;
    }
    setCreateError(null);
    setCreating(true);
    try {
      const res = await apiFetch<{ data: ApiEvent }>('/api/events', {
        method: 'POST',
        body: JSON.stringify({
          name: evName,
          season: evSeason,
          year: Number(evYear) || new Date().getFullYear(),
          registrationStart: evRegStart || undefined,
          registrationEnd: evRegEnd || undefined,
          startDate: evStart || undefined,
          endDate: evEnd || undefined,
          status: 'DRAFT',
          trackSelectionMode: evMode,
        }),
      });
      const created = normalizeEvent(res.data);

      setEvents(prev => [...prev, created]);
      setSelectedEventId(created.eventId);
      resetCreateForm();
      setShowCreate(false);
      addToast({ type: 'success', title: 'EVENT CREATED', message: `"${created.name}" has been created (DRAFT).` });
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Failed to create event.");
      addToast({ type: 'warning', title: 'CREATE FAILED', message: apiErrorMessage(err, 'Failed to create event.') });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800 }}>
          <GradientText>Events</GradientText>
        </h1>
        {canCreateEvent && (
          <PixelButton variant="cyber" onClick={() => setShowCreate(s => !s)}>CREATE EVENT</PixelButton>
        )}
      </div>

      {/* Reopen request review queue — only shown when there is at least one pending request */}
      {canManageReopenRequests && requests.length > 0 && (
        <PixelCard style={{ padding: 18 }}>
          <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, marginBottom: 12, letterSpacing: "0.05em" }}>
            Reopen Requests <span style={{ color: C.textMuted }}>· {requests.length} pending</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {requests.map(req => (
              <div key={req.requestId} style={{ padding: 12, background: C.surface2, border: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700 }}>{req.eventName}</div>
                  <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginTop: 3 }}>
                    {req.requesterName ?? 'Coordinator'} · {fmtDateTime(req.createdAt)}
                  </div>
                  {req.reason && (
                    <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginTop: 4, fontStyle: "italic" }}>"{req.reason}"</div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <PixelButton size="sm" variant="cyber" onClick={() => confirmApprove(req)}>APPROVE</PixelButton>
                  <PixelButton size="sm" variant="danger" onClick={() => confirmReject(req)}>REJECT</PixelButton>
                </div>
              </div>
            ))}
          </div>
        </PixelCard>
      )}

      {/* Create form */}
      {showCreate && canCreateEvent && (
        <PixelCard style={{ padding: 20 }}>
          <form onSubmit={addEvent} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {createError && (
              <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "10px 14px" }}>
                ERROR: {createError}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              <PixelInput label="Event Name" value={evName} onChange={(e) => setEvName(e.target.value)} placeholder="SEAL Fall 2026" />
              <div>
                <label style={{ color: C.greenMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>Season</label>
                <select value={evSeason} onChange={(e) => setEvSeason(e.target.value as 'SPRING' | 'SUMMER' | 'FALL')} style={{ width: "100%", marginTop: 6, padding: "10px 12px", background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, borderRadius: 0, outline: "none" }}>
                  <option value="SPRING">Spring</option>
                  <option value="SUMMER">Summer</option>
                  <option value="FALL">Fall</option>
                </select>
              </div>
              <PixelInput label="Year" type="number" value={evYear} onChange={(e) => setEvYear(e.target.value)} />
              <PixelInput label="Registration Start" type="date" value={evRegStart} onChange={(e) => setEvRegStart(e.target.value)} />
              <PixelInput label="Registration End" type="date" value={evRegEnd} onChange={(e) => setEvRegEnd(e.target.value)} />
              <div>
                <label style={{ color: C.greenMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>Track Assignment</label>
                <select value={evMode} onChange={(e) => setEvMode(e.target.value as TrackMode)} style={{ width: "100%", marginTop: 6, padding: "10px 12px", background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, borderRadius: 0, outline: "none" }}>
                  <option value="SELF_SELECT">Teams self-select</option>
                  <option value="RANDOM">Random draw</option>
                </select>
              </div>
              <PixelInput label="Start Date" type="date" value={evStart} onChange={(e) => setEvStart(e.target.value)} />
              <PixelInput label="End Date" type="date" value={evEnd} onChange={(e) => setEvEnd(e.target.value)} />
            </div>

            {/* Tracks & rounds are configured by the Event Coordinator during the
                event's SETUP phase, not here. The Admin only creates the event shell. */}
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, lineHeight: 1.6 }}>
              Tracks and rounds are set up by the Event Coordinator during the event's SETUP phase.
            </div>

            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, display: "flex", gap: 10 }}>
              <PixelButton type="submit" variant="cyber">{creating ? "CREATING..." : "ADD EVENT"}</PixelButton>
              <PixelButton type="button" variant="secondary" onClick={() => { resetCreateForm(); setShowCreate(false); }}>CANCEL</PixelButton>
            </div>
          </form>
        </PixelCard>
      )}

      {/* Detail panel — Admin lifecycle actions; on top, above the all-events list */}
      {selectedEvent && (
        <PixelCard glow gradient style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700 }}>{selectedEvent.name}</div>
              <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginTop: 4 }}>{eventMeta(selectedEvent)}</div>
              <div style={{ marginTop: 8 }}>{eventStatusBadge(selectedEvent.status)}</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {selectedEvent.status === 'IN_PROGRESS' && canCompleteEvent && (
                <PixelButton variant="cyber" onClick={confirmComplete}>COMPLETE EVENT</PixelButton>
              )}
              {selectedEvent.status === 'COMPLETED' && canReopenEvent && (
                <PixelButton variant="cyber" onClick={() => confirmReopen(selectedEvent)}>REOPEN EVENT</PixelButton>
              )}
            </div>
          </div>
        </PixelCard>
      )}

      {/* All-events summary list with find filter — below the detail panel */}
      <EventsListCard
        events={events}
        loading={loading}
        error={fetchError}
        selectedEventId={selectedEventId}
        onSelect={setSelectedEventId}
      />

      {/* Shared confirmation dialog */}
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
        />
      )}
    </div>
  );
}
