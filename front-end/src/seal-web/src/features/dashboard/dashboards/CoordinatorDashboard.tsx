import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/app/providers/AuthProvider";
import { usePendingAccounts } from "@/app/providers/PendingAccountsProvider";
import {
  C, GradientText, PixelCard, PixelButton, PixelBadge, CyberStatCard, PixelProgress,
} from "@/shared/components/PixelComponents";
import { AnnouncementComposerModal } from "@/shared/components/AnnouncementComposerModal";
import {
  eventsApi, roundsApi, teamsApi, submissionsApi, announcementsApi, ApiError,
  HackathonEvent, Team, AnnouncementItem,
} from "@/shared/apiClient";

function audienceLabel(a?: string | null): string {
  if (a === "JUDGE") return "Judges";
  if (a === "MENTOR") return "Mentors";
  if (a === "PARTICIPANT") return "Participants";
  if (a === "ALL") return "Everyone";
  return a ?? "—";
}

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

  const [composerOpen, setComposerOpen] = useState(false);
  const [annHistory, setAnnHistory] = useState<AnnouncementItem[]>([]);
  const [audience, setAudience] = useState("PARTICIPANT");
  // Which event the announcement targets (coordinator can change it in the composer).
  const [announceEventId, setAnnounceEventId] = useState<number | null>(null);

  const loadAnnHistory = useCallback(() => {
    announcementsApi.listCoordinator()
      .then(res => setAnnHistory(res.data ?? []))
      .catch(() => { /* non-blocking */ });
  }, []);

  useEffect(() => {
    eventsApi.getAll()
      .then(res => {
        const evs = res.data ?? [];
        setEvents(evs);
        setEvent(pickDefaultEvent(evs));
      })
      .catch(err => setError(err instanceof ApiError ? err.message : "Failed to load events."));
    loadAnnHistory();
  }, [loadAnnHistory]);

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
  // Event the announce composer targets — the dropdown choice, falling back to the
  // overview event when the coordinator hasn't picked one yet.
  const announceEvent = events.find(e => e.eventId === announceEventId) ?? event;

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <PixelCard glow gradient style={{ padding: 24 }}>
        <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.15em", marginBottom: 6 }}>
          COORDINATOR CONSOLE
        </div>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 800, lineHeight: 1.2 }}>
          <GradientText>Good day, {currentUser.full_name}</GradientText>
        </h1>
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

      {/* Announcements */}
      <PixelCard style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
          <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.15em" }}>
            ANNOUNCEMENTS
          </div>
          <PixelButton
            variant="cyber"
            onClick={() => setComposerOpen(true)}
            disabled={!event}
          >
            ANNOUNCE TO EVENT
          </PixelButton>
        </div>
        {!event ? (
          <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>Select an event first.</div>
        ) : annHistory.length === 0 ? (
          <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
            No announcements sent yet. Broadcast updates to all participants of <span style={{ color: C.text }}>{event.name}</span>.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {annHistory.map(a => (
              <div key={a.announcementId} style={{ padding: "10px 12px", background: C.surface2, border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <span style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700 }}>{a.title}</span>
                  <span style={{ color: C.textDim, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, whiteSpace: "nowrap" }}>
                    {new Date(a.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, lineHeight: 1.6, marginTop: 4, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{a.content}</div>
                <div style={{ color: C.textDim, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, marginTop: 6 }}>
                  {audienceLabel(a.audience)} · {a.scopeLabel} · sent to {a.recipientCount} recipient(s)
                </div>
              </div>
            ))}
          </div>
        )}
      </PixelCard>

      {announceEvent && (
        <AnnouncementComposerModal
          open={composerOpen}
          scopeLabel={announceEvent.name}
          audienceHint="approved & active members of this event"
          events={events.map(e => ({ value: e.eventId, label: `${e.name} (${e.status})` }))}
          eventId={announceEvent.eventId}
          onEventChange={setAnnounceEventId}
          audiences={[
            { value: "PARTICIPANT", label: "Participants" },
            { value: "JUDGE", label: "Judges" },
            { value: "MENTOR", label: "Mentors" },
            { value: "ALL", label: "Everyone" },
          ]}
          audience={audience}
          onAudienceChange={setAudience}
          onSend={(title, content, linkUrl) =>
            announcementsApi.createCoordinator({ eventId: announceEvent.eventId, audience, title, content, linkUrl })
              .then(res => res.data?.recipientCount ?? 0)}
          onSent={loadAnnHistory}
          onClose={() => setComposerOpen(false)}
        />
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
