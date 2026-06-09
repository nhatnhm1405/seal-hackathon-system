import { useNavigate } from "react-router";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  C, GradientText, PixelCard, PixelButton, PixelBadge, CyberStatCard,
} from "@/shared/components/PixelComponents";
import { userEventRoles, tracks, teams } from "@/shared/mocks/mockData";

export function MentorDashboard() {
  const navigate = useNavigate();
  const { currentUser, currentEvent } = useAuth();
  if (!currentUser) return null;

  const myAssignments = userEventRoles.filter(r => r.user_id === currentUser.user_id && r.role_name === 'MENTOR');
  const myTrackIds = myAssignments.map(a => a.track_id).filter((id): id is number => id !== null);
  const allMyTracks = tracks.filter(t => myTrackIds.includes(t.track_id));
  const myTracks = currentEvent
    ? allMyTracks.filter(t => t.event_id === currentEvent.event_id)
    : allMyTracks;
  const myEventTrackIds = myTracks.map(t => t.track_id);
  const myTeams = teams.filter(t => myEventTrackIds.includes(t.track_id));

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <PixelCard glow gradient style={{ padding: 24 }}>
        <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 6 }}>
          // mentor_console
        </div>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 800, lineHeight: 1.2 }}>
          <GradientText>Good day, {currentUser.full_name}</GradientText>
        </h1>
        <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginTop: 6 }}>
          Guide and support teams across your assigned tracks.
        </p>
      </PixelCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <CyberStatCard value={myTracks.length} label="Assigned Tracks" accent="green" />
        <CyberStatCard value={myTeams.length} label="Teams" accent="blue" />
      </div>

      <PixelCard style={{ padding: 20 }}>
        <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 12 }}>
          // my_tracks
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {myTracks.length === 0 && (
            <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, padding: 16 }}>
              No tracks assigned yet.
            </div>
          )}
          {myTracks.map(track => {
            const trackTeams = teams.filter(t => t.track_id === track.track_id);
            return (
              <div key={track.track_id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 14px", background: C.surface2, border: `1px solid ${C.border}`,
              }}>
                <div>
                  <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600 }}>
                    {track.name}
                  </div>
                  <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginTop: 2 }}>
                    {track.description}
                  </div>
                </div>
                <PixelBadge color="blue">{trackTeams.length} TEAMS</PixelBadge>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 16 }}>
          <PixelButton variant="cyber" onClick={() => navigate('/mentor/tracks')}>VIEW MY TRACKS</PixelButton>
        </div>
      </PixelCard>
    </div>
  );
}
