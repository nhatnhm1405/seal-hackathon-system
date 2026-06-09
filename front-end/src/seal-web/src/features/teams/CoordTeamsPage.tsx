import React, { useEffect, useMemo, useState } from "react";
import {
  C, GradientText, PixelCard, PixelButton, PixelBadge,
} from "@/shared/components/PixelComponents";
import { apiFetch, ApiError } from "@/shared/apiClient";

// ── API shapes (tolerate camelCase + snake_case from the backend) ─────
interface ApiTrack {
  id?: number; track_id?: number; trackId?: number;
  name?: string;
}

interface ApiEvent {
  id?: number; event_id?: number; eventId?: number;
  name?: string;
  season?: string;
  year?: number;
  status?: string;
}

interface ApiTeamMember {
  userId?: number; user_id?: number;
  fullName?: string; full_name?: string;
  email?: string;
  role?: string; member_role?: string;
}

interface ApiTeam {
  id?: number; teamId?: number; team_id?: number;
  eventId?: number; event_id?: number;
  trackId?: number; track_id?: number;
  trackName?: string | null; track_name?: string | null;
  eventName?: string | null; event_name?: string | null;
  name?: string; teamName?: string; team_name?: string;
  description?: string | null;
  status?: string;
  members?: ApiTeamMember[];
}

// ── Normalized rows the table renders ─────────────────────────────────
interface MemberRow {
  userId: number;
  fullName: string;
  email: string;
  role: 'LEADER' | 'MEMBER';
}

interface TrackRow {
  trackId: number;
  name: string;
}

interface EventRow {
  eventId: number;
  name: string;
}

interface TeamRow {
  teamId: number;
  eventId: number;
  trackId: number;
  name: string;
  description: string | null;
  status: string;
  members: MemberRow[];
}

function normalizeEvent(item: ApiEvent): EventRow {
  const name = item.name ?? '';
  const suffix = [item.season, item.year].filter(Boolean).join(' ');
  return {
    eventId: item.id ?? item.eventId ?? item.event_id ?? 0,
    name: name || (suffix ? suffix : `Event ${item.id ?? item.eventId ?? item.event_id ?? ''}`),
  };
}

function normalizeTrack(item: ApiTrack): TrackRow {
  return {
    trackId: item.id ?? item.trackId ?? item.track_id ?? 0,
    name: item.name ?? '',
  };
}

function normalizeMember(item: ApiTeamMember): MemberRow {
  const role = (item.role ?? item.member_role ?? 'MEMBER').toUpperCase();
  return {
    userId: item.userId ?? item.user_id ?? 0,
    fullName: item.fullName ?? item.full_name ?? '',
    email: item.email ?? '',
    role: role === 'LEADER' ? 'LEADER' : 'MEMBER',
  };
}

function normalizeTeam(item: ApiTeam): TeamRow {
  return {
    teamId: item.id ?? item.teamId ?? item.team_id ?? 0,
    eventId: item.eventId ?? item.event_id ?? 0,
    trackId: item.trackId ?? item.track_id ?? 0,
    name: item.name ?? item.teamName ?? item.team_name ?? '',
    description: item.description ?? null,
    status: (item.status ?? 'PENDING').toUpperCase(),
    members: (item.members ?? []).map(normalizeMember),
  };
}

function statusBadge(status: string) {
  if (status === 'APPROVED') return <PixelBadge color="green">APPROVED</PixelBadge>;
  if (status === 'PENDING') return <PixelBadge color="yellow">PENDING</PixelBadge>;
  if (status === 'REJECTED') return <PixelBadge color="red">REJECTED</PixelBadge>;
  if (status === 'DISQUALIFIED') return <PixelBadge color="red">DISQUALIFIED</PixelBadge>;
  return <PixelBadge color="gray">{status}</PixelBadge>;
}

export function CoordTeamsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [selectedEventId, setSelectedEventId] = useState<number>(0);
  const [tracks, setTracks] = useState<TrackRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsError, setTeamsError] = useState<string | null>(null);

  const [filterTrack, setFilterTrack] = useState<number>(0);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [expandedTeamId, setExpandedTeamId] = useState<number | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<number | null>(null);

  // Load every event (any status) so the coordinator can browse teams
  // across all of them, not just the currently-active one.
  useEffect(() => {
    setEventsLoading(true);
    setEventsError(null);
    apiFetch<{ data: ApiEvent[] }>('/api/events')
      .then(res => {
        const rows = (res.data ?? []).map(normalizeEvent);
        setEvents(rows);
        if (rows.length > 0) setSelectedEventId(rows[0].eventId);
      })
      .catch(err => {
        setEventsError(err instanceof ApiError ? err.message : "Failed to load events.");
      })
      .finally(() => setEventsLoading(false));
  }, []);

  // Tracks and teams are both scoped per-event on the backend, so refetch
  // whenever the selected event changes.
  useEffect(() => {
    if (!selectedEventId) {
      setTracks([]);
      setTeams([]);
      return;
    }
    setTeamsLoading(true);
    setTeamsError(null);
    setExpandedTeamId(null);
    setFilterTrack(0);

    apiFetch<{ data: ApiTrack[] }>(`/api/events/${selectedEventId}/tracks`)
      .then(res => setTracks((res.data ?? []).map(normalizeTrack)))
      .catch(() => setTracks([]));

    apiFetch<{ data: ApiTeam[] }>(`/api/teams/event/${selectedEventId}`)
      .then(res => {
        setTeams((res.data ?? []).map(normalizeTeam));
      })
      .catch(err => {
        setTeamsError(err instanceof ApiError ? err.message : "Failed to load teams.");
      })
      .finally(() => setTeamsLoading(false));
  }, [selectedEventId]);

  const selectedEvent = useMemo(
    () => events.find(e => e.eventId === selectedEventId) ?? null,
    [events, selectedEventId],
  );

  const trackName = useMemo(() => {
    const map = new Map<number, string>();
    tracks.forEach(t => map.set(t.trackId, t.name));
    return (id: number) => map.get(id) ?? "—";
  }, [tracks]);

  const filtered = teams.filter(t => {
    if (filterTrack && t.trackId !== filterTrack) return false;
    if (filterStatus !== "ALL" && t.status !== filterStatus) return false;
    return true;
  });

  async function runAction(
    teamId: number,
    request: () => Promise<unknown>,
    nextStatus: string,
  ) {
    setActionError(null);
    setPendingAction(teamId);
    try {
      await request();
      setTeams(prev => prev.map(t => t.teamId === teamId ? { ...t, status: nextStatus } : t));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setPendingAction(null);
    }
  }

  function approve(id: number) {
    runAction(id, () => apiFetch(`/api/teams/${id}/approve`, { method: 'PUT' }), 'APPROVED');
  }

  function reject(id: number) {
    const reason = window.prompt("Reason for rejection?")?.trim() ?? "";
    if (!reason) return;
    runAction(
      id,
      () => apiFetch(`/api/teams/${id}/reject`, { method: 'PUT', body: JSON.stringify({ reason }) }),
      'REJECTED',
    );
  }

  function disqualify(id: number) {
    if (!window.confirm("Disqualify this team? This removes them from the competition.")) return;
    runAction(id, () => apiFetch(`/api/teams/${id}/disqualify`, { method: 'PUT' }), 'DISQUALIFIED');
  }

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800 }}>
          <GradientText>Teams</GradientText>
        </h1>
      </div>

      {(eventsError || actionError) && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "10px 14px" }}>
          ERROR: {eventsError ?? actionError}
        </div>
      )}

      {/* Filters */}
      <PixelCard style={{ padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(Number(e.target.value))}
            style={selectStyle}
            disabled={eventsLoading || events.length === 0}
          >
            {eventsLoading && <option value={0}>Loading events…</option>}
            {!eventsLoading && events.length === 0 && <option value={0}>No events</option>}
            {events.map(ev => <option key={ev.eventId} value={ev.eventId}>{ev.name}</option>)}
          </select>
          <select value={filterTrack} onChange={(e) => setFilterTrack(Number(e.target.value))} style={selectStyle}>
            <option value={0}>All Tracks</option>
            {tracks.map(t => <option key={t.trackId} value={t.trackId}>{t.name}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={selectStyle}>
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="DISQUALIFIED">Disqualified</option>
          </select>
        </div>
      </PixelCard>

      <PixelCard style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono', monospace" }}>
            <thead>
              <tr style={{ background: C.surface2, borderBottom: `1px solid ${C.border}` }}>
                {["Team", "Track", "Leader", "Members", "Status", "Actions"].map(h => (
                  <th key={h} style={{ color: C.green, fontSize: 10, letterSpacing: "0.12em", textAlign: "left", padding: "12px 14px", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teamsLoading && (
                <tr><td colSpan={6} style={{ padding: 20, color: C.textMuted, fontSize: 12, textAlign: "center" }}>Loading…</td></tr>
              )}
              {!teamsLoading && teamsError && (
                <tr><td colSpan={6} style={{ padding: 20, color: C.red, fontSize: 12, textAlign: "center" }}>{teamsError}</td></tr>
              )}
              {!teamsLoading && !teamsError && filtered.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 20, color: C.textMuted, fontSize: 12, textAlign: "center" }}>No teams</td></tr>
              )}
              {!teamsLoading && filtered.map((t, i) => {
                const leader = t.members.find(m => m.role === 'LEADER');
                const expanded = expandedTeamId === t.teamId;
                const busy = pendingAction === t.teamId;
                return (
                  <React.Fragment key={t.teamId}>
                    <tr onClick={() => setExpandedTeamId(expanded ? null : t.teamId)}
                      style={{ borderBottom: `1px solid rgba(34,197,94,0.06)`, background: i % 2 === 0 ? C.surface : C.surface2, cursor: "pointer" }}>
                      <td style={{ color: C.text, fontSize: 13, padding: "12px 14px" }}>{t.name}</td>
                      <td style={{ color: C.textMuted, fontSize: 12, padding: "12px 14px" }}>{trackName(t.trackId)}</td>
                      <td style={{ color: C.textMuted, fontSize: 12, padding: "12px 14px" }}>{leader?.fullName ?? "—"}</td>
                      <td style={{ color: C.textMuted, fontSize: 12, padding: "12px 14px" }}>{t.members.length}</td>
                      <td style={{ padding: "12px 14px" }}>{statusBadge(t.status)}</td>
                      <td style={{ padding: "12px 14px" }} onClick={(e) => e.stopPropagation()}>
                        {t.status === 'PENDING' && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <PixelButton size="sm" variant="cyber" disabled={busy} onClick={() => approve(t.teamId)}>APPROVE</PixelButton>
                            <PixelButton size="sm" variant="danger" disabled={busy} onClick={() => reject(t.teamId)}>REJECT</PixelButton>
                          </div>
                        )}
                        {t.status === 'APPROVED' && (
                          <PixelButton size="sm" variant="danger" disabled={busy} onClick={() => disqualify(t.teamId)}>DISQUALIFY</PixelButton>
                        )}
                      </td>
                    </tr>
                    {expanded && (
                      <tr>
                        <td colSpan={6} style={{ padding: 16, background: "rgba(34,197,94,0.04)" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                            <div>
                              <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.1em", marginBottom: 6 }}>MEMBERS</div>
                              {t.members.length === 0 && (
                                <div style={{ color: C.textMuted, fontSize: 11 }}>No members</div>
                              )}
                              {t.members.map(m => (
                                <div key={m.userId} style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "4px 0", display: "flex", alignItems: "center", gap: 8 }}>
                                  <span>{m.fullName}</span>
                                  <span style={{ color: C.textMuted, opacity: 0.7 }}>{m.email}</span>
                                  {m.role === 'LEADER' && <PixelBadge color="cyan">LEADER</PixelBadge>}
                                </div>
                              ))}
                            </div>
                            <div>
                              <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.1em", marginBottom: 6 }}>DETAILS</div>
                              <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "4px 0" }}>
                                Track: {trackName(t.trackId)}
                              </div>
                              <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "4px 0" }}>
                                Event: {selectedEvent?.name ?? "—"}
                              </div>
                              {t.description && (
                                <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "4px 0", lineHeight: 1.6 }}>
                                  {t.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </PixelCard>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "10px 12px",
  background: C.surface2,
  border: `1px solid ${C.border}`,
  color: C.text,
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 12,
  borderRadius: 0,
  outline: "none",
};
