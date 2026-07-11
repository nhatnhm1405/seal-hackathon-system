import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  C, GradientText, PixelCard, PixelBadge, PixelButton,
} from "@/shared/components/PixelComponents";
import { AnnouncementComposerModal } from "@/shared/components/AnnouncementComposerModal";
import { assignmentsApi, announcementsApi, ApiError, MentorAssignedTeam, MentorAssignedTrack, AnnouncementItem } from "@/shared/apiClient";

const mono = "'JetBrains Mono', monospace";

function fmtDateTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** One event the mentor is assigned to, derived from the flat team list. */
interface MentorEvent {
  eventId: number;
  eventName: string;
  season?: string;
  year?: number;
  eventStatus?: string;
}

/** Fields every event-bearing row (track or team) shares. */
type EventBearing = { eventId: number; eventName: string; season?: string; year?: number; eventStatus?: string };

/** Distinct events across the mentor's assigned rows, newest-ish first. */
function deriveEvents(rows: EventBearing[]): MentorEvent[] {
  const map = new Map<number, MentorEvent>();
  rows.forEach(r => {
    if (!map.has(r.eventId)) {
      map.set(r.eventId, {
        eventId: r.eventId, eventName: r.eventName,
        season: r.season, year: r.year, eventStatus: r.eventStatus,
      });
    }
  });
  return [...map.values()].sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || b.eventId - a.eventId);
}

/** Default to the event the mentor is most likely working on right now. */
function pickDefaultEvent(events: MentorEvent[]): number | null {
  if (events.length === 0) return null;
  const up = (s?: string) => (s ?? "").toUpperCase();
  const active = events.find(e => up(e.eventStatus) === "IN_PROGRESS")
    ?? events.find(e => up(e.eventStatus) === "OPEN");
  return (active ?? events[0]).eventId;
}

/** Badge "đã nộp / chưa nộp" cho 1 team. */
function SubmissionBadge({ team }: { team: MentorAssignedTeam }) {
  return team.submissionCount > 0
    ? <PixelBadge color="green">SUBMITTED</PixelBadge>
    : <PixelBadge color="orange">NOT SUBMITTED</PixelBadge>;
}

/** Vòng team đang tham gia — hoặc "đã bị loại" tại vòng đó. */
function RoundStatus({ team }: { team: MentorAssignedTeam }) {
  if (!team.currentRoundName) return <span style={{ color: C.textDim, fontFamily: mono, fontSize: 11 }}>—</span>;
  if (team.eliminated) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <PixelBadge color="red">ELIMINATED</PixelBadge>
        <span style={{ color: C.textDim, fontFamily: mono, fontSize: 10 }}>{team.currentRoundName}</span>
      </span>
    );
  }
  return <PixelBadge color="cyan">{team.currentRoundName}</PixelBadge>;
}

export function MentorTracksPage() {
  const [teams, setTeams] = useState<MentorAssignedTeam[]>([]);
  const [tracks, setTracks] = useState<MentorAssignedTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [expandedTeamId, setExpandedTeamId] = useState<number | null>(null);

  // The track whose announcement composer is currently open (null = closed).
  const [composerTrack, setComposerTrack] = useState<{ trackId: number; trackName: string; teamCount: number } | null>(null);
  const [history, setHistory] = useState<AnnouncementItem[]>([]);

  const loadHistory = useCallback(() => {
    announcementsApi.listMentor()
      .then(res => setHistory(res.data ?? []))
      .catch(() => { /* non-blocking */ });
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    assignmentsApi.getMentorAssignments()
      .then(res => {
        setTeams(res.data?.teams ?? []);
        setTracks(res.data?.tracks ?? []);
      })
      .catch(err => setError(err instanceof ApiError ? err.message : "Failed to load mentor assignments."))
      .finally(() => setLoading(false));
    loadHistory();
  }, [loadHistory]);

  // All assigned tracks (incl. empty ones). Fall back to synthesising them from
  // the team list if an older backend doesn't return the `tracks` field.
  const assignedTracks = useMemo<MentorAssignedTrack[]>(() => {
    if (tracks.length > 0) return tracks;
    const map = new Map<number, MentorAssignedTrack>();
    teams.forEach(t => {
      if (!map.has(t.trackId)) {
        map.set(t.trackId, {
          trackId: t.trackId, trackName: t.trackName,
          eventId: t.eventId, eventName: t.eventName,
          season: t.season, year: t.year, eventStatus: t.eventStatus,
        });
      }
    });
    return [...map.values()];
  }, [tracks, teams]);

  // Events come from the assigned tracks, so an event whose track has no approved
  // team yet still shows up in the dropdown.
  const events = useMemo(() => deriveEvents(assignedTracks), [assignedTracks]);

  // Pick a sensible default event once assignments arrive.
  useEffect(() => {
    if (selectedEventId == null && events.length > 0) {
      setSelectedEventId(pickDefaultEvent(events));
    }
  }, [events, selectedEventId]);

  // Tracks in the selected event, each with its (possibly empty) team list.
  const trackGroups = useMemo(() => {
    if (selectedEventId == null) return [];
    return assignedTracks
      .filter(tr => tr.eventId === selectedEventId)
      .map(tr => ({
        trackId: tr.trackId,
        trackName: tr.trackName,
        teams: teams.filter(t => t.trackId === tr.trackId),
      }));
  }, [assignedTracks, teams, selectedEventId]);

  function switchEvent(id: number) {
    setSelectedEventId(id);
    setExpandedTeamId(null);
  }

  if (loading) {
    return <div style={{ padding: 24 }}><PixelCard style={{ padding: 32, textAlign: "center" }}>
      <p style={{ color: C.textMuted, fontFamily: mono, fontSize: 13 }}>Loading...</p>
    </PixelCard></div>;
  }

  if (error) {
    return <div style={{ padding: 24 }}>
      <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: mono, fontSize: 11, padding: "10px 14px" }}>ERROR: {error}</div>
    </div>;
  }

  if (events.length === 0) {
    return <div style={{ padding: 24 }}><PixelCard style={{ padding: 32, textAlign: "center" }}>
      <p style={{ color: C.textMuted, fontFamily: mono, fontSize: 13 }}>No tracks assigned to you.</p>
    </PixelCard></div>;
  }

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontFamily: mono, fontSize: 28, fontWeight: 800 }}>
          <GradientText>My Tracks</GradientText>
        </h1>
        <div>
          <label style={{ color: C.greenMuted, fontFamily: mono, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>Event</label>
          <select
            value={selectedEventId ?? 0}
            onChange={e => switchEvent(Number(e.target.value))}
            style={{ marginTop: 6, padding: "10px 12px", background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontFamily: mono, fontSize: 12, width: 260, display: "block", outline: "none", borderRadius: 0 }}
          >
            {events.map(ev => (
              <option key={ev.eventId} value={ev.eventId}>
                {ev.eventName}{ev.eventStatus ? ` · ${ev.eventStatus}` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {trackGroups.length === 0 && (
        <PixelCard style={{ padding: 28, textAlign: "center" }}>
          <p style={{ color: C.textMuted, fontFamily: mono, fontSize: 13 }}>No tracks assigned to you in this event.</p>
        </PixelCard>
      )}

      {trackGroups.map(group => (
        <TrackSection
          key={group.trackId}
          trackName={group.trackName}
          teams={group.teams}
          history={history}
          expandedTeamId={expandedTeamId}
          onToggleTeam={id => setExpandedTeamId(prev => prev === id ? null : id)}
          onAnnounce={() => setComposerTrack({ trackId: group.trackId, trackName: group.trackName, teamCount: group.teams.length })}
        />
      ))}

      {composerTrack && (
        <AnnouncementComposerModal
          open
          scopeLabel={composerTrack.trackName}
          audienceHint={`${composerTrack.teamCount} team(s) in this track`}
          onSend={(title, content, linkUrl) =>
            announcementsApi.createMentor({ trackId: composerTrack.trackId, title, content, linkUrl })
              .then(res => res.data?.recipientCount ?? 0)}
          onSent={loadHistory}
          onClose={() => setComposerTrack(null)}
        />
      )}
    </div>
  );
}

/** One track: header + team table + this track's sent-announcement history. */
function TrackSection({
  trackName, teams, history, expandedTeamId, onToggleTeam, onAnnounce,
}: {
  trackName: string;
  teams: MentorAssignedTeam[];
  history: AnnouncementItem[];
  expandedTeamId: number | null;
  onToggleTeam: (id: number) => void;
  onAnnounce: () => void;
}) {
  const submittedCount = teams.filter(t => t.submissionCount > 0).length;
  const trackHistory = history.filter(h => h.scope === "TRACK" && h.scopeLabel === trackName);

  return (
    <PixelCard style={{ padding: 0, overflow: "hidden" }}>
      {/* Section header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "16px 18px", borderBottom: `1px solid ${C.border}`, background: C.surface2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ color: C.text, fontFamily: mono, fontSize: 16, fontWeight: 700 }}>{trackName}</span>
          <PixelBadge color="blue">{teams.length} TEAM{teams.length === 1 ? "" : "S"}</PixelBadge>
          <span style={{ color: C.textMuted, fontFamily: mono, fontSize: 11 }}>{submittedCount}/{teams.length} submitted</span>
        </div>
        <PixelButton variant="cyber" disabled={teams.length === 0} onClick={onAnnounce}>
          ANNOUNCE TO {trackName}
        </PixelButton>
      </div>

      {/* Team table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: mono }}>
          <thead>
            <tr style={{ background: C.surface, borderBottom: `1px solid ${C.border}` }}>
              {["Team", "Leader", "Members", "Round", "Submission"].map(h => (
                <th key={h} style={{ color: C.green, fontSize: 10, letterSpacing: "0.12em", textAlign: "left", padding: "11px 16px", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teams.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 18, color: C.textMuted, fontSize: 12, textAlign: "center" }}>No teams in this track.</td></tr>
            )}
            {teams.map((team, i) => {
              const leader = team.members.find(m => m.memberRole === "LEADER");
              const expanded = expandedTeamId === team.teamId;
              return (
                <React.Fragment key={team.teamId}>
                  <tr
                    onClick={() => onToggleTeam(team.teamId)}
                    style={{ borderBottom: `1px solid rgba(34,197,94,0.06)`, background: i % 2 === 0 ? C.surface : C.surface2, cursor: "pointer" }}
                  >
                    <td style={{ color: C.text, fontSize: 13, padding: "12px 16px" }}>
                      <span style={{ color: C.textMuted, marginRight: 8 }}>{expanded ? "▾" : "▸"}</span>{team.teamName}
                    </td>
                    <td style={{ color: C.textMuted, fontSize: 12, padding: "12px 16px" }}>{leader?.fullName ?? "—"}</td>
                    <td style={{ color: C.textMuted, fontSize: 12, padding: "12px 16px" }}>{team.members.length}</td>
                    <td style={{ padding: "12px 16px" }}><RoundStatus team={team} /></td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <SubmissionBadge team={team} />
                        {team.submissionCount > 0 && team.lastSubmittedAt && (
                          <span style={{ color: C.textDim, fontSize: 10 }}>last {fmtDateTime(team.lastSubmittedAt)}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expanded && (
                    <tr>
                      <td colSpan={5} style={{ padding: 16, background: "rgba(34,197,94,0.04)" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                          {/* Members */}
                          <div>
                            <div style={{ color: C.green, fontFamily: mono, fontSize: 10, letterSpacing: "0.1em", marginBottom: 8 }}>MEMBERS</div>
                            {team.members.length === 0 && (
                              <div style={{ color: C.textMuted, fontSize: 11 }}>No members</div>
                            )}
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              {team.members.map(m => (
                                <div key={m.userId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "8px 10px", background: C.surface2, border: `1px solid ${C.border}` }}>
                                  <div style={{ minWidth: 0 }}>
                                    <span style={{ color: C.text, fontFamily: mono, fontSize: 12 }}>
                                      {m.fullName}{m.memberRole === "LEADER" ? " (Leader)" : ""}
                                    </span>
                                    <div style={{ color: C.textMuted, fontFamily: mono, fontSize: 10, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.email}</div>
                                  </div>
                                  <PixelBadge color={m.memberRole === "LEADER" ? "green" : "gray"}>{m.memberRole}</PixelBadge>
                                </div>
                              ))}
                            </div>
                          </div>
                          {/* Submission status */}
                          <div>
                            <div style={{ color: C.green, fontFamily: mono, fontSize: 10, letterSpacing: "0.1em", marginBottom: 8 }}>SUBMISSION STATUS</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                              <SubmissionBadge team={team} />
                            </div>
                            {team.submissionCount > 0 ? (
                              <div style={{ color: C.textMuted, fontFamily: mono, fontSize: 11, lineHeight: 1.7 }}>
                                {team.submissionCount} submission{team.submissionCount > 1 ? "s" : ""}
                                {team.lastSubmittedAt ? ` · last ${fmtDateTime(team.lastSubmittedAt)}` : ""}
                              </div>
                            ) : (
                              <div style={{ color: C.textMuted, fontFamily: mono, fontSize: 11, lineHeight: 1.7 }}>
                                This team has not submitted yet.
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

      {/* Sent announcements for this track */}
      <div style={{ padding: "14px 18px", borderTop: `1px solid ${C.border}` }}>
        <div style={{ color: C.green, fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 10 }}>
          SENT ANNOUNCEMENTS · {trackName}
        </div>
        {trackHistory.length === 0 ? (
          <div style={{ color: C.textMuted, fontFamily: mono, fontSize: 11 }}>
            No announcements sent to this track yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {trackHistory.map(a => (
              <div key={a.announcementId} style={{ padding: "10px 12px", background: C.surface2, border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <span style={{ color: C.text, fontFamily: mono, fontSize: 12, fontWeight: 700 }}>{a.title}</span>
                  <span style={{ color: C.textDim, fontFamily: mono, fontSize: 10, whiteSpace: "nowrap" }}>{fmtDateTime(a.createdAt)}</span>
                </div>
                <div style={{ color: C.textMuted, fontFamily: mono, fontSize: 11, lineHeight: 1.6, marginTop: 4, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{a.content}</div>
                <div style={{ color: C.textDim, fontFamily: mono, fontSize: 10, marginTop: 6 }}>Sent to {a.recipientCount} participant(s)</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PixelCard>
  );
}
