import { useEffect, useState, ReactNode } from "react";
import {
  C, GradientText, PixelCard, PixelButton, PixelBadge, PixelInput, PixelTabs,
} from "@/shared/components/PixelComponents";
import { apiFetch, ApiError, apiErrorMessage, reopenRequestsApi, type ReopenRequest, auditLogsApi, type AuditLogEntry, teamsApi, type Team } from "@/shared/apiClient";
import { ConfirmDialog, type ConfirmVariant } from "@/shared/components/ConfirmDialog";
import { usePermissions } from "@/shared/permissions";
import { useNotifications } from "@/app/providers/NotificationProvider";
import {
  EventStatus, TrackMode, EventRow, ApiEvent,
  normalizeEvent, eventStatusBadge, eventMeta, nextStatusActions, statusChangeCopy, pickDefaultEvent, EventsListCard,
} from "@/features/events/eventUtils";
import { maxTeamsPerTrack, countAssigned, countUnassigned, teamsForTrack, isTrackValid, wouldExceedMax, canCompleteSetup, MIN_TEAMS_PER_TRACK } from "@/features/events/trackStats";
import { TrackProblemsTab } from "@/features/events/TrackProblemPanel";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

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

// Leader's display name for a team, if present in its member list.
function leaderName(team: Team): string | null {
  return team.members?.find(m => m.role === 'LEADER')?.fullName ?? null;
}

// One compact stat in the Tracks-tab overview strip (track statistics — NV1).
function StatCell({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 90 }}>
      <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</span>
      <span style={{ color: accent ? C.yellow : C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{value}</span>
    </div>
  );
}

// One team row rendered under a track (or in the Unassigned group) — NV2.
function TeamRow({ team }: { team: Team }) {
  const count = team.members?.length ?? 0;
  const leader = leaderName(team);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
      <span style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>{team.name}</span>
      <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, whiteSpace: "nowrap" }}>
        {count} {count === 1 ? "member" : "members"}{leader ? ` · ${leader}` : ""}
      </span>
    </div>
  );
}

// react-dnd payload + type for dragging a team between tracks / the unassigned pool.
const TEAM_DND_TYPE = "COORD_TEAM";
interface TeamDragItem { teamId: number; fromTrackId: number | null; }

// A TeamRow the coordinator can drag while `enabled` (SETUP). The drag connector
// is only attached when enabled, so rows are static read-only outside SETUP.
function DraggableTeamRow({ team, fromTrackId, enabled }: { team: Team; fromTrackId: number | null; enabled: boolean }) {
  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: TEAM_DND_TYPE,
    item: { teamId: team.teamId, fromTrackId } as TeamDragItem,
    canDrag: enabled,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }), [team.teamId, fromTrackId, enabled]);

  return (
    <div ref={(node) => { if (enabled) dragRef(node); }}
      style={{ cursor: enabled ? "grab" : "default", opacity: isDragging ? 0.4 : 1 }}>
      <TeamRow team={team} />
    </div>
  );
}

// A drop zone (a track body or the unassigned pool) that accepts dragged teams.
// targetTrackId = null means the unassigned pool. Dropping onto the team's current
// location is rejected so a no-op drag doesn't fire a request.
function TeamDropZone({ enabled, targetTrackId, onDropTeam, children }: {
  enabled: boolean;
  targetTrackId: number | null;
  onDropTeam: (item: TeamDragItem, targetTrackId: number | null) => void;
  children: ReactNode;
}) {
  const [{ isOver, canDrop }, dropRef] = useDrop(() => ({
    accept: TEAM_DND_TYPE,
    canDrop: (item: TeamDragItem) => enabled && item.fromTrackId !== targetTrackId,
    drop: (item: TeamDragItem) => onDropTeam(item, targetTrackId),
    collect: (monitor) => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() }),
  }), [enabled, targetTrackId, onDropTeam]);

  const active = isOver && canDrop;
  return (
    <div ref={(node) => { if (enabled) dropRef(node); }}
      style={{
        borderTop: `1px solid ${C.border}`,
        background: active ? "rgba(34,197,94,0.10)" : "transparent",
        outline: active ? `1px dashed ${C.green}` : "none",
        transition: "background 0.12s",
      }}>
      {children}
    </div>
  );
}

// A small framed chip used in the track header (team count + status). `tone` drives
// the border / background / text colour. Text is NOT uppercased (unlike PixelBadge),
// so labels read as "Ready" / "Needs 2 teams to run".
function TrackChip({ tone, children }: { tone: "green" | "red" | "amber"; children: ReactNode }) {
  const tones = {
    green: { border: "rgba(34,197,94,0.45)", bg: "rgba(34,197,94,0.08)", color: "#4ade80" },
    red:   { border: "rgba(239,68,68,0.45)", bg: "rgba(239,68,68,0.08)", color: "#f87171" },
    amber: { border: "rgba(234,179,8,0.45)", bg: "rgba(234,179,8,0.08)", color: "#facc15" },
  };
  const t = tones[tone];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", whiteSpace: "nowrap",
      border: `1px solid ${t.border}`, background: t.bg, color: t.color,
      borderRadius: 0, padding: "4px 10px",
      fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: 1,
    }}>{children}</span>
  );
}

// A queued action awaiting confirmation in the dialog.
interface PendingAction {
  title: string;
  message: ReactNode;
  warning?: ReactNode;
  confirmLabel: string;
  variant: ConfirmVariant;
  withReason?: boolean;          // show optional reason textarea (reopen request / redraw)
  reasonPlaceholder?: string;    // placeholder for the reason textarea when withReason
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

  // Teams of the selected event — drives the track-statistics overview and the
  // per-track team lists (NV1 & NV2). The roster basis for the stats is the
  // event's APPROVED teams, matching the backend's SETUP capacity freeze.
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsError, setTeamsError] = useState<string | null>(null);

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

  // Audit trail for the selected event — loaded lazily when the Audit tab opens.
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

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

  // ── Load teams when the selected event changes ────────────────────
  // Kept separate from the tracks/rounds fetch so a teams failure never blanks
  // the tracks list (and vice-versa).
  useEffect(() => {
    if (selectedEventId == null) {
      setTeams([]); setTeamsError(null);
      return;
    }
    let cancelled = false;
    setTeamsLoading(true);
    setTeamsError(null);
    teamsApi.getByEvent(selectedEventId)
      .then(res => { if (!cancelled) setTeams(res.data ?? []); })
      .catch(err => { if (!cancelled) setTeamsError(err instanceof ApiError ? err.message : "Failed to load teams."); })
      .finally(() => { if (!cancelled) setTeamsLoading(false); });
    return () => { cancelled = true; };
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

  // ── Load audit trail when the Audit tab is open ───────────────────
  // Re-runs whenever the tab is (re)opened, so a draw/redraw done on the Tracks
  // tab shows up as soon as the actor switches over to Audit.
  useEffect(() => {
    if (selectedEventId == null || detailTab !== 'audit') return;
    setAuditLoading(true);
    setAuditError(null);
    auditLogsApi.getForEvent(selectedEventId)
      .then(res => setAuditLogs(res.data ?? []))
      .catch(err => setAuditError(err instanceof ApiError ? err.message : "Failed to load audit log."))
      .finally(() => setAuditLoading(false));
  }, [selectedEventId, detailTab]);

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
      addToast({ type: 'warning', title: 'ACTION FAILED', message: apiErrorMessage(err, 'Action failed.') });
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

    // PHẦN 5 — gate leaving SETUP forward (START EVENT). Every track must have at
    // least MIN_TEAMS_PER_TRACK teams and no team may be unassigned. The backend
    // enforces this too; here we explain exactly what to fix before even asking.
    if (selectedEvent.status === 'SETUP' && next === 'IN_PROGRESS') {
      const approved = teams.filter(t => t.status === 'APPROVED');
      const gate = canCompleteSetup({
        tracks: tracks.map(t => ({ trackId: t.trackId, name: t.name, teamCount: teamsForTrack(approved, t.trackId).length })),
        unassignedCount: countUnassigned(approved),
      });
      if (!gate.ok) {
        openConfirm({
          title: 'Cannot start the event yet',
          message: (
            <div>
              Resolve the following before starting (each track needs at least {MIN_TEAMS_PER_TRACK} teams, with none left unassigned):
              <ul style={{ margin: "10px 0 0", paddingLeft: 18, lineHeight: 1.7 }}>
                {gate.reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          ),
          confirmLabel: 'OK',
          variant: 'secondary',
          run: async () => { /* informational only — nothing to commit */ },
        });
        return;
      }
    }

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

  // Re-pull the roster after a draw/redraw so the overview counts and per-track
  // lists reflect the new assignments (non-fatal if it fails — stats keep their
  // last values).
  function refreshTeams() {
    if (selectedEventId == null) return;
    teamsApi.getByEvent(selectedEventId)
      .then(res => setTeams(res.data ?? []))
      .catch(() => { /* non-fatal */ });
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
      refreshTeams();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to draw tracks.");
      addToast({ type: 'warning', title: 'DRAW FAILED', message: apiErrorMessage(err, 'Failed to draw tracks.') });
    } finally {
      setDrawing(false);
    }
  }

  // REDRAW ALL is destructive (wipes every assignment) and a fairness risk if used
  // to re-roll until satisfied — so, unlike the additive DRAW TRACKS, it is gated
  // behind a confirmation that spells out the fairness caveat. Errors surface in the
  // dialog (the run() rethrows) rather than as a page-level banner.
  function requestRedrawAll() {
    if (!selectedEvent) return;
    openConfirm({
      title: 'Redraw ALL track assignments?',
      message: `Clear every team's track in "${selectedEvent.name}" and reshuffle from scratch.`,
      warning: 'A single random draw is already fair. Re-rolling until you like the result undermines that — only redraw to fix a setup mistake (wrong tracks or capacities).',
      confirmLabel: 'CONFIRM REDRAW',
      variant: 'danger',
      withReason: true,
      reasonPlaceholder: 'Why redraw? e.g. fixed track capacities / added a track',
      run: async (reasonText) => {
        const qs = reasonText ? `&reason=${encodeURIComponent(reasonText)}` : '';
        const res = await apiFetch<{ data: unknown[] }>(
          `/api/teams/event/${selectedEvent.eventId}/draw-tracks?includeAssigned=true${qs}`,
          { method: 'POST' },
        );
        const count = (res.data ?? []).length;
        setActionError(null);
        setSuccessMsg(`Redraw complete — ${count} team(s) reshuffled across tracks.`);
        refreshTeams();
      },
    });
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
      addToast({ type: 'success', title: 'MODE UPDATED', message: `Track assignment set to ${mode === 'RANDOM' ? 'Random draw' : 'Self-select'}.` });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to update track mode.");
      addToast({ type: 'warning', title: 'UPDATE FAILED', message: apiErrorMessage(err, 'Failed to update track mode.') });
    }
  }

  async function addTrack() {
    if (!selectedEvent) return;
    const name = trkName.trim();
    if (!name) {
      addToast({ type: 'warning', title: 'MISSING NAME', message: 'Please enter a track name.' });
      return;
    }
    setActionError(null);
    try {
      const res = await apiFetch<{ data: ApiTrack }>(`/api/events/${selectedEvent.eventId}/tracks`, {
        method: 'POST',
        body: JSON.stringify({ name, description: trkDesc || undefined }),
      });
      setTracks(prev => [...prev, normalizeTrack(res.data)]);
      setTrkName(""); setTrkDesc("");
      addToast({ type: 'success', title: 'TRACK ADDED', message: `"${name}" created.` });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to add track.");
      addToast({ type: 'warning', title: 'CREATE FAILED', message: apiErrorMessage(err, 'Failed to add track.') });
    }
  }

  // PHẦN 4 — commit a drag-drop assignment (or unassign when targetTrackId is null).
  // Toasts the outcome and re-pulls the roster so all counts/lists stay in sync.
  async function performAssign(teamId: number, targetTrackId: number | null) {
    try {
      await teamsApi.assignTrack(teamId, targetTrackId);
      refreshTeams();
      addToast({
        type: 'success',
        title: targetTrackId == null ? 'TEAM UNASSIGNED' : 'TEAM ASSIGNED',
        message: targetTrackId == null ? 'Team moved to the unassigned pool.' : 'Team moved into the track.',
      });
    } catch (err) {
      addToast({ type: 'warning', title: 'ASSIGN FAILED', message: err instanceof ApiError ? err.message : 'Failed to assign team.' });
    }
  }

  // PHẦN 4 — handle a drop. Dropping a team where it already is, is ignored. If the
  // drop would push a track past the recommended max we still allow it, but ask for
  // confirmation first (soft cap); otherwise assign immediately.
  function onDropTeam(item: TeamDragItem, targetTrackId: number | null) {
    if (item.fromTrackId === targetTrackId) return;
    if (targetTrackId != null) {
      const approved = teams.filter(t => t.status === 'APPROVED');
      const currentCount = teamsForTrack(approved, targetTrackId).length;
      const max = maxTeamsPerTrack(approved.length, tracks.length);
      if (wouldExceedMax(currentCount, max)) {
        const track = tracks.find(t => t.trackId === targetTrackId);
        openConfirm({
          title: 'Track over recommended max',
          message: `Assigning this team to "${track?.name ?? 'this track'}" makes ${currentCount + 1} teams — above the recommended maximum of ${max} per track.`,
          warning: 'You can proceed; this track will simply exceed the recommended maximum.',
          confirmLabel: 'ASSIGN ANYWAY',
          variant: 'cyber',
          run: async () => { await performAssign(item.teamId, targetTrackId); },
        });
        return;
      }
    }
    performAssign(item.teamId, targetTrackId);
  }

  // PHẦN 3 — manual track cleanup. Confirms with a preview of which teams will move
  // back to the unassigned pool, then deletes the track. Teams are NOT redistributed.
  function requestDeleteTrack(track: TrackRow) {
    if (!selectedEvent) return;
    const eventId = selectedEvent.eventId;
    const trackTeams = teamsForTrack(teams.filter(t => t.status === 'APPROVED'), track.trackId);
    openConfirm({
      title: 'Remove this track?',
      message: (
        <div>
          Track <span style={{ color: C.text, fontWeight: 700 }}>"{track.name}"</span> will be deleted.
          {trackTeams.length > 0 ? (
            <div style={{ marginTop: 10 }}>
              These {trackTeams.length} team{trackTeams.length === 1 ? "" : "s"} will move to the <b>Unassigned</b> pool:
              <ul style={{ margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.7 }}>
                {trackTeams.map(t => <li key={t.teamId}>{t.name}</li>)}
              </ul>
            </div>
          ) : (
            <div style={{ marginTop: 10 }}>This track has no teams.</div>
          )}
        </div>
      ),
      warning: trackTeams.length > 0
        ? 'Teams are NOT auto-distributed — drag them from the Unassigned pool into a valid track.'
        : undefined,
      confirmLabel: 'DELETE TRACK',
      variant: 'danger',
      run: async () => {
        await apiFetch(`/api/events/${eventId}/tracks/${track.trackId}`, { method: 'DELETE' });
        setTracks(prev => prev.filter(t => t.trackId !== track.trackId));
        refreshTeams();
        addToast({ type: 'success', title: 'TRACK REMOVED', message: `"${track.name}" deleted; its teams moved to Unassigned.` });
      },
    });
  }

  async function addRound() {
    if (!selectedEvent) return;
    const name = rdName.trim();
    if (!name) {
      addToast({ type: 'warning', title: 'MISSING NAME', message: 'Please enter a round name.' });
      return;
    }
    setActionError(null);
    try {
      const res = await apiFetch<{ data: ApiRound }>(`/api/events/${selectedEvent.eventId}/rounds`, {
        method: 'POST',
        body: JSON.stringify({
          name,
          orderNumber: rdOrder,
          startTime: rdStart || undefined,
          endTime: rdEnd || undefined,
          submissionDeadline: rdDeadline || undefined,
          topNAdvance: rdTopN,
        }),
      });
      setRounds(prev => [...prev, normalizeRound(res.data)].sort((a, b) => a.orderNumber - b.orderNumber));
      setRdName(""); setRdStart(""); setRdEnd(""); setRdDeadline("");
      addToast({ type: 'success', title: 'ROUND ADDED', message: `"${name}" created.` });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to add round.");
      addToast({ type: 'warning', title: 'CREATE FAILED', message: apiErrorMessage(err, 'Failed to add round.') });
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
      addToast({ type: 'success', title: 'ROUND UPDATED', message: `Round set to ${status}.` });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to update round.");
      addToast({ type: 'warning', title: 'UPDATE FAILED', message: apiErrorMessage(err, 'Failed to update round.') });
    }
  }

  async function addCriteria() {
    if (!selectedEvent || selectedRoundId == null) return;
    const name = crName.trim();
    if (!name) {
      addToast({ type: 'warning', title: 'MISSING NAME', message: 'Please enter a criteria name.' });
      return;
    }
    setActionError(null);
    try {
      const res = await apiFetch<{ data: ApiCriteria }>(`/api/events/${selectedEvent.eventId}/rounds/${selectedRoundId}/criteria`, {
        method: 'POST',
        body: JSON.stringify({
          name,
          description: crDesc || undefined,
          weight: crWeight,
          maxScore: crMax,
          orderNumber: criteria.length + 1,
        }),
      });
      setCriteria(prev => [...prev, normalizeCriteria(res.data)].sort((a, b) => a.orderNumber - b.orderNumber));
      setCrName(""); setCrDesc("");
      addToast({ type: 'success', title: 'CRITERIA ADDED', message: `"${name}" added to this round.` });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to add criteria.");
      addToast({ type: 'warning', title: 'CREATE FAILED', message: apiErrorMessage(err, 'Failed to add criteria.') });
    }
  }

  // ── Track statistics (NV1) + per-track rosters (NV2) ──────────────
  // Roster = APPROVED teams only (the set the backend freezes into track slots
  // on SETUP entry). Stats are shown from SETUP onward, once the roster is locked
  // and track assignment is under way.
  const approvedTeams = teams.filter(t => t.status === 'APPROVED');
  const trackCount = tracks.length;
  const totalTeams = approvedTeams.length;
  const maxPerTrack = maxTeamsPerTrack(totalTeams, trackCount);
  const assignedCount = countAssigned(approvedTeams);
  const unassignedCount = countUnassigned(approvedTeams);
  const unassignedTeams = approvedTeams.filter(t => t.trackId == null);
  const isSelfSelect = selectedEvent?.trackSelectionMode === 'SELF_SELECT';
  const showTrackStats = !!selectedEvent
    && (selectedEvent.status === 'SETUP' || selectedEvent.status === 'IN_PROGRESS' || selectedEvent.status === 'COMPLETED');
  // Creating a track is locked once registration closes — DRAFT/OPEN only
  // (mirrors TrackService.TRACK_CREATE_ALLOWED_EVENT_STATUSES on the backend).
  const trackCreationAllowed = !!selectedEvent
    && (selectedEvent.status === 'DRAFT' || selectedEvent.status === 'OPEN');
  // SETUP is the only phase where the coordinator manually moves teams: drag-drop,
  // track removal and the start-event gate all key off this.
  const isSetup = selectedEvent?.status === 'SETUP';
  // "Đề thi" per track: visible from SETUP onward; upload/release/remove only while
  // the event is being set up or run (mirrors TrackProblemService on the backend).
  const showProblems = showTrackStats;
  const canManageProblems = !!selectedEvent
    && (selectedEvent.status === 'SETUP' || selectedEvent.status === 'IN_PROGRESS');

  return (
    <DndProvider backend={HTML5Backend}>
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

      {/* Detail panel (selected event) — on top, above the all-events list */}
      {selectedEvent && (
        <PixelCard glow gradient style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                <span style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700 }}>
                  {selectedEvent.name}
                </span>
                {eventStatusBadge(selectedEvent.status)}
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
              { id: "problems", label: "Problems" },
              { id: "criteria", label: "Criteria" },
              { id: "audit", label: "Audit" },
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
                {/* Random track draw — SETUP-only coordinator tool, grouped here since it
                    operates on this event's tracks (kept out of the status header). */}
                {selectedEvent.status === 'SETUP' && tracks.length > 0 && (
                  <div style={{ padding: 14, background: C.surface, border: `1px solid ${C.border}` }}>
                    <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, marginBottom: 10, letterSpacing: "0.05em" }}>
                      {selectedEvent.trackSelectionMode === 'RANDOM' ? 'Random track draw' : 'Fill unassigned tracks'}
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <PixelButton variant="cyber" onClick={() => drawTracks(false)}>
                        {drawing ? "DRAWING..." : "DRAW TRACKS"}
                      </PixelButton>
                      {/* REDRAW ALL wipes every assignment — only offered for RANDOM events
                          (it would destroy team self-selections) and gated behind a
                          fairness-warning confirm so it isn't used to re-roll until "happy". */}
                      {selectedEvent.trackSelectionMode === 'RANDOM' && (
                        <PixelButton variant="secondary" onClick={requestRedrawAll}>
                          REDRAW ALL
                        </PixelButton>
                      )}
                    </div>
                    <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginTop: 8, lineHeight: 1.6 }}>
                      DRAW TRACKS — assigns only teams without a track yet (keeps existing picks).
                      {selectedEvent.trackSelectionMode === 'RANDOM' && (
                        <><br />REDRAW ALL — clears every team's track and reshuffles from scratch; use only to fix a setup mistake — a single draw is already fair.</>
                      )}
                    </div>
                  </div>
                )}
                {/* Track-statistics overview (NV1) — shown from SETUP onward, when
                    the roster is frozen. Total + max/track for every mode; assigned
                    + unassigned added for SELF_SELECT. */}
                {showTrackStats && (
                  <div style={{ padding: 16, background: C.surface, border: `1px solid ${C.border}` }}>
                    {teamsError ? (
                      <div style={{ color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{teamsError}</div>
                    ) : (
                      <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "center" }}>
                        <StatCell label="Total teams" value={teamsLoading ? "…" : totalTeams} />
                        <StatCell label="Max / track" value={teamsLoading ? "…" : maxPerTrack} />
                        {isSelfSelect && <StatCell label="Assigned" value={teamsLoading ? "…" : assignedCount} />}
                        {isSelfSelect && <StatCell label="Unassigned" value={teamsLoading ? "…" : unassignedCount} accent={unassignedCount > 0} />}
                      </div>
                    )}
                  </div>
                )}
                {detailLoading && <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>Loading...</div>}
                {!detailLoading && tracks.length === 0 && <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>No tracks yet</div>}
                {tracks.map(t => {
                  const trackTeams = teamsForTrack(approvedTeams, t.trackId);
                  // PHẦN 2 — a track needs >= MIN_TEAMS_PER_TRACK teams to be valid.
                  const invalid = showTrackStats && !isTrackValid(trackTeams.length);
                  // Shared team list. In SETUP each row is draggable (PHẦN 4); the
                  // empty state doubles as a drop hint.
                  const teamList = (
                    <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                      {teamsLoading ? (
                        <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>Loading teams…</div>
                      ) : trackTeams.length === 0 ? (
                        <div style={{ color: C.textDim, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontStyle: "italic" }}>
                          {isSetup ? "No teams yet — drag a team here" : "No teams in this track yet"}
                        </div>
                      ) : (
                        trackTeams.map(tm => <DraggableTeamRow key={tm.teamId} team={tm} fromTrackId={t.trackId} enabled={isSetup} />)
                      )}
                    </div>
                  );
                  return (
                    <div key={t.trackId} style={{
                      background: C.surface2,
                      border: `1px solid ${C.border}`,
                      // PHẦN 2 — track validity now reads as a left accent bar (green = ready,
                      // red = under MIN_TEAMS_PER_TRACK) instead of a full red outline + badges.
                      // Neutral before SETUP, when no team is assigned yet.
                      borderLeft: `3px solid ${showTrackStats ? (invalid ? C.red : C.green) : C.border}`,
                    }}>
                      <div style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700 }}>{t.name}</div>
                          <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginTop: 3 }}>{t.description || "—"}</div>
                        </div>
                        {/* Right column — framed chips, right-aligned. Row 1: the team-count
                            chip + (in SETUP) the inline REMOVE button. Row 2: a one-line status
                            chip dropped below. Each is its own box, coloured by validity
                            (green = ready, red/amber = under MIN_TEAMS_PER_TRACK). Shown from
                            SETUP onward, once the roster is frozen. */}
                        {showTrackStats && (
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <TrackChip tone={invalid ? "red" : "green"}>
                                <b style={{ fontWeight: 800, fontSize: 13 }}>{trackTeams.length}</b>
                                <span style={{ color: C.textMuted, marginLeft: 5 }}>{trackTeams.length === 1 ? "team" : "teams"}</span>
                              </TrackChip>
                              {/* PHẦN 3 — manual track cleanup, inline (always visible), SETUP only. */}
                              {isSetup && (
                                <button
                                  type="button"
                                  onClick={() => requestDeleteTrack(t)}
                                  style={{
                                    display: "inline-flex", alignItems: "center", borderRadius: 0, cursor: "pointer",
                                    border: "1px solid rgba(239,68,68,0.45)", background: "rgba(239,68,68,0.08)", color: "#f87171",
                                    padding: "4px 10px", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: 1, letterSpacing: "0.04em",
                                  }}
                                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.18)"; }}
                                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)"; }}
                                >REMOVE</button>
                              )}
                            </div>
                            <TrackChip tone={invalid ? "amber" : "green"}>
                              {invalid ? `Needs ${MIN_TEAMS_PER_TRACK} teams to run` : "Ready"}
                            </TrackChip>
                          </div>
                        )}
                      </div>
                      {/* Per-track team list (NV2). In SETUP it is also a drop target (PHẦN 4). */}
                      {showTrackStats && (
                        isSetup
                          ? <TeamDropZone enabled targetTrackId={t.trackId} onDropTeam={onDropTeam}>{teamList}</TeamDropZone>
                          : <div style={{ borderTop: `1px solid ${C.border}` }}>{teamList}</div>
                      )}
                    </div>
                  );
                })}
                {/* Unassigned pool. In SETUP it is a drop target for BOTH modes (drag a
                    team here to pull it off a track — PHẦN 4); outside SETUP it stays the
                    read-only self-select view. */}
                {isSetup && showTrackStats ? (
                  <div style={{ background: C.surface, border: `1px solid ${unassignedTeams.length > 0 ? `${C.yellow}55` : C.border}` }}>
                    <div style={{ padding: 12, color: unassignedTeams.length > 0 ? C.yellow : C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, letterSpacing: "0.05em" }}>
                      Unassigned teams <span style={{ color: C.textMuted }}>· {unassignedTeams.length}</span>
                    </div>
                    <TeamDropZone enabled targetTrackId={null} onDropTeam={onDropTeam}>
                      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                        {teamsLoading ? (
                          <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>Loading teams…</div>
                        ) : unassignedTeams.length === 0 ? (
                          <div style={{ color: C.textDim, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontStyle: "italic" }}>No unassigned teams — drag a team here to remove it from its track</div>
                        ) : (
                          unassignedTeams.map(tm => <DraggableTeamRow key={tm.teamId} team={tm} fromTrackId={null} enabled />)
                        )}
                      </div>
                    </TeamDropZone>
                  </div>
                ) : (showTrackStats && isSelfSelect && !teamsLoading && unassignedTeams.length > 0 && (
                  <div style={{ padding: 12, background: C.surface, border: `1px solid ${C.yellow}55` }}>
                    <div style={{ color: C.yellow, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 8 }}>
                      Unassigned teams <span style={{ color: C.textMuted }}>· {unassignedTeams.length}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {unassignedTeams.map(tm => <TeamRow key={tm.teamId} team={tm} />)}
                    </div>
                  </div>
                ))}
                {/* Create-track form — NV3: locked once registration closes. Shown only
                    in DRAFT/OPEN. PHẦN 1: in SETUP we render nothing (no helper text);
                    other locked phases keep a short explanation. */}
                {trackCreationAllowed ? (
                  <div style={{ padding: 14, background: C.surface, border: `1px solid ${C.border}` }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 10, alignItems: "end" }}>
                      <PixelInput label="Name" value={trkName} onChange={(e) => setTrkName(e.target.value)} placeholder="Track name" />
                      <PixelInput label="Description" value={trkDesc} onChange={(e) => setTrkDesc(e.target.value)} placeholder="What is this track about?" />
                      <PixelButton variant="secondary" onClick={addTrack}>ADD</PixelButton>
                    </div>
                  </div>
                ) : selectedEvent.status === 'SETUP' ? null : (
                  <div style={{ padding: 12, background: C.surface, border: `1px dashed ${C.border}`, color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, lineHeight: 1.6 }}>
                    {`Tracks can only be created while the event is in DRAFT or OPEN (current: ${selectedEvent.status}).`}
                  </div>
                )}
              </div>
            )}

            {/* Problems tab — dedicated "đề thi" import per track, kept out of the
                Tracks tab so that view stays focused on team assignment. */}
            {detailTab === "problems" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {!showProblems ? (
                  <div style={{ padding: 12, background: C.surface, border: `1px dashed ${C.border}`, color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, lineHeight: 1.6 }}>
                    {`Problem import unlocks once registration closes (event in SETUP). Current: ${selectedEvent.status}.`}
                  </div>
                ) : (
                  <TrackProblemsTab eventId={selectedEvent.eventId} canManage={canManageProblems} />
                )}
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

            {detailTab === "audit" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {auditLoading && <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>Loading...</div>}
                {auditError && <div style={{ color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{auditError}</div>}
                {!auditLoading && !auditError && auditLogs.length === 0 && (
                  <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>No audit entries for this event yet.</div>
                )}
                {auditLogs.map(log => (
                  <div key={log.logId} style={{ padding: 12, background: C.surface2, border: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <PixelBadge color="cyan">{log.action}</PixelBadge>
                      <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                        {new Date(log.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginTop: 6 }}>
                      {log.actorName ?? `User#${log.actorUserId}`}
                      {log.targetType && (
                        <span style={{ color: C.textMuted }}> · {log.targetType}{log.targetId != null ? `#${log.targetId}` : ""}</span>
                      )}
                    </div>
                    {log.reason && (
                      <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginTop: 4, fontStyle: "italic" }}>"{log.reason}"</div>
                    )}
                    {log.metadataJson && (
                      <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, marginTop: 4, opacity: 0.8, wordBreak: "break-all" }}>{log.metadataJson}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
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
                placeholder={pendingAction.reasonPlaceholder ?? "Why does this event need to be reopened?"}
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
    </DndProvider>
  );
}
