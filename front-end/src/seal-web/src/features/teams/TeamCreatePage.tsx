import { useState } from "react";
import { useNavigate } from "react-router";
import {
  C, GradientText, PixelCard, PixelButton, PixelInput, PixelBadge,
} from "@/shared/components/PixelComponents";
import { events, tracks } from "@/shared/mocks/mockData";
import { useAuth } from "@/app/providers/AuthProvider";

export function TeamCreatePage() {
  const navigate = useNavigate();
  const { updateLeaderStatus } = useAuth();
  const openEvents = events.filter(e => e.status === 'OPEN');

  const [teamName, setTeamName] = useState("");
  const [eventId, setEventId] = useState<number>(openEvents[0]?.event_id ?? 0);
  const [trackId, setTrackId] = useState<number>(0);
  const [created, setCreated] = useState(false);

  const trackOptions = tracks.filter(t => t.event_id === eventId);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!teamName || !eventId || !trackId) return;
    updateLeaderStatus(true);
    setCreated(true);
  }

  if (created) {
    return (
      <div style={{ padding: 24, display: "flex", justifyContent: "center" }}>
        <PixelCard glow gradient style={{ padding: 32, maxWidth: 480, width: "100%", textAlign: "center" }}>
          <h2 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 800, lineHeight: 1.2 }}>
            <GradientText>Team Created!</GradientText>
          </h2>
          <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginTop: 12, marginBottom: 24 }}>
            Team created! Awaiting coordinator approval.
          </p>
          <PixelButton variant="cyber" onClick={() => navigate('/dashboard')}>
            GO TO DASHBOARD
          </PixelButton>
        </PixelCard>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 560 }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800 }}>
            <GradientText>Create Team</GradientText>
          </h1>
        </div>

        <PixelCard glow style={{ padding: 24 }}>
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <PixelInput
              label="Team Name"
              placeholder="e.g. ByteBuilders"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ color: C.greenMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Event
              </label>
              <select
                value={eventId}
                onChange={(e) => { setEventId(Number(e.target.value)); setTrackId(0); }}
                style={{
                  background: C.surface2, border: `1px solid ${C.border}`, color: C.text,
                  padding: "10px 12px", fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
                  borderRadius: 0, outline: "none",
                }}
              >
                <option value={0}>Select event...</option>
                {openEvents.map(ev => (
                  <option key={ev.event_id} value={ev.event_id}>{ev.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ color: C.greenMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Track
              </label>
              <select
                value={trackId}
                onChange={(e) => setTrackId(Number(e.target.value))}
                style={{
                  background: C.surface2, border: `1px solid ${C.border}`, color: C.text,
                  padding: "10px 12px", fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
                  borderRadius: 0, outline: "none",
                }}
              >
                <option value={0}>Select track...</option>
                {trackOptions.map(t => (
                  <option key={t.track_id} value={t.track_id}>{t.name}</option>
                ))}
              </select>
              {trackId > 0 && (
                <div style={{ marginTop: 4 }}>
                  <PixelBadge color="cyan">
                    Max teams: {tracks.find(t => t.track_id === trackId)?.max_teams}
                  </PixelBadge>
                </div>
              )}
            </div>

            <PixelButton type="submit" variant="cyber" size="lg" fullWidth>
              CREATE TEAM
            </PixelButton>
          </form>
        </PixelCard>
      </div>
    </div>
  );
}
