import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/app/providers/AuthProvider";
import {
    C, GradientText, PixelCard, PixelButton, PixelBadge, CyberStatCard,
} from "@/shared/components/PixelComponents";
import {
    teamsApi, tracksApi, roundsApi, submissionsApi, resultsApi, notificationsApi,
    MyTeam, Track, Round, RoundResult, Notification, ApiError,
} from "@/shared/apiClient";
import { fmtDate, roundStatusColor, teamStatusColor } from "../utils/formatters";

export function ExistingTeamDashboard() {
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const [team, setTeam] = useState<MyTeam | null>(null);
    const [tracks, setTracks] = useState<Track[]>([]);
    const [picking, setPicking] = useState(false);
    const [rounds, setRounds] = useState<Round[]>([]);
    const [submitted, setSubmitted] = useState<{ at?: string } | null>(null);
    const [subRoundName, setSubRoundName] = useState<string | null>(null);
    const [rank, setRank] = useState<RoundResult | null>(null);
    const [feed, setFeed] = useState<Notification[]>([]);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async () => {
        setError(null);
        notificationsApi.getAll().then(r => setFeed((r.data ?? []).slice(0, 5))).catch(() => setFeed([]));
        try {
            const t = (await teamsApi.getMy()).data;
            setTeam(t);
            if (t?.eventId == null) return;

            // SELF_SELECT during SETUP: load tracks so the leader can pick one.
            if (t.eventStatus === 'SETUP' && t.trackSelectionMode === 'SELF_SELECT') {
                tracksApi.getAll(t.eventId).then(r => setTracks(r.data ?? [])).catch(() => setTracks([]));
            }

            const rs = await roundsApi.getAll(t.eventId).then(r => r.data ?? []).catch(() => []);
            const sorted = [...rs].sort((a, b) => (a.orderNumber ?? a.roundId) - (b.orderNumber ?? b.roundId));
            setRounds(sorted);

            // Latest submission: use the active round, else the last round.
            const activeRound = sorted.find(r => ["ACTIVE", "OPEN", "IN_PROGRESS"].includes((r.status ?? "").toUpperCase()));
            const subRound = activeRound ?? sorted[sorted.length - 1];
            if (subRound) {
                setSubRoundName(subRound.name);
                submissionsApi.getMyForRound(subRound.roundId)
                    .then(r => setSubmitted({ at: r.data?.submittedAt }))
                    .catch(() => setSubmitted(null));
            }

            // Last round rank: most recent round with a published result for this team.
            for (let i = sorted.length - 1; i >= 0; i--) {
                try {
                    const res = await resultsApi.getPublished(t.eventId, sorted[i].roundId);
                    const mine = (res.data ?? []).find(rr => rr.teamId === t.teamId);
                    if (mine) { setRank(mine); break; }
                } catch { /* round not published yet */ }
            }
        } catch (err) {
            if (!(err instanceof ApiError && err.status === 404)) {
                setError(err instanceof ApiError ? err.message : "Failed to load your team.");
            }
        }
    }, []);

    useEffect(() => { reload(); }, [reload]);

    async function pickTrack(trackId: number) {
        if (!team || picking) return;
        setError(null);
        setPicking(true);
        try {
            await teamsApi.selectTrack(team.teamId, trackId);
            await reload();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to select track.");
        } finally {
            setPicking(false);
        }
    }

    if (!currentUser || !team) return null;

    const isLeader = team.myRole === 'LEADER' || currentUser.is_leader;
    const activeRound = rounds.find(r => ["ACTIVE", "OPEN", "IN_PROGRESS"].includes((r.status ?? "").toUpperCase()));
    const needsTrackPick = isLeader
        && team.eventStatus === 'SETUP'
        && team.trackSelectionMode === 'SELF_SELECT'
        && team.status === 'APPROVED'
        && !team.trackName;

    return (
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
            <PixelCard glow gradient style={{ padding: 24 }}>
                <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 6 }}>
                    {isLeader ? '// team_leader_console' : '// participant_console'}
                </div>
                <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 800, lineHeight: 1.2 }}>
                    <GradientText>Good day, {currentUser.full_name}</GradientText>
                </h1>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
                    <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                        {isLeader ? `Leading` : `Member of`} {team.name}
                    </span>
                    <PixelBadge color={teamStatusColor(team.status)}>{team.status ?? "—"}</PixelBadge>
                    <PixelBadge color={isLeader ? 'cyan' : 'blue'}>{isLeader ? 'LEADER' : 'MEMBER'}</PixelBadge>
                </div>
            </PixelCard>

            {error && (
                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "10px 14px" }}>ERROR: {error}</div>
            )}

            {/* Leader-only actions */}
            {isLeader && (
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <PixelButton variant="cyber" onClick={() => navigate('/team/view')}>MANAGE TEAM</PixelButton>
                    {team.status === 'APPROVED' && (
                        <PixelButton variant="secondary" onClick={() => navigate('/team/submit')}>SUBMIT PROJECT</PixelButton>
                    )}
                </div>
            )}

            {/* SELF_SELECT track picker — leader chooses the team's track during SETUP */}
            {needsTrackPick && (
                <PixelCard glow style={{ padding: 20 }}>
                    <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 8 }}>// select_your_track</div>
                    <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginBottom: 14, lineHeight: 1.5 }}>
                        Registration is closed. Pick your team's track below. If a track is full you'll be asked to choose another.
                    </p>
                    {tracks.length === 0 ? (
                        <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>Loading tracks…</p>
                    ) : (
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            {tracks.map(t => (
                                <PixelButton key={t.trackId} variant="secondary" disabled={picking} onClick={() => pickTrack(t.trackId)}>
                                    {t.name}{t.capacity != null ? ` · ${t.capacity} slots` : ""}
                                </PixelButton>
                            ))}
                        </div>
                    )}
                </PixelCard>
            )}

            {/* Team info */}
            <PixelCard style={{ padding: 20 }}>
                <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 12 }}>// team_info</div>
                {team.status === 'PENDING' && (
                    <div style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.35)", color: "#eab308", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "8px 12px", marginBottom: 12 }}>
                        PENDING COORDINATOR APPROVAL — You cannot submit until approved.
                    </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
                    <InfoRow label="Team" value={team.name} />
                    <InfoRow label="Track" value={team.trackName ?? "—"} />
                    <InfoRow label="Event" value={team.eventName ?? "—"} />
                    <InfoRow label="Current Round" value={activeRound?.name ?? "—"} badge={activeRound?.status} />
                </div>
            </PixelCard>

            {/* Stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                <CyberStatCard
                    value={submitted ? "Submitted" : "Pending"}
                    label={subRoundName ? `${subRoundName} Submission` : "Submission"}
                    accent="green"
                    sublabel={submitted?.at ? `at ${fmtDate(submitted.at)}` : "Not submitted yet"}
                />
                <CyberStatCard
                    value={rank ? `#${rank.rankPosition}` : "—"}
                    label="Last Round Rank"
                    accent="blue"
                    sublabel={rank ? `Score: ${rank.totalScore.toFixed(1)}` : "No data"}
                />
                <CyberStatCard
                    value={activeRound ? fmtDate(activeRound.submissionDeadline) : "—"}
                    label="Next Deadline"
                    accent="cyan"
                    sublabel={activeRound?.name ?? "No active round"}
                />
            </div>

            {/* Activity feed (from the user's notifications) */}
            <PixelCard style={{ padding: 20 }}>
                <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 12 }}>// activity_feed</div>
                {feed.length === 0 ? (
                    <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>No recent activity.</p>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {feed.map(n => (
                            <div key={n.notificationId} style={{ display: "flex", gap: 12, padding: "10px 12px", background: C.surface2, border: `1px solid ${C.border}` }}>
                                <div style={{ width: 6, height: 6, background: n.isRead ? C.textMuted : C.green, marginTop: 6, flexShrink: 0, boxShadow: n.isRead ? "none" : `0 0 6px ${C.green}` }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{n.title}{n.content ? ` — ${n.content}` : ""}</div>
                                    <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, marginTop: 4 }}>
                                        {new Date(n.createdAt).toLocaleString("en-US")}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </PixelCard>
        </div>
    );
}

function InfoRow({ label, value, badge }: { label: string; value: string; badge?: string }) {
    return (
        <div>
            <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
            <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {value}
                {badge && <PixelBadge color={roundStatusColor(badge)}>{badge}</PixelBadge>}
            </div>
        </div>
    );
}
