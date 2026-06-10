import { useAuth } from "@/app/providers/AuthProvider";
import {
  C, GradientText, PixelCard, PixelBadge, CyberStatCard,
} from "@/shared/components/PixelComponents";
import {
  teams, tracks, events, rounds, submissions, rankings, auditLogs, users,
} from "@/shared/mocks/mockData";

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function TeamMemberDashboard() {
  const { currentUser } = useAuth();
  if (!currentUser) return null;

  const team = teams.find(t => t.team_id === currentUser.team_id);
  const track = team ? tracks.find(tr => tr.track_id === team.track_id) : null;
  const event = track ? events.find(e => e.event_id === track.event_id) : null;
  const activeRound = rounds.find(r => r.status === 'ACTIVE');
  const round2Submission = team ? submissions.find(s => s.team_id === team.team_id && s.round_id === 2) : null;
  const round1Rank = team ? rankings.find(r => r.team_id === team.team_id && r.round_id === 1) : null;
  const recentLogs = [...auditLogs].slice(-3).reverse();

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Welcome banner */}
      <PixelCard glow gradient style={{ padding: 24 }}>
        <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 6 }}>
          // welcome
        </div>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 800, lineHeight: 1.2 }}>
          <GradientText>Good day, {currentUser.full_name}</GradientText>
        </h1>
        <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginTop: 6 }}>
          You are logged in as team member of {team?.team_name ?? "—"}.
        </p>
      </PixelCard>

      {/* Team info card */}
      {team && (
        <PixelCard style={{ padding: 20 }}>
          <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 12 }}>
            // team_info
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
            <Info label="Team" value={team.team_name} />
            <Info label="Track" value={track?.track_name ?? "—"} />
            <Info label="Event" value={event?.event_name ?? "—"} />
            <Info label="Current Round" value={activeRound?.round_name ?? "—"} badge={activeRound?.status} />
          </div>
        </PixelCard>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <CyberStatCard
          value={round2Submission ? "Submitted" : "Pending"}
          label="Round 2 Submission"
          accent="green"
          sublabel={round2Submission ? `at ${fmtDate(round2Submission.submitted_at)}` : "Not submitted"}
        />
        <CyberStatCard
          value={round1Rank ? `#${round1Rank.position}` : "—"}
          label="Last Round Rank"
          accent="blue"
          sublabel={round1Rank ? `Score: ${round1Rank.total_score.toFixed(1)}` : "No data"}
        />
        <CyberStatCard
          value={activeRound ? fmtDate(activeRound.submission_deadline) : "—"}
          label="Next Deadline"
          accent="cyan"
          sublabel={activeRound?.round_name}
        />
      </div>

      {/* Activity feed */}
      <PixelCard style={{ padding: 20 }}>
        <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 12 }}>
          // activity_feed
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {recentLogs.map(log => {
            const actor = users.find(u => u.user_id === log.performed_by);
            return (
              <div key={log.log_id} style={{
                display: "flex",
                gap: 12,
                padding: "10px 12px",
                background: C.surface2,
                border: `1px solid ${C.border}`,
              }}>
                <div style={{ width: 6, height: 6, background: C.green, marginTop: 6, flexShrink: 0, boxShadow: `0 0 6px ${C.green}` }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                    {log.details}
                  </div>
                  <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, marginTop: 4 }}>
                    {actor?.full_name ?? "System"} · {new Date(log.created_at).toLocaleString("en-US")}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </PixelCard>
    </div>
  );
}

function Info({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return (
    <div>
      <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, display: "flex", gap: 8, alignItems: "center" }}>
        {value}
        {badge && <PixelBadge color={badge === 'ACTIVE' ? 'green' : badge === 'UPCOMING' ? 'yellow' : 'red'}>{badge}</PixelBadge>}
      </div>
    </div>
  );
}
