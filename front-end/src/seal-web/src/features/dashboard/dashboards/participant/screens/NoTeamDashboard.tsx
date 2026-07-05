import { useState, useEffect } from "react";
import { C, PixelButton, PixelBadge, PixelCard } from "@/shared/components/PixelComponents";
import { teamsApi, roundsApi, HackathonEvent, ActiveEventWithTracks, Round } from "@/shared/apiClient";
import { useTour } from "@/app/providers/TourProvider";
import { ParticipantJourneyBar } from "@/shared/components/ParticipantJourneyBar";
import { fmtShort } from "../utils/formatters";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function registrationDeadlineLabel(ev: ActiveEventWithTracks) {
    const deadlineIso = ev.registrationEnd || ev.startDate;
    if (!deadlineIso) {
        return { primary: "Deadline TBA", secondary: "Registration deadline not set" };
    }

    const deadline = new Date(deadlineIso);
    const now = new Date();
    const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / MS_PER_DAY);

    if (Number.isNaN(deadline.getTime())) {
        return { primary: "Deadline TBA", secondary: "Registration deadline not set" };
    }

    if (diffDays <= 0) {
        return { primary: "Closes today", secondary: `Deadline: ${fmtShort(deadlineIso)}` };
    }

    return {
        primary: `${diffDays} day${diffDays === 1 ? "" : "s"} left`,
        secondary: `Deadline: ${fmtShort(deadlineIso)}`,
    };
}

function trackSummary(track: { name: string; description?: string }) {
    if (track.description?.trim()) return track.description.trim();
    const name = track.name.toLowerCase();
    if (name.includes("ai")) return "Build intelligent solutions with data, automation, or machine learning.";
    if (name.includes("green")) return "Create sustainable products for energy, environment, or climate impact.";
    if (name.includes("social")) return "Solve community problems with accessible, practical technology.";
    if (name.includes("web")) return "Deliver a polished web product with strong UX and reliable engineering.";
    return "Explore this challenge track and shape a focused hackathon solution.";
}

export function NoTeamDashboard({
    onCreateTeam,
    onViewDetails,
    onWaitForInvite,
    pendingTeamName,
    pendingInviteCount,
    readOnly = false,
    requestingAccess = false,
    accessRequested = false,
    onRequestAccess,
}: {
    onCreateTeam: (eventId?: number, trackId?: number) => void;
    onViewDetails: (event: HackathonEvent) => void;
    onWaitForInvite: () => void;
    pendingTeamName: string | null;
    pendingInviteCount: number;
    readOnly?: boolean;
    requestingAccess?: boolean;
    accessRequested?: boolean;
    onRequestAccess?: () => void;
}) {
    const { openTour } = useTour();
    const [events, setEvents] = useState<ActiveEventWithTracks[]>([]);
    const [roundsByEvent, setRoundsByEvent] = useState<Record<number, Round[]>>({});
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    useEffect(() => {
        teamsApi.getActiveEvents().then(res => {
            const evs = res.data ?? [];
            setEvents(evs);
            evs.forEach(ev => {
                roundsApi.getAll(ev.eventId)
                    .then(r => setRoundsByEvent(prev => ({ ...prev, [ev.eventId]: r.data ?? [] })))
                    .catch(() => {});
            });
        }).catch(() => setEvents([]));
    }, []);

    // ActiveEventWithTracks → HackathonEvent for the detail drawer.
    function toEvent(ev: ActiveEventWithTracks): HackathonEvent {
        return {
            eventId: ev.eventId, name: ev.name, season: ev.season ?? "", year: ev.year ?? new Date().getFullYear(),
            description: ev.description, registrationStart: ev.registrationStart ?? "", registrationEnd: ev.registrationEnd ?? "",
            startDate: ev.startDate ?? "", endDate: ev.endDate ?? "", status: (ev.status as HackathonEvent["status"]) ?? "OPEN",
        };
    }

    function toggleExpanded(key: string) {
        setExpanded(previous => ({ ...previous, [key]: !previous[key] }));
    }

    return (
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Live journey progress */}
            <ParticipantJourneyBar team={null} />

            {/* Open events */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                    <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 900, letterSpacing: "0.02em" }}>Open Events</div>
                </div>
                <PixelBadge color="green">{events.length} OPEN</PixelBadge>
            </div>

            {readOnly && (
                <PixelCard style={{ padding: 16 }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                        <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, margin: 0 }}>
                            Creating or joining teams requires System Admin approval.
                        </p>
                        <PixelButton variant="cyber" disabled={requestingAccess || accessRequested} onClick={onRequestAccess}>
                            {accessRequested ? "REQUEST SENT" : requestingAccess ? "SENDING..." : "REQUEST PARTICIPATION ACCESS"}
                        </PixelButton>
                    </div>
                </PixelCard>
            )}

            {pendingTeamName && !readOnly && (
                <PixelCard style={{ padding: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                            Your team <strong style={{ color: C.text }}>{pendingTeamName}</strong> is waiting for coordinator approval.
                        </span>
                        <span style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.4)", color: "#eab308", fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.12em", padding: "2px 10px", flexShrink: 0 }}>PENDING</span>
                    </div>
                </PixelCard>
            )}

            {events.length === 0 ? (
                <PixelCard style={{ padding: 20 }}>
                    <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>No open events at this time. Check back later.</p>
                </PixelCard>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                    {events.map(ev => {
                        const evTracks = ev.tracks ?? [];
                        const evRounds = roundsByEvent[ev.eventId] ?? [];
                        const activeRound = evRounds.find(r => ["ACTIVE", "OPEN", "IN_PROGRESS"].includes((r.status ?? "").toUpperCase()));
                        const registrationDeadline = registrationDeadlineLabel(ev);
                        const tracksKey = `${ev.eventId}:tracks`;
                        const roundsKey = `${ev.eventId}:rounds`;
                        const tracksOpen = Boolean(expanded[tracksKey]);
                        const roundsOpen = Boolean(expanded[roundsKey]);
                        return (
                            <PixelCard key={ev.eventId}
                                glow
                                gradient
                                style={{ padding: "28px 30px", minHeight: 236, display: "flex", flexDirection: "column", gap: 22, borderColor: "rgba(34,197,94,0.35)" }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18, flexWrap: "wrap" }}>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                        <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 900, lineHeight: 1.15 }}>{ev.name}</div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                            <span style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 800 }}>
                                                {fmtShort(ev.startDate)} - {fmtShort(ev.endDate)}
                                            </span>

                                        </div>
                                    </div>
                                    <PixelBadge color="green">OPEN</PixelBadge>
                                </div>

                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap", background: "linear-gradient(90deg, rgba(34,197,94,0.18), rgba(59,130,246,0.12))", border: "1px solid rgba(34,197,94,0.45)", padding: "14px 16px", boxShadow: "0 0 24px rgba(34,197,94,0.12)" }}>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                        <span style={{ color: C.greenBright, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 900, letterSpacing: "0.12em" }}>
                                            REGISTRATION OPEN
                                        </span>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        <div style={{ color: "#ffffff", fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 900, lineHeight: 1.1 }}>
                                            {registrationDeadline.primary}
                                        </div>
                                        <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginTop: 4 }}>
                                            {registrationDeadline.secondary}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => toggleExpanded(tracksKey)}
                                        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") toggleExpanded(tracksKey); }}
                                        style={{ background: tracksOpen ? "rgba(6,182,212,0.12)" : C.surface2, border: `1px solid ${tracksOpen ? "rgba(6,182,212,0.55)" : C.border}`, padding: "12px 14px", cursor: "pointer", transition: "all 0.2s ease" }}
                                    >
                                        <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>Tracks</div>
                                        <div style={{ color: C.cyan, fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 900, marginTop: 4 }}>{evTracks.length}</div>
                                    </div>
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => toggleExpanded(roundsKey)}
                                        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") toggleExpanded(roundsKey); }}
                                        style={{ background: roundsOpen ? "rgba(59,130,246,0.12)" : C.surface2, border: `1px solid ${roundsOpen ? "rgba(59,130,246,0.55)" : C.border}`, padding: "12px 14px", cursor: "pointer", transition: "all 0.2s ease" }}
                                    >
                                        <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>Rounds</div>
                                        <div style={{ color: C.blueBright, fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 900, marginTop: 4 }}>{evRounds.length}</div>
                                    </div>
                                    <div style={{ background: C.surface2, border: `1px solid ${C.border}`, padding: "12px 14px" }}>
                                        <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>Current Round</div>
                                        <div style={{ color: activeRound ? C.green : C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 900, marginTop: 7 }}>
                                            {activeRound ? `${activeRound.name ?? "Qualifier"} ACTIVE` : "No active round"}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: tracksOpen && roundsOpen ? 10 : 0 }}>
                                    <div style={{ maxHeight: tracksOpen ? 220 : 0, opacity: tracksOpen ? 1 : 0, transform: tracksOpen ? "translateY(0)" : "translateY(-8px)", overflow: "hidden", transition: "max-height 0.28s ease, opacity 0.2s ease, transform 0.25s ease" }}>
                                        <div style={{ background: C.surface2, border: "1px solid rgba(6,182,212,0.35)", padding: "14px 16px" }}>
                                            <div style={{ color: C.cyan, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
                                                Tracks
                                            </div>
                                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                                                {evTracks.length === 0 ? (
                                                    <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>No tracks configured.</span>
                                                ) : evTracks.map(t => (
                                                    <div key={t.trackId} style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.16), rgba(59,130,246,0.1))", border: "1px solid rgba(6,182,212,0.42)", padding: "12px 14px", minHeight: 82, display: "flex", flexDirection: "column", justifyContent: "center", gap: 6 }}>
                                                        <div style={{ color: "#e0faff", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, letterSpacing: "0.03em", fontWeight: 900 }}>
                                                            {t.name}
                                                        </div>
                                                        <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, lineHeight: 1.45 }}>
                                                            {trackSummary(t)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ maxHeight: roundsOpen ? 260 : 0, opacity: roundsOpen ? 1 : 0, transform: roundsOpen ? "translateY(0)" : "translateY(-8px)", overflow: "hidden", transition: "max-height 0.28s ease, opacity 0.2s ease, transform 0.25s ease" }}>
                                        <div style={{ background: C.surface2, border: "1px solid rgba(59,130,246,0.35)", padding: "14px 16px" }}>
                                            <div style={{ color: C.blueBright, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
                                                Rounds
                                            </div>
                                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                                                {evRounds.length === 0 ? (
                                                    <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>No rounds configured.</span>
                                                ) : evRounds.map(round => (
                                                    <div key={round.roundId} style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.14), rgba(34,197,94,0.08))", border: "1px solid rgba(59,130,246,0.38)", padding: "10px 12px", minHeight: 58 }}>
                                                        <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 800 }}>
                                                            {round.name}
                                                        </div>
                                                        <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginTop: 5 }}>
                                                            {round.status ?? "TBA"} · Deadline {fmtShort(round.submissionDeadline)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginTop: "auto" }}>
                                    <PixelButton variant="cyber" size="lg" disabled={readOnly} onClick={() => onCreateTeam(ev.eventId)}>
                                        {readOnly ? "READ-ONLY" : "REGISTER & CREATE TEAM"}
                                    </PixelButton>
                                    <PixelButton variant="secondary" size="lg" onClick={() => onViewDetails(toEvent(ev))}>{"VIEW DETAILS"}</PixelButton>
                                    <div style={{ position: "relative", display: "inline-flex" }}>
                                        <PixelButton variant="ghost" size="lg" onClick={onWaitForInvite}>{readOnly ? "VIEW INVITES" : "WAIT FOR INVITE"}</PixelButton>
                                        {pendingInviteCount > 0 && (
                                            <span style={{ position: "absolute", top: -8, right: -8, minWidth: 20, height: 20, borderRadius: "50%", background: C.blue, color: "#fff", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 10px rgba(59,130,246,0.75)`, pointerEvents: "none" }}>
                                                {pendingInviteCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </PixelCard>
                        );
                    })}
                </div>
            )}

            <button
                type="button"
                aria-label="How it works"
                title="How it works"
                onClick={openTour}
                style={{ position: "fixed", right: 24, bottom: 24, zIndex: 50, width: 52, height: 52, borderRadius: "50%", background: `linear-gradient(135deg, ${C.green}, ${C.blue})`, border: "1px solid rgba(255,255,255,0.28)", cursor: "pointer", color: "#fff", fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 18px rgba(34,197,94,0.55), 0 0 34px rgba(59,130,246,0.35)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px) scale(1.04)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "none"; }}
            >
                ?
            </button>
        </div>
    );
}
