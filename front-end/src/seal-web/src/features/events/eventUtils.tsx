import { useState } from "react";
import { C, PixelBadge, PixelCard, PixelInput } from "@/shared/components/PixelComponents";
import type { ConfirmVariant } from "@/shared/components/ConfirmDialog";

// Shared event model + presentation helpers used by both CoordEventsPage and
// AdminEventsPage. Status enum mirrors the backend HackathonEvent.status:
// DRAFT → OPEN → SETUP → IN_PROGRESS → COMPLETED (+ CANCELLED from any
// non-terminal state). SETUP = registration closed, draw/lock tracks.

export type EventStatus = 'DRAFT' | 'OPEN' | 'SETUP' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TrackMode = 'SELF_SELECT' | 'RANDOM';

export interface ApiEvent {
  id?: number; eventId?: number; event_id?: number;
  name?: string;
  season?: string;
  year?: number;
  description?: string | null;
  registrationStart?: string; registration_start?: string;
  registrationEnd?: string; registration_end?: string;
  startDate?: string; start_date?: string;
  endDate?: string; end_date?: string;
  status?: string;
  trackSelectionMode?: string; track_selection_mode?: string;
}

export interface EventRow {
  eventId: number;
  name: string;
  season: string;
  year: number | null;
  registrationStart: string;
  registrationEnd: string;
  startDate: string;
  endDate: string;
  status: EventStatus;
  trackSelectionMode: TrackMode;
}

const STATUSES: EventStatus[] = ['DRAFT', 'OPEN', 'SETUP', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export function normalizeEvent(item: ApiEvent): EventRow {
  const status = (item.status ?? 'DRAFT').toUpperCase();
  return {
    eventId:           item.id ?? item.eventId ?? item.event_id ?? 0,
    name:              item.name ?? '',
    season:            item.season ?? '',
    year:              item.year ?? null,
    registrationStart: item.registrationStart ?? item.registration_start ?? '',
    registrationEnd:   item.registrationEnd ?? item.registration_end ?? '',
    startDate:         item.startDate ?? item.start_date ?? '',
    endDate:           item.endDate ?? item.end_date ?? '',
    status:            (STATUSES.includes(status as EventStatus) ? status : 'DRAFT') as EventStatus,
    trackSelectionMode: ((item.trackSelectionMode ?? item.track_selection_mode ?? 'SELF_SELECT').toUpperCase() === 'RANDOM' ? 'RANDOM' : 'SELF_SELECT') as TrackMode,
  };
}

export function eventStatusBadge(status: EventStatus) {
  if (status === 'OPEN')        return <PixelBadge color="green">OPEN</PixelBadge>;
  if (status === 'SETUP')       return <PixelBadge color="yellow">SETUP</PixelBadge>;
  if (status === 'IN_PROGRESS') return <PixelBadge color="cyan">IN_PROGRESS</PixelBadge>;
  if (status === 'COMPLETED')   return <PixelBadge color="blue">COMPLETED</PixelBadge>;
  if (status === 'CANCELLED')   return <PixelBadge color="red">CANCELLED</PixelBadge>;
  return <PixelBadge color="gray">DRAFT</PixelBadge>;
}

export function eventMeta(ev: EventRow): string {
  const period = [ev.startDate, ev.endDate].filter(Boolean).join(" → ");
  return [ev.season, ev.year, period].filter(Boolean).join(" · ");
}

// endDate as a sortable timestamp; missing/invalid dates sort last (-Infinity).
function endTime(ev: EventRow): number {
  const t = ev.endDate ? new Date(ev.endDate).getTime() : NaN;
  return Number.isNaN(t) ? -Infinity : t;
}

function latestByEndDate(rows: EventRow[]): EventRow {
  return rows.reduce((best, ev) => (endTime(ev) > endTime(best) ? ev : best));
}

// Which event the Events console highlights by default on first load. Lands the
// actor on the event that is currently being managed, ignoring DRAFTs:
//   1. An actively-managed event (OPEN / SETUP / IN_PROGRESS) — if several, the
//      one with the latest endDate (the newest live event)
//   2. else COMPLETED — the one with the latest endDate (most recently finished)
//   3. else the newest non-DRAFT event (API returns newest-first), else the first row
// Returns undefined only for an empty list.
export function pickDefaultEvent(rows: EventRow[]): EventRow | undefined {
  if (rows.length === 0) return undefined;

  const active = rows.filter(e => e.status === 'OPEN' || e.status === 'SETUP' || e.status === 'IN_PROGRESS');
  if (active.length > 0) return latestByEndDate(active);

  const completed = rows.filter(e => e.status === 'COMPLETED');
  if (completed.length > 0) return latestByEndDate(completed);

  return rows.find(e => e.status !== 'DRAFT') ?? rows[0];
}

// Shared "all events" summary card used by both the Admin and Coordinator
// consoles (below the detail panel). Includes a live "find event" filter that
// matches name / season / year (case-insensitive substring). The filter only
// narrows this list — it never changes the current selection or the detail panel.
export function EventsListCard({
  events, loading, error, selectedEventId, onSelect,
}: {
  events: EventRow[];
  loading: boolean;
  error: string | null;
  selectedEventId: number | null;
  onSelect: (eventId: number) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = q
    ? events.filter(ev =>
        ev.name.toLowerCase().includes(q) ||
        ev.season.toLowerCase().includes(q) ||
        String(ev.year ?? "").includes(q))
    : events;

  const muted: React.CSSProperties = { padding: 20, color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, textAlign: "center" };

  return (
    <PixelCard style={{ padding: 18 }}>
      {loading ? (
        <div style={muted}>Loading...</div>
      ) : error ? (
        <div style={{ ...muted, color: C.red }}>{error}</div>
      ) : events.length === 0 ? (
        <div style={muted}>No events yet</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <PixelInput
            placeholder="Find event by name, season, or year..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {filtered.length === 0 ? (
            <div style={{ ...muted, padding: 12 }}>No events match your search.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map(ev => {
                const active = selectedEventId === ev.eventId;
                return (
                  <button key={ev.eventId} onClick={() => onSelect(ev.eventId)}
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
        </div>
      )}
    </PixelCard>
  );
}

export interface StatusAction {
  label: string;
  next: EventStatus;
  variant: ConfirmVariant;
}

// Forward / rollback / cancel transitions per the backend lifecycle. The operable
// states DRAFT/OPEN/SETUP/IN_PROGRESS can be walked both ways one step at a time, so
// each step also exposes its reverse (OPEN→DRAFT, SETUP→OPEN, IN_PROGRESS→SETUP).
// Deliberately does NOT include COMPLETED → * : reopening is an Admin-only dedicated
// action (and the backend transition map blocks COMPLETED → anything for the PUT).
export function nextStatusActions(status: EventStatus): StatusAction[] {
  switch (status) {
    case 'DRAFT':       return [{ label: 'OPEN EVENT', next: 'OPEN', variant: 'cyber' }, { label: 'CANCEL', next: 'CANCELLED', variant: 'danger' }];
    case 'OPEN':        return [{ label: 'CLOSE REGISTRATION', next: 'SETUP', variant: 'cyber' }, { label: 'BACK TO DRAFT', next: 'DRAFT', variant: 'secondary' }, { label: 'CANCEL', next: 'CANCELLED', variant: 'danger' }];
    case 'SETUP':       return [{ label: 'START EVENT', next: 'IN_PROGRESS', variant: 'cyber' }, { label: 'REOPEN REGISTRATION', next: 'OPEN', variant: 'secondary' }, { label: 'CANCEL', next: 'CANCELLED', variant: 'danger' }];
    case 'IN_PROGRESS': return [{ label: 'COMPLETE EVENT', next: 'COMPLETED', variant: 'cyber' }, { label: 'BACK TO SETUP', next: 'SETUP', variant: 'secondary' }, { label: 'CANCEL', next: 'CANCELLED', variant: 'danger' }];
    case 'COMPLETED':   return [];
    case 'CANCELLED':   return [{ label: 'REOPEN', next: 'DRAFT', variant: 'secondary' }];
  }
}

const STATUS_LABEL: Record<EventStatus, string> = {
  DRAFT: 'Draft', OPEN: 'Open (registration)', SETUP: 'Setup', IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed', CANCELLED: 'Cancelled',
};

export interface ConfirmCopy {
  title: string;
  message: string;
  warning?: string;
  confirmLabel: string;
  variant: ConfirmVariant;
}

// Confirm-dialog copy for a status change, stating current → target and a
// warning when the step can't be undone by the actor.
export function statusChangeCopy(from: EventStatus, action: StatusAction): ConfirmCopy {
  const base = `Current status: "${STATUS_LABEL[from]}" (${from}) → "${STATUS_LABEL[action.next]}" (${action.next}).`;
  if (action.next === 'COMPLETED') {
    return {
      title: 'Complete this event?',
      message: base,
      warning: 'Once completed, you cannot reopen the event yourself; only System Admin can reopen it. Are you sure?',
      confirmLabel: 'CONFIRM COMPLETE',
      variant: 'cyber',
    };
  }
  if (action.next === 'CANCELLED') {
    return {
      title: 'Cancel this event?',
      message: base,
      warning: 'Cancelling will stop all activity for this event.',
      confirmLabel: 'CONFIRM CANCEL',
      variant: 'danger',
    };
  }
  return {
    title: `Change status: ${action.label}?`,
    message: base,
    confirmLabel: `CONFIRM`,
    variant: action.variant,
  };
}
