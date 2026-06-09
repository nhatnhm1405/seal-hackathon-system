import { useEffect, useState } from "react";
import {
  C, GradientText, PixelCard, PixelButton, PixelBadge, PixelInput, PixelTabs,
} from "@/shared/components/PixelComponents";
import { apiFetch, ApiError } from "@/shared/apiClient";

// ── API shapes (tolerate camelCase + snake_case from the backend) ─────
interface ApiEvent {
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
}

interface ApiTrack {
  id?: number; trackId?: number; track_id?: number;
  eventId?: number; event_id?: number;
  name?: string;
  description?: string | null;
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

// ── Normalized rows the UI renders ────────────────────────────────────
// Event status enum per backend schema (HackathonEvent.status):
// DRAFT, OPEN, IN_PROGRESS, COMPLETED, CANCELLED.
type EventStatus = 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

interface EventRow {
  eventId: number;
  name: string;
  season: string;
  year: number | null;
  registrationStart: string;
  registrationEnd: string;
  startDate: string;
  endDate: string;
  status: EventStatus;
}

interface TrackRow {
  trackId: number;
  name: string;
  description: string;
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

function normalizeEvent(item: ApiEvent): EventRow {
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
    status:            (['DRAFT', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(status) ? status : 'DRAFT') as EventStatus,
  };
}

function normalizeTrack(item: ApiTrack): TrackRow {
  return {
    trackId:     item.id ?? item.trackId ?? item.track_id ?? 0,
    name:        item.name ?? '',
    description: item.description ?? '',
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

function eventStatusBadge(status: EventStatus) {
  if (status === 'OPEN')        return <PixelBadge color="green">OPEN</PixelBadge>;
  if (status === 'IN_PROGRESS') return <PixelBadge color="cyan">IN_PROGRESS</PixelBadge>;
  if (status === 'COMPLETED')   return <PixelBadge color="blue">COMPLETED</PixelBadge>;
  if (status === 'CANCELLED')   return <PixelBadge color="red">CANCELLED</PixelBadge>;
  return <PixelBadge color="gray">DRAFT</PixelBadge>;
}

// Lifecycle per schema: DRAFT → OPEN (registration) → IN_PROGRESS (running) → COMPLETED.
// An event may be CANCELLED from any non-terminal state, or a cancelled event
// reopened back to DRAFT.
function nextStatusActions(status: EventStatus): { label: string; next: EventStatus; variant: "cyber" | "secondary" | "danger" }[] {
  switch (status) {
    case 'DRAFT':       return [{ label: 'OPEN EVENT', next: 'OPEN', variant: 'cyber' }, { label: 'CANCEL', next: 'CANCELLED', variant: 'danger' }];
    case 'OPEN':        return [{ label: 'START EVENT', next: 'IN_PROGRESS', variant: 'cyber' }, { label: 'CANCEL', next: 'CANCELLED', variant: 'danger' }];
    case 'IN_PROGRESS': return [{ label: 'COMPLETE EVENT', next: 'COMPLETED', variant: 'cyber' }, { label: 'CANCEL', next: 'CANCELLED', variant: 'danger' }];
    case 'COMPLETED':   return [];
    case 'CANCELLED':   return [{ label: 'REOPEN', next: 'DRAFT', variant: 'secondary' }];
  }
}

export function CoordEventsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [detailTab, setDetailTab] = useState<string>("tracks");

  const [showCreate, setShowCreate] = useState(false);

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

  // Create-event form
  const [evName, setEvName] = useState("");
  const [evSeason, setEvSeason] = useState<'SPRING' | 'SUMMER' | 'FALL'>("SPRING");
  const [evYear, setEvYear] = useState(String(new Date().getFullYear()));
  const [evRegStart, setEvRegStart] = useState("");
  const [evRegEnd, setEvRegEnd] = useState("");
  const [evStart, setEvStart] = useState("");
  const [evEnd, setEvEnd] = useState("");
  const [creating, setCreating] = useState(false);

  // Tracks + rounds staged inside the create-event form, POSTed after the
  // event is created (they need the new event_id from the API response).
  const [draftTracks, setDraftTracks] = useState<{ name: string; description: string }[]>([]);
  const [draftRounds, setDraftRounds] = useState<{ name: string; submissionDeadline: string; topNAdvance: number }[]>([]);
  const [ntName, setNtName] = useState("");
  const [ntDesc, setNtDesc] = useState("");
  const [nrName, setNrName] = useState("");
  const [nrDeadline, setNrDeadline] = useState("");
  const [nrTopN, setNrTopN] = useState(3);

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
        setSelectedEventId(prev => prev ?? rows[0]?.eventId ?? null);
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

  // ── Create-form draft track/round helpers ─────────────────────────
  function addDraftTrack() {
    if (!ntName.trim()) return;
    setDraftTracks(prev => [...prev, { name: ntName.trim(), description: ntDesc.trim() }]);
    setNtName(""); setNtDesc("");
  }
  function removeDraftTrack(index: number) {
    setDraftTracks(prev => prev.filter((_, i) => i !== index));
  }
  function addDraftRound() {
    if (!nrName.trim()) return;
    setDraftRounds(prev => [...prev, { name: nrName.trim(), submissionDeadline: nrDeadline, topNAdvance: nrTopN }]);
    setNrName(""); setNrDeadline(""); setNrTopN(3);
  }
  function removeDraftRound(index: number) {
    setDraftRounds(prev => prev.filter((_, i) => i !== index));
  }

  function resetCreateForm() {
    setEvName(""); setEvRegStart(""); setEvRegEnd(""); setEvStart(""); setEvEnd("");
    setDraftTracks([]); setDraftRounds([]);
    setNtName(""); setNtDesc(""); setNrName(""); setNrDeadline(""); setNrTopN(3);
  }

  // ── Mutations ─────────────────────────────────────────────────────
  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!evName || creating) return;
    setActionError(null);
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
        }),
      });
      const created = normalizeEvent(res.data);

      // Create the staged tracks and rounds against the new event.
      for (const t of draftTracks) {
        await apiFetch(`/api/events/${created.eventId}/tracks`, {
          method: 'POST',
          body: JSON.stringify({ name: t.name, description: t.description || undefined }),
        });
      }
      for (let i = 0; i < draftRounds.length; i++) {
        const r = draftRounds[i];
        await apiFetch(`/api/events/${created.eventId}/rounds`, {
          method: 'POST',
          body: JSON.stringify({
            name: r.name,
            orderNumber: i + 1,
            submissionDeadline: r.submissionDeadline || undefined,
            topNAdvance: r.topNAdvance,
          }),
        });
      }

      setEvents(prev => [...prev, created]);
      // Selecting the new event triggers the detail effect, which re-fetches
      // its tracks and rounds from the API.
      setSelectedEventId(created.eventId);
      resetCreateForm();
      setShowCreate(false);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to create event.");
    } finally {
      setCreating(false);
    }
  }

  async function updateEventStatus(next: EventStatus) {
    if (!selectedEvent) return;
    setActionError(null);
    try {
      await apiFetch(`/api/events/${selectedEvent.eventId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: next }),
      });
      setEvents(prev => prev.map(e => e.eventId === selectedEvent.eventId ? { ...e, status: next } : e));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to update event status.");
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

  function eventMeta(ev: EventRow) {
    const period = [ev.startDate, ev.endDate].filter(Boolean).join(" → ");
    return [ev.season, ev.year, period].filter(Boolean).join(" · ");
  }

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800 }}>
            <GradientText>Events</GradientText>
          </h1>
        </div>
        <PixelButton variant="cyber" onClick={() => setShowCreate(!showCreate)}>CREATE EVENT</PixelButton>
      </div>

      {actionError && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "10px 14px" }}>
          ERROR: {actionError}
        </div>
      )}

      {showCreate && (
        <PixelCard style={{ padding: 20 }}>
          <form onSubmit={addEvent} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
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
              <div />
              <PixelInput label="Start Date" type="date" value={evStart} onChange={(e) => setEvStart(e.target.value)} />
              <PixelInput label="End Date" type="date" value={evEnd} onChange={(e) => setEvEnd(e.target.value)} />
            </div>

            {/* Staged tracks */}
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
              <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 10 }}>// tracks</div>
              {draftTracks.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                  {draftTracks.map((t, i) => (
                    <div key={i} style={{ padding: "8px 12px", background: C.surface2, border: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600 }}>{t.name}</span>
                        {t.description && <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginLeft: 8 }}>{t.description}</span>}
                      </div>
                      <button type="button" onClick={() => removeDraftTrack(i)} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>REMOVE</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 10, alignItems: "end" }}>
                <PixelInput label="Track Name" value={ntName} onChange={(e) => setNtName(e.target.value)} placeholder="Web App" />
                <PixelInput label="Description" value={ntDesc} onChange={(e) => setNtDesc(e.target.value)} placeholder="Optional" />
                <PixelButton type="button" variant="secondary" onClick={addDraftTrack}>ADD TRACK</PixelButton>
              </div>
            </div>

            {/* Staged rounds */}
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
              <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 10 }}>// rounds</div>
              {draftRounds.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                  {draftRounds.map((r, i) => (
                    <div key={i} style={{ padding: "8px 12px", background: C.surface2, border: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600 }}>{i + 1}. {r.name}</span>
                        <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginLeft: 8 }}>
                          {r.submissionDeadline ? `Deadline: ${r.submissionDeadline}` : "No deadline"} · Top {r.topNAdvance}
                        </span>
                      </div>
                      <button type="button" onClick={() => removeDraftRound(i)} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>REMOVE</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 80px auto", gap: 10, alignItems: "end" }}>
                <PixelInput label="Round Name" value={nrName} onChange={(e) => setNrName(e.target.value)} placeholder="Preliminary" />
                <PixelInput label="Deadline" type="datetime-local" value={nrDeadline} onChange={(e) => setNrDeadline(e.target.value)} />
                <PixelInput label="Top N" type="number" value={String(nrTopN)} onChange={(e) => setNrTopN(Number(e.target.value))} />
                <PixelButton type="button" variant="secondary" onClick={addDraftRound}>ADD ROUND</PixelButton>
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, display: "flex", gap: 10 }}>
              <PixelButton type="submit" variant="cyber">{creating ? "CREATING..." : "ADD EVENT"}</PixelButton>
              <PixelButton type="button" variant="secondary" onClick={() => { resetCreateForm(); setShowCreate(false); }}>CANCEL</PixelButton>
            </div>
          </form>
        </PixelCard>
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
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {nextStatusActions(selectedEvent.status).map(action => (
                <PixelButton key={action.next + action.label} variant={action.variant} onClick={() => updateEventStatus(action.next)}>
                  {action.label}
                </PixelButton>
              ))}
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
                  <div key={t.trackId} style={{ padding: 12, background: C.surface2, border: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600 }}>{t.name}</div>
                      <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginTop: 2 }}>{t.description || "—"}</div>
                    </div>
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
    </div>
  );
}
