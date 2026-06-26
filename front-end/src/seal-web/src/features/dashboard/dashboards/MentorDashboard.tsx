import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  C, GradientText, PixelCard, PixelButton, PixelBadge, CyberStatCard,
} from "@/shared/components/PixelComponents";
import { assignmentsApi, eventsApi, roundsApi, ApiError, MentorAssignedTeam } from "@/shared/apiClient";
import { useRoundTimer } from "@/shared/hooks/useRoundTimer";
import { CountdownDisplay } from "@/shared/components/CountdownDisplay";

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

      <MentorContestTimer eventName={eventName} />

      {error && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "10px 14px" }}>
          ERROR: {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <CyberStatCard value={byTrack.size} label="Assigned Tracks" accent="green" />
        <CyberStatCard value={teams.length} label="Teams" accent="blue" />
        <CyberStatCard
          value={`${teams.filter(t => t.submissionCount > 0).length}/${teams.length}`}
          label="Teams Submitted"
          accent="cyan"
        />
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

// Read-only CONTEST countdown for a mentor: resolves their event (by name, else
// the IN_PROGRESS one) → its ACTIVE round → the live timer. Mentors aren't in the
// server fan-out, so they get milestone banners but no bell entries. Renders
// nothing until a timer is actually configured for the active round.
function MentorContestTimer({ eventName }: { eventName: string }) {
  const [eventId, setEventId] = useState<number | null>(null);
  const [roundId, setRoundId] = useState<number | null>(null);

  useEffect(() => {
    if (!eventName) { setEventId(null); setRoundId(null); return; }
    let active = true;
    (async () => {
      try {
        const events = (await eventsApi.getAll()).data ?? [];
        const ev = events.find(e => e.name === eventName)
          ?? events.find(e => e.status === "IN_PROGRESS")
          ?? null;
        if (!ev) { if (active) { setEventId(null); setRoundId(null); } return; }
        const rs = (await roundsApi.getAll(ev.eventId)).data ?? [];
        const activeRound = rs.find(r => (r.status ?? "").toUpperCase() === "ACTIVE")
          ?? [...rs].sort((a, b) => (a.orderNumber ?? 0) - (b.orderNumber ?? 0))[0]
          ?? null;
        if (active) { setEventId(ev.eventId); setRoundId(activeRound?.roundId ?? null); }
      } catch {
        if (active) { setEventId(null); setRoundId(null); }
      }
    })();
    return () => { active = false; };
  }, [eventName]);

  const timer = useRoundTimer(eventId, roundId, "CONTEST", { fireBanners: true });
  if (!timer.isConfigured) return null;

  return (
    <PixelCard glow glowColor="cyan" style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ color: C.cyan, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700 }}>Contest time remaining</div>
          <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginTop: 4 }}>
            Time left for your teams to submit in the current round.
          </div>
        </div>
        <CountdownDisplay remainingSeconds={timer.remainingSeconds} status={timer.status} icon />
      </div>
    </PixelCard>
  );
}
