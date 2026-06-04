import { useState, useEffect } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  C, GradientText, PixelCard, PixelBadge, PixelTabs,
} from "@/shared/components/PixelComponents";
import {
  mentorAssignments, tracks, teams, teamMembers, users, submissions, rounds,
} from "@/shared/mocks/mockData";

export function MentorTracksPage() {
  const { currentUser, currentEvent } = useAuth();
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  if (!currentUser) return null;

  const myAssignments = mentorAssignments.filter(m => m.mentor_id === currentUser.user_id);
  const allMyTracks = tracks.filter(t => myAssignments.some(a => a.track_id === t.track_id));
  const myTracks = currentEvent
    ? allMyTracks.filter(t => t.event_id === currentEvent.event_id)
    : allMyTracks;

  const [activeTrackId, setActiveTrackId] = useState<number>(myTracks[0]?.track_id ?? 0);

  // Reset track/team selection when the user switches events
  useEffect(() => {
    setActiveTrackId(myTracks[0]?.track_id ?? 0);
    setSelectedTeamId(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEvent?.event_id]);

  if (myTracks.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <PixelCard style={{ padding: 32, textAlign: "center" }}>
          <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
            No tracks assigned to you.
          </p>
        </PixelCard>
      </div>
    );
  }

  const trackTeams = teams.filter(t => t.track_id === activeTrackId);
  const selectedTeam = selectedTeamId ? teams.find(t => t.team_id === selectedTeamId) : null;
  const selectedMembers = selectedTeam ? teamMembers.filter(m => m.team_id === selectedTeam.team_id) : [];
  const selectedSubs = selectedTeam ? submissions.filter(s => s.team_id === selectedTeam.team_id) : [];

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800 }}>
          <GradientText>My Tracks</GradientText>
        </h1>
      </div>

      <PixelTabs
        tabs={myTracks.map(t => ({ id: String(t.track_id), label: t.track_name }))}
        active={String(activeTrackId)}
        onChange={(id) => { setActiveTrackId(Number(id)); setSelectedTeamId(null); }}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Team list */}
        <PixelCard style={{ padding: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {trackTeams.map(team => {
              const memberCount = teamMembers.filter(m => m.team_id === team.team_id).length;
              const active = selectedTeamId === team.team_id;
              return (
                <button
                  key={team.team_id}
                  onClick={() => setSelectedTeamId(team.team_id)}
                  style={{
                    background: active ? "rgba(34,197,94,0.1)" : C.surface2,
                    border: active ? `1px solid ${C.green}` : `1px solid ${C.border}`,
                    padding: "12px 14px",
                    textAlign: "left",
                    cursor: "pointer",
                    borderRadius: 0,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontFamily: "'JetBrains Mono', monospace",
                    color: C.text,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{team.team_name}</div>
                    <div style={{ color: C.textMuted, fontSize: 11, marginTop: 4 }}>{memberCount} members</div>
                  </div>
                  <PixelBadge color={team.status === 'APPROVED' ? 'green' : team.status === 'PENDING' ? 'yellow' : 'red'}>
                    {team.status}
                  </PixelBadge>
                </button>
              );
            })}
          </div>
        </PixelCard>

        {/* Team detail */}
        <PixelCard glow glowColor="blue" style={{ padding: 18 }}>
          {!selectedTeam ? (
            <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
              Select a team to view details.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700 }}>
                  {selectedTeam.team_name}
                </div>
              </div>
              <div>
                <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.1em", marginBottom: 6 }}>
                  MEMBERS
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {selectedMembers.map(m => {
                    const u = users.find(uu => uu.user_id === m.user_id);
                    if (!u) return null;
                    return (
                      <div key={m.user_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: C.surface2, border: `1px solid ${C.border}` }}>
                        <span style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                          {u.full_name}{m.is_leader ? " (Leader)" : ""}
                        </span>
                        <PixelBadge color={u.student_type === 'FPT' ? 'green' : 'blue'}>
                          {u.student_type ?? "—"}
                        </PixelBadge>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.1em", marginBottom: 6 }}>
                  SUBMISSIONS
                </div>
                {selectedSubs.length === 0 ? (
                  <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                    No submissions yet
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {selectedSubs.map(s => {
                      const round = rounds.find(r => r.round_id === s.round_id);
                      return (
                        <div key={s.submission_id} style={{ padding: 10, background: C.surface2, border: `1px solid ${C.border}` }}>
                          <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                            {round?.round_name}
                          </div>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.textMuted, lineHeight: 1.8 }}>
                            <div>repo: {s.repo_url}</div>
                            <div>demo: {s.demo_url}</div>
                            <div>slides: {s.slide_url}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </PixelCard>
      </div>
    </div>
  );
}
