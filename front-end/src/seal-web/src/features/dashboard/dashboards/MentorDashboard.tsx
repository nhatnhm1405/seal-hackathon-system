import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  C, GradientText, PixelCard, PixelButton, PixelBadge, CyberStatCard,
} from "@/shared/components/PixelComponents";
import { assignmentsApi, ApiError, MentorAssignedTeam } from "@/shared/apiClient";

export function MentorDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [eventName, setEventName] = useState("");
  const [teams, setTeams] = useState<MentorAssignedTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    assignmentsApi.getMentorAssignments()
      .then(res => {
        setEventName(res.data?.eventName ?? "");
        setTeams(res.data?.teams ?? []);
      })
      .catch(err => setError(err instanceof ApiError ? err.message : "Failed to load mentor assignments."))
      .finally(() => setLoading(false));
  }, []);

  if (!currentUser) return null;

  // Group assigned teams by track.
  const byTrack = new Map<string, MentorAssignedTeam[]>();
  teams.forEach(t => { const a = byTrack.get(t.trackName) ?? []; a.push(t); byTrack.set(t.trackName, a); });

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <PixelCard glow gradient style={{ padding: 24 }}>
        <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
          Mentor Console
        </div>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 800, lineHeight: 1.2 }}>
          <GradientText>Good day, {currentUser.full_name}</GradientText>
        </h1>
        <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginTop: 6 }}>
          {eventName ? <>Supporting teams in <span style={{ color: C.text }}>{eventName}</span>.</> : "Guide and support teams across your assigned tracks."}
        </p>
      </PixelCard>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "10px 14px" }}>
          ERROR: {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <CyberStatCard value={byTrack.size} label="Assigned Tracks" accent="green" />
        <CyberStatCard value={teams.length} label="Teams" accent="blue" />
      </div>

      <PixelCard style={{ padding: 20 }}>
        <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
          My Tracks
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {loading && <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, padding: 8 }}>Loading...</div>}
          {!loading && byTrack.size === 0 && !error && (
            <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, padding: 16 }}>
              No tracks assigned yet.
            </div>
          )}
          {[...byTrack.entries()].map(([trackName, trackTeams]) => (
            <div key={trackName} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: C.surface2, border: `1px solid ${C.border}` }}>
              <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600 }}>{trackName}</div>
              <PixelBadge color="blue">{trackTeams.length} TEAMS</PixelBadge>
            </div>
          ))}
        </div>
        {byTrack.size > 0 && (
          <div style={{ marginTop: 16 }}>
            <PixelButton variant="cyber" onClick={() => navigate('/mentor/tracks')}>VIEW MY TRACKS</PixelButton>
          </div>
        )}
      </PixelCard>
    </div>
  );
}
