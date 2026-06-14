import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/app/providers/AuthProvider";
import { usePendingAccounts } from "@/app/providers/PendingAccountsProvider";
import {
  C, GradientText, PixelCard, PixelButton, PixelBadge, CyberStatCard, PixelProgress,
} from "@/shared/components/PixelComponents";
import {
  eventsApi, roundsApi, teamsApi, submissionsApi, ApiError,
  HackathonEvent, Team,
} from "@/shared/apiClient";

function pickDefaultEvent(events: HackathonEvent[]): HackathonEvent | null {
  if (events.length === 0) return null;
  return events.find(e => e.status === 'IN_PROGRESS')
    ?? events.find(e => e.status === 'OPEN')
    ?? events[events.length - 1];
}

export function CoordinatorDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { pendingCount } = usePendingAccounts();

  const [events, setEvents] = useState<HackathonEvent[]>([]);
  const [event, setEvent] = useState<HackathonEvent | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [roundCount, setRoundCount] = useState(0);
  const [closedRounds, setClosedRounds] = useState(0);
  const [totalSubs, setTotalSubs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    eventsApi.getAll()
      .then(res => {
        const evs = res.data ?? [];
        setEvents(evs);
        setEvent(pickDefaultEvent(evs));
      })
      .catch(err => setError(err instanceof ApiError ? err.message : "Failed to load events."));
  }, []);

  useEffect(() => {
    if (!event) { setTeams([]); setRoundCount(0); setClosedRounds(0); setTotalSubs(0); return; }
    const eventId = event.eventId;

    teamsApi.getByEvent(eventId).then(res => setTeams(res.data ?? [])).catch(() => setTeams([]));

    roundsApi.getAll(eventId)
      .then(res => {
        const rs = res.data ?? [];
        setRoundCount(rs.length);
        setClosedRounds(rs.filter(r => r.status === 'CLOSED' || r.status === 'COMPLETED').length);
        // Total submissions across the event = sum per round.
        return Promise.all(rs.map(r =>
          submissionsApi.getAllForRound(r.roundId).then(sr => (sr.data ?? []).length).catch(() => 0)));
      })
      .then(counts => setTotalSubs((counts ?? []).reduce((a, b) => a + b, 0)))
      .catch(() => { setRoundCount(0); setClosedRounds(0); setTotalSubs(0); });
  }, [event]);

  if (!currentUser) return null;

  const activeEvents = events.filter(e => e.status === 'OPEN' || e.status === 'IN_PROGRESS').length;
  const approvedTeams = teams.filter(t => t.status === 'APPROVED').length;
  const pendingTeams = teams.filter(t => t.status === 'PENDING');

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <PixelCard glow gradient style={{ padding: 24 }}>
        <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.15em", marginBottom: 6 }}>
          COORDINATOR CONSOLE
        </div>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 800, lineHeight: 1.2 }}>
          <GradientText>Good day, {currentUser.full_name}</GradientText>
        </h1>
        <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginTop: 6 }}>
          System overview for hackathon coordination.
        </p>
      </PixelCard>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "10px 14px" }}>
          ERROR: {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <CyberStatCard value={activeEvents} label="Active Events" accent="green" />
        <CyberStatCard value={approvedTeams} label="Approved Teams" accent="blue" />
        <CyberStatCard value={totalSubs} label="Submissions" accent="cyan" />
        <CyberStatCard value={pendingCount} label="Pending Approvals" accent="purple" />
      </div>

      {/* Pending items */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <PixelCard glow glowColor="purple" style={{ padding: 20 }}>
          <div style={{ color: C.purple, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.15em", marginBottom: 10 }}>
            PENDING ACCOUNT APPROVALS
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 800 }}>
              {pendingCount}
            </div>
            <PixelBadge color="yellow">PENDING</PixelBadge>
          </div>
          <PixelButton variant="secondary" onClick={() => navigate('/coordinator/accounts')}>
            REVIEW ACCOUNTS
          </PixelButton>
        </PixelCard>

        <PixelCard glow glowColor="cyan" style={{ padding: 20 }}>
          <div style={{ color: C.cyan, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.15em", marginBottom: 10 }}>
            PENDING TEAM APPROVALS
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
          <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.15em", marginBottom: 12 }}>
            EVENT OVERVIEW
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700 }}>
              {event.name}
            </div>
            <PixelBadge color={event.status === 'OPEN' || event.status === 'IN_PROGRESS' ? 'green' : event.status === 'DRAFT' ? 'gray' : 'red'}>
              {event.status}
            </PixelBadge>
          </div>
          <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginBottom: 12 }}>
            {roundCount} rounds · {closedRounds} closed
          </div>
          <PixelProgress value={closedRounds} max={roundCount || 1} label="Round progress" gradient />
        </PixelCard>
      )}

      {/* Quick nav */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <QuickNav label="Events" onClick={() => navigate('/coordinator/events')} />
        <QuickNav label="Account Approvals" badge={pendingCount} onClick={() => navigate('/coordinator/accounts')} />
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
