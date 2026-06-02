import { useNavigate } from "react-router";
import { useAuth } from "../../../../../app/providers/AuthContext";
import {
    C, GradientText, PixelButton, PixelBadge, PixelCard, CyberStatCard,
} from "../../../../../shared/components/PixelComponents";
import {
    teams, tracks, events, rounds, submissions, roundResults, auditLogs, users,
} from "../../../../../shared/mocks/mockData";
import { fmtDate } from "../utils/formatters";

function InfoRow({ label, value, badge }: { label: string; value: string; badge?: string }) {
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

export function ExistingTeamDashboard({ is_leader, team_id }: { is_leader: boolean; team_id: number }) {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    if (!currentUser) return null;

    const team = teams.find(t => t.team_id === team_id);
    const track = team ? tracks.find(tr => tr.track_id === team.track_id) : null;
    const event = track ? events.find(e => e.event_id === track.event_id) : null;
    const activeRound = rounds.find(r => r.status === 'ACTIVE');
    const latestSub = team ? submissions.find(s => s.team_id === team.team_id && s.round_id === 2) : null;
    const round1Rank = team ? roundResults.find(r => r.team_id === team.team_id && r.round_id === 1) : null;
    const recentLogs = [...auditLogs].slice(-3).reverse();

    return (
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
            <PixelCard glow gradient style={{ padding: 24 }}>
                <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 6 }}>
                    {is_leader ? '// team_leader_console' : '// participant_console'}
                </div>
                <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 800, lineHeight: 1.2 }}>
                    <GradientText>Good day, {currentUser.full_name}</GradientText>
                </h1>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 10 }}>
                    <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                        {is_leader ? `Leading` : `Member of`} {team?.name ?? "—"}
                    </span>
                    {team && <PixelBadge color={team.status === 'APPROVED' ? 'green' : team.status === 'PENDING' ? 'yellow' : 'red'}>{team.status}</PixelBadge>}
                    <PixelBadge color={is_leader ? 'cyan' : 'blue'}>{is_leader ? 'LEADER' : 'MEMBER'}</PixelBadge>
                </div>
            </PixelCard>

            {is_leader && team && (
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <PixelButton variant="cyber" onClick={() => navigate('/team/manage')}>MANAGE TEAM</PixelButton>
                    {team.status === 'APPROVED' && (
                        <PixelButton variant="secondary" onClick={() => navigate('/team/submit')}>SUBMIT PROJECT</PixelButton>
                    )}
                </div>
            )}

            {team && (
                <PixelCard style={{ padding: 20 }}>
                    <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 12 }}>
                        // team_info
                    </div>
                    {team.status === 'PENDING' && (
                        <div style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.35)", color: "#eab308", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "8px 12px", marginBottom: 12 }}>
                            PENDING COORDINATOR APPROVAL — You cannot submit until approved.
                        </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
                        <InfoRow label="Team" value={team.name} />
                        <InfoRow label="Track" value={track?.name ?? "—"} />
                        <InfoRow label="Event" value={event?.name ?? "—"} />
                        <InfoRow label="Current Round" value={activeRound?.name ?? "—"} badge={activeRound?.status} />
                    </div>
                </PixelCard>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                <CyberStatCard
                    value={latestSub ? "Submitted" : "Pending"}
                    label="Round 2 Submission"
                    accent="green"
                    sublabel={latestSub ? `at ${fmtDate(latestSub.submitted_at)}` : "Not submitted yet"}
                />
                <CyberStatCard
                    value={round1Rank ? `#${round1Rank.rank_position}` : "—"}
                    label="Last Round Rank"
                    accent="blue"
                    sublabel={round1Rank ? `Score: ${round1Rank.total_score.toFixed(1)}` : "No data"}
                />
                <CyberStatCard
                    value={activeRound ? fmtDate(activeRound.submission_deadline) : "—"}
                    label="Next Deadline"
                    accent="cyan"
                    sublabel={activeRound?.name}
                />
            </div>

            <PixelCard style={{ padding: 20 }}>
                <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 12 }}>
                    // activity_feed
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {recentLogs.map(log => {
                        const actor = users.find(u => u.user_id === log.actor_user_id);
                        return (
                            <div key={log.log_id} style={{
                                display: "flex", gap: 12, padding: "10px 12px",
                                background: C.surface2, border: `1px solid ${C.border}`,
                            }}>
                                <div style={{ width: 6, height: 6, background: C.green, marginTop: 6, flexShrink: 0, boxShadow: `0 0 6px ${C.green}` }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{log.action}</div>
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