import { useState, useEffect } from "react";
import {
  C, GradientText, PixelCard, PixelBadge, PixelButton, PixelTabs,
} from "@/shared/components/PixelComponents";
import { assignmentsApi, ApiError, MentorAssignedTeam } from "@/shared/apiClient";

export function MentorTracksPage() {
  const [teams, setTeams] = useState<MentorAssignedTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTrack, setActiveTrack] = useState<string>("");
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    assignmentsApi.getMentorAssignments()
      .then(res => {
        const list = res.data?.teams ?? [];
        setTeams(list);
        setActiveTrack(list[0]?.trackName ?? "");
      })
      .catch(err => setError(err instanceof ApiError ? err.message : "Failed to load mentor assignments."))
      .finally(() => setLoading(false));
  }, []);

  const trackNames = [...new Set(teams.map(t => t.trackName))];
  const trackTeams = teams.filter(t => t.trackName === activeTrack);
  const selectedTeam = selectedTeamId != null ? teams.find(t => t.teamId === selectedTeamId) ?? null : null;

  if (loading) {
    return <div style={{ padding: 24 }}><PixelCard style={{ padding: 32, textAlign: "center" }}>
      <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>Loading...</p>
    </PixelCard></div>;
  }

  if (error) {
    return <div style={{ padding: 24 }}>
      <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "10px 14px" }}>ERROR: {error}</div>
    </div>;
  }

  if (trackNames.length === 0) {
    return <div style={{ padding: 24 }}><PixelCard style={{ padding: 32, textAlign: "center" }}>
      <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>No tracks assigned to you.</p>
    </PixelCard></div>;
  }

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800 }}>
          <GradientText>My Tracks</GradientText>
        </h1>
      </div>

      <PixelTabs
        tabs={trackNames.map(t => ({ id: t, label: t }))}
        active={activeTrack}
        onChange={(id) => { setActiveTrack(id); setSelectedTeamId(null); }}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Team list */}
        <PixelCard style={{ padding: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {trackTeams.length === 0 && (
              <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>No teams in this track.</div>
            )}
            {trackTeams.map(team => {
              const active = selectedTeamId === team.teamId;
              return (
                <button key={team.teamId} onClick={() => setSelectedTeamId(team.teamId)}
                  style={{
                    background: active ? "rgba(34,197,94,0.1)" : C.surface2,
                    border: active ? `1px solid ${C.green}` : `1px solid ${C.border}`,
                    padding: "12px 14px", textAlign: "left", cursor: "pointer", borderRadius: 0,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    fontFamily: "'JetBrains Mono', monospace", color: C.text,
                  }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{team.teamName}</div>
                    <div style={{ color: C.textMuted, fontSize: 11, marginTop: 4 }}>{team.members.length} members</div>
                  </div>
                  <PixelBadge color="blue">{team.members.length}</PixelBadge>
                </button>
              );
            })}
          </div>
        </PixelCard>

        {/* Team detail */}
        <PixelCard glow glowColor="blue" style={{ padding: 18 }}>
          {!selectedTeam ? (
            <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>Select a team to view details.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700 }}>
                {selectedTeam.teamName}
              </div>
              <div>
                <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.1em", marginBottom: 6 }}>MEMBERS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {selectedTeam.members.map(m => (
                    <div key={m.userId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: C.surface2, border: `1px solid ${C.border}` }}>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                          {m.fullName}{m.memberRole === 'LEADER' ? " (Leader)" : ""}
                        </span>
                        <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.email}</div>
                      </div>
                      <PixelBadge color={m.memberRole === 'LEADER' ? 'green' : 'gray'}>{m.memberRole}</PixelBadge>
                    </div>
                  ))}
                </div>
              </div>
              {/* Submission view + mentor feedback need a backend endpoint mentors can call (deferred). */}
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                  Submission view & feedback coming soon.
                </span>
                <PixelButton variant="secondary" size="sm" disabled>ADD FEEDBACK</PixelButton>
              </div>
            </div>
          )}
        </PixelCard>
      </div>
    </div>
  );
}
