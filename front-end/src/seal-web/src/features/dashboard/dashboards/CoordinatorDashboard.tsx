import { useNavigate } from "react-router";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  C, GradientText, PixelCard, PixelButton, PixelBadge, CyberStatCard, PixelProgress,
} from "@/shared/components/PixelComponents";
import {
  events, rounds, teams, submissions, accountApprovals,
} from "@/shared/mocks/mockData";

export function CoordinatorDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  if (!currentUser) return null;

  const activeEvents = events.filter(e => e.status === 'OPEN').length;
  const approvedTeams = teams.filter(t => t.status === 'APPROVED').length;
  const totalSubs = submissions.length;
  const pendingAccounts = accountApprovals.filter(a => a.status === 'PENDING').length;
  const pendingTeams = teams.filter(t => t.status === 'PENDING');
  const event = events[0];
  const eventRounds = rounds.filter(r => r.event_id === event?.event_id);
  const closedRounds = eventRounds.filter(r => r.status === 'CLOSED').length;

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <PixelCard glow gradient style={{ padding: 24 }}>
        <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 6 }}>
          // coordinator_console
        </div>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 800, lineHeight: 1.2 }}>
          <GradientText>Good day, {currentUser.full_name}</GradientText>
        </h1>
        <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginTop: 6 }}>
          System overview for hackathon coordination.
        </p>
      </PixelCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <CyberStatCard value={activeEvents} label="Active Events" accent="green" />
        <CyberStatCard value={approvedTeams} label="Approved Teams" accent="blue" />
        <CyberStatCard value={totalSubs} label="Submissions" accent="cyan" />
        <CyberStatCard value={pendingAccounts} label="Pending Approvals" accent="purple" />
      </div>

      {/* Pending items */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <PixelCard glow glowColor="purple" style={{ padding: 20 }}>
          <div style={{ color: C.purple, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 10 }}>
            // pending_account_approvals
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 800 }}>
              {pendingAccounts}
            </div>
            <PixelBadge color="yellow">PENDING</PixelBadge>
          </div>
          <PixelButton variant="secondary" onClick={() => navigate('/coordinator/accounts')}>
            REVIEW ACCOUNTS
          </PixelButton>
        </PixelCard>

        <PixelCard glow glowColor="cyan" style={{ padding: 20 }}>
          <div style={{ color: C.cyan, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 10 }}>
            // pending_team_approvals
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 800 }}>
              {pendingTeams.length}
            </div>
            <PixelBadge color="yellow">PENDING</PixelBadge>
          </div>
          <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginBottom: 12 }}>
            {pendingTeams.map(t => t.name).join(", ") || "—"}
          </div>
          <PixelButton variant="secondary" onClick={() => navigate('/coordinator/teams')}>
            REVIEW TEAMS
          </PixelButton>
        </PixelCard>
      </div>

      {/* Event overview */}
      {event && (
        <PixelCard style={{ padding: 20 }}>
          <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 12 }}>
            // event_overview
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700 }}>
              {event.name}
            </div>
            <PixelBadge color={event.status === 'OPEN' ? 'green' : event.status === 'DRAFT' ? 'gray' : 'red'}>
              {event.status}
            </PixelBadge>
          </div>
          <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginBottom: 12 }}>
            {eventRounds.length} rounds · {closedRounds} closed
          </div>
          <PixelProgress value={closedRounds} max={eventRounds.length} label="Round progress" gradient />
        </PixelCard>
      )}

      {/* Quick nav */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <QuickNav label="Events" onClick={() => navigate('/coordinator/events')} />
        <QuickNav label="Account Approvals" badge={pendingAccounts} onClick={() => navigate('/coordinator/accounts')} />
        <QuickNav label="Teams" onClick={() => navigate('/coordinator/teams')} />
        <QuickNav label="Scoring & Results" onClick={() => navigate('/coordinator/scoring')} />
      </div>
    </div>
  );
}

function QuickNav({ label, badge, onClick }: { label: string; badge?: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "16px 14px",
        background: C.surface,
        border: `1px solid ${C.border}`,
        textAlign: "left",
        cursor: "pointer",
        borderRadius: 0,
        fontFamily: "'JetBrains Mono', monospace",
        color: C.text,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        transition: "all 0.15s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = C.green;
        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 12px rgba(34,197,94,0.15)`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = C.border;
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
        {badge !== undefined && badge > 0 && <PixelBadge color="yellow">{badge}</PixelBadge>}
      </div>
      <span style={{ color: C.green, fontSize: 10, letterSpacing: "0.1em" }}>OPEN</span>
    </button>
  );
}
