import { useState, useEffect, useCallback, ReactNode } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/app/providers/AuthProvider";
import { useNotifications } from "@/app/providers/NotificationProvider";
import {
    C, GradientText, PixelCard, PixelButton, PixelBadge, CyberStatCard,
} from "@/shared/components/PixelComponents";
import {
    teamsApi, tracksApi, roundsApi, submissionsApi, resultsApi, notificationsApi,
    MyTeam, Track, Round, RoundResult, Notification, ApiError, apiErrorMessage, participationRequestsApi,
} from "@/shared/apiClient";
import { ParticipantJourneyBar } from "@/shared/components/ParticipantJourneyBar";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { ParticipantProblemCard } from "./ParticipantProblemCard";
import { fmtDate, roundStatusColor, teamStatusColor } from "../utils/formatters";

export function ExistingTeamDashboard() {
    const navigate = useNavigate();
    const { currentUser, clearTeam } = useAuth();
    const { addToast } = useNotifications();

    const [team, setTeam] = useState<MyTeam | null>(null);
    const [tracks, setTracks] = useState<Track[]>([]);
    const [picking, setPicking] = useState(false);
    // Track the leader tapped, awaiting confirmation before it's committed.
    const [confirmTrack, setConfirmTrack] = useState<Track | null>(null);
    // Whether the "choose your track" picker modal is open.
    const [showTrackPicker, setShowTrackPicker] = useState(false);
    const [rounds, setRounds] = useState<Round[]>([]);
    const [submitted, setSubmitted] = useState<{ at?: string } | null>(null);
    const [subRoundName, setSubRoundName] = useState<string | null>(null);
    const [rank, setRank] = useState<RoundResult | null>(null);
    const [feed, setFeed] = useState<Notification[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [accessRequested, setAccessRequested] = useState(false);
    const [requestingAccess, setRequestingAccess] = useState(false);

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
            if (err instanceof ApiError && err.status === 404) {
                setTeam(null);
                clearTeam();
                addToast({ type: "info", title: "Team context updated", message: "Your current team membership has changed." });
            } else {
                setError(err instanceof ApiError ? err.message : "Failed to load your team.");
            }
        }
    }, [addToast, clearTeam]);

    useEffect(() => { reload(); }, [reload]);

    // Escape closes the track picker modal (never while a pick is in flight).
    useEffect(() => {
        if (!showTrackPicker) return;
        function onKey(e: KeyboardEvent) { if (e.key === "Escape" && !picking) setShowTrackPicker(false); }
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [showTrackPicker, picking]);

    async function pickTrack(trackId: number) {
        if (!team || picking) return;
        setError(null);
        setPicking(true);
        try {
            const picked = tracks.find(t => t.trackId === trackId);
            await teamsApi.selectTrack(team.teamId, trackId);
            setConfirmTrack(null);
            setShowTrackPicker(false);
            await reload();
            addToast({ type: "success", title: "Track selected", message: picked ? `Your team is now in the "${picked.name}" track.` : "Your team's track has been set." });
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to select track.");
            addToast({ type: "warning", title: "Track selection failed", message: apiErrorMessage(err, "Failed to select track.") });
        } finally {
            setPicking(false);
        }
    }

    async function requestParticipationAccess() {
        if (requestingAccess || accessRequested) return;
        setRequestingAccess(true);
        try {
            await participationRequestsApi.request();
            setAccessRequested(true);
            addToast({ type: "success", title: "Request submitted", message: "A System Admin will review your participation access request." });
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to submit participation access request.");
            addToast({ type: "warning", title: "Request failed", message: apiErrorMessage(err, "Failed to submit participation access request.") });
        } finally {
            setRequestingAccess(false);
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
            <ParticipantJourneyBar team={team} />

            <PixelCard glow gradient style={{ padding: 24 }}>
                <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
                    {isLeader ? 'Team Leader Console' : 'Participant Console'}
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

            {/* Time-sensitive status — kept near the top for at-a-glance tracking */}
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

            {error && (
                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "10px 14px" }}>ERROR: {error}</div>
            )}

            {!currentUser.is_active && (
                <PixelCard style={{ padding: 18, borderColor: "rgba(6,182,212,0.35)", background: "rgba(6,182,212,0.06)" }}>
                    <div style={{ color: "#06b6d4", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 6 }}>
                        // is_active_mode
                    </div>
                    <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: 1.7, marginBottom: 12 }}>
                        You can view your team and event data, but write actions are locked until a System Admin grants participation access.
                    </p>
                    <PixelButton variant="cyber" size="sm" disabled={requestingAccess || accessRequested} onClick={requestParticipationAccess}>
                        {accessRequested ? "REQUEST SENT" : requestingAccess ? "SENDING..." : "REQUEST PARTICIPATION ACCESS"}
                    </PixelButton>
                </PixelCard>
            )}

            {/* Track picker — modal. Sits below the ConfirmDialog (z 400) so the
                confirm step stacks on top when a track is tapped. */}
            {needsTrackPick && showTrackPicker && (
                <>
                    <div
                        onClick={() => { if (!picking) setShowTrackPicker(false); }}
                        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 350, backdropFilter: "blur(2px)" }}
                    />
                    <div
                        role="dialog"
                        aria-modal="true"
                        style={{
                            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 351,
                            width: "min(560px, calc(100vw - 32px))", maxHeight: "calc(100vh - 64px)", overflowY: "auto",
                            background: C.surface, border: `1px solid ${C.green}66`,
                            boxShadow: `0 0 40px ${C.greenGlow}, 0 16px 48px rgba(0,0,0,0.4)`, padding: 28,
                        }}
                    >
                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${C.green}, transparent)` }} />
                        <h2 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 4 }}>Choose your track</h2>
                        <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginBottom: 18 }}>
                            This assigns your whole team — you can't change it yourself afterwards.
                        </div>
                        {tracks.length === 0 ? (
                            <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>Loading tracks…</p>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {tracks.map(t => (
                                    <TrackOption key={t.trackId} track={t} onPick={() => setConfirmTrack(t)} />
                                ))}
                            </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
                            <PixelButton variant="secondary" onClick={() => setShowTrackPicker(false)}>CLOSE</PixelButton>
                        </div>
                    </div>
                </>
            )}

            {confirmTrack && (
                <ConfirmDialog
                    title="Confirm your track"
                    message={<>Assign <b style={{ color: C.text }}>{team.name}</b> to the <b style={{ color: C.text }}>{confirmTrack.name}</b> track?</>}
                    warning="You can't change your team's track yourself after this."
                    confirmLabel="CONFIRM TRACK"
                    working={picking}
                    error={error}
                    onConfirm={() => pickTrack(confirmTrack.trackId)}
                    onClose={() => { if (!picking) { setConfirmTrack(null); setError(null); } }}
                />
            )}

            {/* Team info */}
            <PixelCard style={{ padding: 24 }}>
                <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Team Info</div>
                {team.status === 'PENDING' && (
                    <div style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.35)", color: "#eab308", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "8px 12px", marginBottom: 12 }}>
                        PENDING COORDINATOR APPROVAL — You cannot submit until approved.
                    </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
                    <InfoRow label="Team" value={team.name} accent="green" />
                    {needsTrackPick && currentUser.is_active ? (
                        <InfoRow label="Track" accent="cyan" action={
                            <button
                                type="button"
                                onClick={() => setShowTrackPicker(true)}
                                style={{
                                    display: "inline-flex", alignItems: "center", gap: 6,
                                    background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.45)",
                                    color: C.yellow, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700,
                                    padding: "7px 12px", cursor: "pointer", letterSpacing: "0.04em", transition: "all 0.15s",
                                }}
                                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(234,179,8,0.16)"; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(234,179,8,0.08)"; }}
                            >
                                ⚠ Choose track
                            </button>
                        } />
                    ) : (
                        <InfoRow label="Track" value={team.trackName ?? "—"} accent="cyan" />
                    )}
                    <InfoRow label="Event" value={team.eventName ?? "—"} accent="blue" />
                    <InfoRow label="Current Round" value={activeRound?.name ?? "—"} badge={activeRound?.status} accent="purple" />
                </div>

                {(isLeader && currentUser.is_active) || !currentUser.is_active ? (
                    <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", flexWrap: "wrap", marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                        {isLeader && currentUser.is_active && (
                            <>
                                <PixelButton variant="cyber" onClick={() => navigate('/team/view')}>MANAGE TEAM</PixelButton>
                                {team.status === 'APPROVED' && (
                                    <PixelButton variant="secondary" onClick={() => navigate('/team/submit')}>SUBMIT PROJECT</PixelButton>
                                )}
                            </>
                        )}
                        {!currentUser.is_active && (
                            <>
                                <PixelButton variant="secondary" onClick={() => navigate('/team/view')}>VIEW TEAM</PixelButton>
                                {team.status === 'APPROVED' && (
                                    <PixelButton variant="secondary" onClick={() => navigate('/team/submit')}>VIEW SUBMISSION</PixelButton>
                                )}
                            </>
                        )}
                    </div>
                ) : null}
            </PixelCard>

            {/* Track "đề thi" — download once released (approved team in a track only) */}
            {team.status === 'APPROVED' && team.eventId != null && team.trackId != null && (
                <ParticipantProblemCard eventId={team.eventId} trackId={team.trackId} />
            )}

            {/* Activity feed (from the user's notifications) */}
            <PixelCard style={{ padding: 20 }}>
                <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Activity Feed</div>
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

function InfoRow({ label, value, badge, action, accent = "green" }: { label: string; value?: string; badge?: string; action?: ReactNode; accent?: "green" | "blue" | "cyan" | "purple" }) {
    // rgb kept as fixed literals so alpha suffixes are valid CSS (the green accent
    // is a theme CSS-var and can't take a hex-alpha suffix).
    const M = {
        green:  { text: C.green,  rgb: "34,197,94",  from: "#22c55e", to: "#7ee787" },
        blue:   { text: C.blue,   rgb: "59,130,246", from: "#3b82f6", to: "#93c5fd" },
        cyan:   { text: C.cyan,   rgb: "6,182,212",  from: "#06b6d4", to: "#67e8f9" },
        purple: { text: C.purple, rgb: "139,92,246", from: "#8b5cf6", to: "#c4b5fd" },
    }[accent];
    return (
        <div style={{
            position: "relative",
            background: C.surface2,
            border: `1px solid rgba(${M.rgb},0.30)`,
            boxShadow: `0 0 16px rgba(${M.rgb},0.10), inset 0 0 26px rgba(${M.rgb},0.05)`,
            padding: "14px 18px 18px",
            minHeight: 92,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 6,
            overflow: "hidden",
        }}>
            {/* Bottom accent line + top-left corner bracket (CyberStatCard styling). */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${M.text}, transparent)`, opacity: 0.6 }} />
            <div style={{ position: "absolute", top: 0, left: 0, width: 12, height: 12, borderTop: `2px solid ${M.text}`, borderLeft: `2px solid ${M.text}`, opacity: 0.8 }} />
            {/* Small, dim label so the large glowing value dominates the tile. */}
            <div style={{ color: `rgba(${M.rgb},0.85)`, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 600 }}>{label}</div>
            {action ?? (
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", filter: `drop-shadow(0 0 10px rgba(${M.rgb},0.5))` }}>
                    <GradientText from={M.from} to={M.to} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 23, fontWeight: 800, lineHeight: 1.15 }}>{value}</GradientText>
                    {badge && <PixelBadge color={roundStatusColor(badge)}>{badge}</PixelBadge>}
                </div>
            )}
        </div>
    );
}

// One selectable track row (Kiểu A): name + slots (used/total) + description.
// A full track is disabled; an available one opens the confirm dialog on click.
function TrackOption({ track, onPick }: { track: Track; onPick: () => void }) {
    const MONO = "'JetBrains Mono', monospace";
    const cap = track.capacity ?? null;
    const used = track.teamCount ?? 0;
    const full = cap != null && used >= cap;
    const [hover, setHover] = useState(false);
    const lit = hover && !full;
    return (
        <button
            type="button"
            disabled={full}
            onClick={onPick}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                textAlign: "left",
                width: "100%",
                padding: "14px 16px",
                background: lit ? "rgba(34,197,94,0.06)" : (full ? C.surface2 : C.surface),
                border: `1px solid ${lit ? C.green : C.border}`,
                borderRadius: 0,
                cursor: full ? "not-allowed" : "pointer",
                opacity: full ? 0.6 : 1,
                transition: "all 0.15s ease",
                boxShadow: lit ? "0 0 12px rgba(34,197,94,0.12)" : "none",
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <span style={{ color: C.text, fontFamily: MONO, fontSize: 14, fontWeight: 700 }}>{track.name}</span>
                {full ? (
                    <PixelBadge color="red">FULL</PixelBadge>
                ) : (
                    <PixelBadge color="green">{cap != null ? `${used}/${cap} slots` : "Open"}</PixelBadge>
                )}
            </div>
            {track.description && (
                <div style={{ color: C.textMuted, fontFamily: MONO, fontSize: 11, lineHeight: 1.5, marginTop: 6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {track.description}
                </div>
            )}
        </button>
    );
}
