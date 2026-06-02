import {
    C, GradientText, PixelButton, PixelBadge, PixelCard,
} from "../../../../../shared/components/PixelComponents";
import { tracks, rounds, events, HackathonEvent } from "../../../../../shared/mocks/mockData";
import { fmtShort } from "../utils/formatters";

export function NoTeamDashboard({
    onCreateTeam,
    onViewDetails,
    pendingTeamName,
}: {
    onCreateTeam: (eventId?: number, trackId?: number) => void;
    onViewDetails: (event: HackathonEvent) => void;
    pendingTeamName: string | null;
}) {
    const openEvents = events.filter(e => e.status === 'OPEN');

    return (
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Header hero card */}
            <div style={{
                position: "relative",
                background: "linear-gradient(#0d1117, #0d1117) padding-box, linear-gradient(135deg, rgba(34,197,94,0.45), rgba(59,130,246,0.35), rgba(34,197,94,0.15)) border-box",
                border: "1px solid transparent",
                padding: 28,
                overflow: "hidden",
                boxShadow: "0 0 32px rgba(34,197,94,0.08), 0 0 60px rgba(59,130,246,0.05)",
            }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${C.green}, ${C.blue}, transparent)`, opacity: 0.7 }} />
                <div style={{ position: "absolute", top: 0, left: 0, width: 14, height: 14, borderTop: `2px solid ${C.green}`, borderLeft: `2px solid ${C.green}` }} />
                <div style={{ position: "absolute", bottom: 0, right: 0, width: 14, height: 14, borderBottom: `2px solid rgba(59,130,246,0.5)`, borderRight: `2px solid rgba(59,130,246,0.5)` }} />

                <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 8 }}>
                    // join_an_event
                </div>
                <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 900, fontSize: 28, lineHeight: 1.15, marginBottom: 10 }}>
                    <GradientText>Join an Event</GradientText>
                </h1>

                {pendingTeamName ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                        <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                            Your team <strong style={{ color: C.text }}>{pendingTeamName}</strong> is waiting for coordinator approval.
                        </span>
                        <span style={{
                            background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.4)",
                            color: "#eab308", fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 9, letterSpacing: "0.12em", padding: "2px 10px", flexShrink: 0,
                        }}>
                            PENDING
                        </span>
                    </div>
                ) : (
                    <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginBottom: 16, lineHeight: 1.8, maxWidth: 520 }}>
                        You are not yet part of a team. Create your own team to compete, or wait for a team leader to invite you.
                    </p>
                )}

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <PixelButton variant="cyber" onClick={() => onCreateTeam()}>
                        CREATE A TEAM
                    </PixelButton>
                    <PixelButton variant="ghost">
                        WAIT FOR INVITE
                    </PixelButton>
                </div>
            </div>

            {/* Open events section */}
            <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em" }}>
                // open_events
            </div>

            {openEvents.length === 0 ? (
                <PixelCard style={{ padding: 20 }}>
                    <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                        No open events at this time. Check back later.
                    </p>
                </PixelCard>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {openEvents.map(ev => {
                        const eventTracks = tracks.filter(t => t.event_id === ev.event_id);
                        const eventRounds = rounds.filter(r => r.event_id === ev.event_id);
                        const activeRound = eventRounds.find(r => r.status === 'ACTIVE');

                        return (
                            <div
                                key={ev.event_id}
                                style={{
                                    background: C.surface,
                                    border: `1px solid ${C.border}`,
                                    padding: "20px 24px",
                                    position: "relative",
                                    overflow: "hidden",
                                    transition: "border-color 0.2s",
                                }}
                                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(34,197,94,0.35)"; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = C.border; }}
                            >
                                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${C.green}, transparent)`, opacity: 0.5 }} />
                                <div style={{ position: "absolute", top: 0, left: 0, width: 10, height: 10, borderTop: `2px solid ${C.green}`, borderLeft: `2px solid ${C.green}` }} />

                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                                    <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700 }}>
                                        {ev.name}
                                    </div>
                                    <PixelBadge color="green">OPEN</PixelBadge>
                                </div>

                                <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginBottom: 10 }}>
                                    {fmtShort(ev.start_date)} — {fmtShort(ev.end_date)}
                                </div>

                                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.textMuted, marginBottom: 12 }}>
                                    {eventTracks.length} tracks · {eventRounds.length} rounds ·{" "}
                                    {activeRound ? (
                                        <span>Qualifier <span style={{ color: C.green, fontWeight: 700 }}>ACTIVE</span></span>
                                    ) : (
                                        <span>No active round</span>
                                    )}
                                </div>

                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
                                    {eventTracks.map(t => (
                                        <span
                                            key={t.track_id}
                                            style={{
                                                background: "rgba(6,182,212,0.08)",
                                                border: "1px solid rgba(6,182,212,0.25)",
                                                color: "#06b6d4",
                                                fontFamily: "'JetBrains Mono', monospace",
                                                fontSize: 10,
                                                letterSpacing: "0.06em",
                                                padding: "3px 10px",
                                            }}
                                        >
                                            {t.track_name}
                                        </span>
                                    ))}
                                </div>

                                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                    <PixelButton variant="cyber" onClick={() => onCreateTeam(ev.event_id)}>
                                        REGISTER & CREATE TEAM
                                    </PixelButton>
                                    <PixelButton variant="secondary" onClick={() => onViewDetails(ev)}>
                                        VIEW DETAILS →
                                    </PixelButton>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}