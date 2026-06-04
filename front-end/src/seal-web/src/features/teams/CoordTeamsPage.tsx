import React, { useState } from "react";
import {
  C, GradientText, PixelCard, PixelButton, PixelBadge,
} from "@/shared/components/PixelComponents";
import {
  teams as initialTeams, users, tracks, events, teamMembers, submissions, rounds, Team,
} from "@/shared/mocks/mockData";

export function CoordTeamsPage() {
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [filterEvent, setFilterEvent] = useState<number>(0);
  const [filterTrack, setFilterTrack] = useState<number>(0);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [expandedTeamId, setExpandedTeamId] = useState<number | null>(null);

  const filtered = teams.filter(t => {
    const track = tracks.find(tr => tr.track_id === t.track_id);
    if (filterEvent && track?.event_id !== filterEvent) return false;
    if (filterTrack && t.track_id !== filterTrack) return false;
    if (filterStatus !== "ALL" && t.status !== filterStatus) return false;
    return true;
  });

  function approve(id: number) {
    setTeams(prev => prev.map(t => t.team_id === id ? { ...t, status: 'APPROVED' } : t));
  }
  function reject(id: number) {
    setTeams(prev => prev.map(t => t.team_id === id ? { ...t, status: 'REJECTED' } : t));
  }
  function disqualify(id: number) {
    const reason = window.prompt("Reason for disqualification?") ?? "";
    if (!reason) return;
    setTeams(prev => prev.map(t => t.team_id === id ? { ...t, status: 'ELIMINATED' } : t));
  }

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800 }}>
          <GradientText>Teams</GradientText>
        </h1>
      </div>

      {/* Filters */}
      <PixelCard style={{ padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <select value={filterEvent} onChange={(e) => setFilterEvent(Number(e.target.value))} style={selectStyle}>
            <option value={0}>All Events</option>
            {events.map(ev => <option key={ev.event_id} value={ev.event_id}>{ev.event_name}</option>)}
          </select>
          <select value={filterTrack} onChange={(e) => setFilterTrack(Number(e.target.value))} style={selectStyle}>
            <option value={0}>All Tracks</option>
            {tracks.map(t => <option key={t.track_id} value={t.track_id}>{t.track_name}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={selectStyle}>
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="ELIMINATED">Eliminated</option>
          </select>
        </div>
      </PixelCard>

      <PixelCard style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono', monospace" }}>
            <thead>
              <tr style={{ background: C.surface2, borderBottom: `1px solid ${C.border}` }}>
                {["Team", "Track", "Event", "Leader", "Members", "Status", "Actions"].map(h => (
                  <th key={h} style={{ color: C.green, fontSize: 10, letterSpacing: "0.12em", textAlign: "left", padding: "12px 14px", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => {
                const track = tracks.find(tr => tr.track_id === t.track_id);
                const ev = track ? events.find(e => e.event_id === track.event_id) : null;
                const leader = users.find(u => u.user_id === t.leader_id);
                const mems = teamMembers.filter(m => m.team_id === t.team_id);
                const expanded = expandedTeamId === t.team_id;
                return (
                  <React.Fragment key={t.team_id}>
                    <tr onClick={() => setExpandedTeamId(expanded ? null : t.team_id)}
                      style={{ borderBottom: `1px solid rgba(34,197,94,0.06)`, background: i % 2 === 0 ? C.surface : C.surface2, cursor: "pointer" }}>
                      <td style={{ color: C.text, fontSize: 13, padding: "12px 14px" }}>{t.team_name}</td>
                      <td style={{ color: C.textMuted, fontSize: 12, padding: "12px 14px" }}>{track?.track_name}</td>
                      <td style={{ color: C.textMuted, fontSize: 12, padding: "12px 14px" }}>{ev?.event_name}</td>
                      <td style={{ color: C.textMuted, fontSize: 12, padding: "12px 14px" }}>{leader?.full_name}</td>
                      <td style={{ color: C.textMuted, fontSize: 12, padding: "12px 14px" }}>{mems.length}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <PixelBadge color={t.status === 'APPROVED' ? 'green' : t.status === 'PENDING' ? 'yellow' : 'red'}>{t.status}</PixelBadge>
                      </td>
                      <td style={{ padding: "12px 14px" }} onClick={(e) => e.stopPropagation()}>
                        {t.status === 'PENDING' && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <PixelButton size="sm" variant="cyber" onClick={() => approve(t.team_id)}>APPROVE</PixelButton>
                            <PixelButton size="sm" variant="danger" onClick={() => reject(t.team_id)}>REJECT</PixelButton>
                          </div>
                        )}
                        {t.status === 'APPROVED' && (
                          <PixelButton size="sm" variant="danger" onClick={() => disqualify(t.team_id)}>DISQUALIFY</PixelButton>
                        )}
                      </td>
                    </tr>
                    {expanded && (
                      <tr>
                        <td colSpan={7} style={{ padding: 16, background: "rgba(34,197,94,0.04)" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                            <div>
                              <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.1em", marginBottom: 6 }}>MEMBERS</div>
                              {mems.map(m => {
                                const u = users.find(uu => uu.user_id === m.user_id);
                                return (
                                  <div key={m.user_id} style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "4px 0" }}>
                                    {u?.full_name} {m.is_leader && <PixelBadge color="cyan">LEADER</PixelBadge>}
                                  </div>
                                );
                              })}
                            </div>
                            <div>
                              <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.1em", marginBottom: 6 }}>SUBMISSIONS</div>
                              {submissions.filter(s => s.team_id === t.team_id).map(s => {
                                const r = rounds.find(rr => rr.round_id === s.round_id);
                                return (
                                  <div key={s.submission_id} style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "4px 0" }}>
                                    {r?.round_name}: {s.repo_url}
                                  </div>
                                );
                              })}
                              {submissions.filter(s => s.team_id === t.team_id).length === 0 && (
                                <div style={{ color: C.textMuted, fontSize: 11 }}>No submissions</div>
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
