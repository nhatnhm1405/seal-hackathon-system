import {
    C, GradientText, PixelBadge,
} from "../../../../../shared/components/PixelComponents";
import { tracks, rounds } from "../../../../../shared/mocks/mockData";
import type { HackathonEvent } from "../../../../../shared/mocks/mockData";
import { fmtDate, fmtShort, TRACK_SPOTS_LEFT } from "../utils/formatters";

function roundBadgeColor(status: string) {
    if (status === 'ACTIVE') return { bg: "rgba(34,197,94,0.14)", color: "#22c55e", shadow: "0 0 8px rgba(34,197,94,0.35)" };
    if (status === 'UPCOMING') return { bg: "rgba(234,179,8,0.12)", color: "#eab308", shadow: "none" };
    return { bg: "rgba(239,68,68,0.10)", color: "#ef4444", shadow: "none" };
}

export function EventDetailDrawer({
    event,
    onClose,
    onCreateTeam,
}: {
    event: HackathonEvent;
    onClose: () => void;
    onCreateTeam: (eventId: number, trackId: number) => void;
}) {
    const eventTracks = tracks.filter(t => t.event_id === event.event_id);
    const eventRounds = rounds.filter(r => r.event_id === event.event_id);
    const seasonLabels: Record<string, string> = { SPRING: "SPRING 2026", SUMMER: "SUMMER 2026", FALL: "FALL 2026" };

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
                    zIndex: 200, backdropFilter: "blur(2px)",
                }}
            />

            {/* Drawer panel */}
            <div style={{
                position: "fixed", top: 0, right: 0, bottom: 0,
                width: "min(540px, 100vw)",
                background: "#090d12",
                borderLeft: `1px solid ${C.border}`,
                zIndex: 201,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                boxShadow: "-8px 0 40px rgba(0,0,0,0.6)",
            }}>
                {/* Header */}
                <div style={{
                    padding: "16px 24px",
                    borderBottom: `1px solid ${C.border}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flexShrink: 0,
                    position: "sticky",
                    top: 0,
                    background: "#090d12",
                    zIndex: 1,
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: C.textMuted, padding: "2px 6px",
                            display: "flex", alignItems: "center", gap: 6,
                            fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                            transition: "color 0.15s",
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.green; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
                    >
                        ← Back
                    </button>
                    <span style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em" }}>
                        // event_detail
                    </span>
                </div>

                <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 28 }}>
                    {/* Event heading */}
                    <div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
                            <span style={{
                                background: "rgba(34,197,94,0.1)", border: `1px solid rgba(34,197,94,0.3)`,
                                color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                                letterSpacing: "0.1em", padding: "2px 10px",
                            }}>
                                {seasonLabels[event.season]}
                            </span>
                            <PixelBadge color="green">OPEN</PixelBadge>
                        </div>
                        <h2 style={{
                            fontFamily: "'JetBrains Mono', monospace", fontWeight: 900,
                            fontSize: 28, lineHeight: 1.1, marginBottom: 8,
                        }}>
                            <GradientText>{event.name}</GradientText>
                        </h2>
                        <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                            {fmtShort(event.start_date)} — {fmtShort(event.end_date)}
                        </div>
                    </div>

                    {/* Tracks */}
                    <div>
                        <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 14 }}>
                            // available_tracks
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            {eventTracks.map(tr => {
                                const spotsLeft = TRACK_SPOTS_LEFT[tr.track_id] ?? 5;
                                return (
                                    <div
                                        key={tr.track_id}
                                        style={{
                                            background: C.surface,
                                            border: `1px solid ${C.border}`,
                                            padding: "16px",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 8,
                                            position: "relative",
                                            overflow: "hidden",
                                            transition: "border-color 0.15s",
                                        }}
                                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(34,197,94,0.4)"; }}
                                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = C.border; }}
                                    >
                                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${C.green}, transparent)`, opacity: 0.5 }} />
                                        <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700 }}>
                                            {tr.name}
                                        </div>
                                        <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, lineHeight: 1.5 }}>
                                            {tr.description}
                                        </div>
                                        <div style={{
                                            display: "inline-flex", alignItems: "center",
                                            background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.25)",
                                            color: "#06b6d4", fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                                            letterSpacing: "0.08em", padding: "2px 8px", alignSelf: "flex-start",
                                        }}>
                                            Max teams: {spotsLeft}
                                        </div>
                                        <button
                                            onClick={() => onCreateTeam(event.event_id, tr.track_id)}
                                            style={{
                                                marginTop: 4,
                                                padding: "8px 10px",
                                                background: "rgba(34,197,94,0.08)",
                                                border: `1px solid rgba(34,197,94,0.35)`,
                                                color: C.green,
                                                fontFamily: "'JetBrains Mono', monospace",
                                                fontSize: 10,
                                                letterSpacing: "0.06em",
                                                cursor: "pointer",
                                                borderRadius: 0,
                                                transition: "background 0.15s, box-shadow 0.15s",
                                                textAlign: "center",
                                            }}
                                            onMouseEnter={(e) => {
                                                (e.currentTarget as HTMLElement).style.background = "rgba(34,197,94,0.16)";
                                                (e.currentTarget as HTMLElement).style.boxShadow = `0 0 10px rgba(34,197,94,0.2)`;
                                            }}
                                            onMouseLeave={(e) => {
                                                (e.currentTarget as HTMLElement).style.background = "rgba(34,197,94,0.08)";
                                                (e.currentTarget as HTMLElement).style.boxShadow = "none";
                                            }}
                                        >
                                            JOIN THIS TRACK → CREATE TEAM
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Rounds */}
                    <div>
                        <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 14 }}>
                            // rounds
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                            {eventRounds.map((r, i) => {
                                const badge = roundBadgeColor(r.status);
                                const isLast = i === eventRounds.length - 1;
                                return (
                                    <div key={r.round_id} style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
                                        <div style={{ width: 28, display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                                            <div style={{
                                                width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                                                background: r.status === 'ACTIVE' ? C.green : r.status === 'CLOSED' ? "rgba(255,255,255,0.2)" : "transparent",
                                                border: r.status === 'ACTIVE' ? `2px solid ${C.green}` : r.status === 'PENDING' ? `2px solid rgba(234,179,8,0.5)` : `2px solid rgba(255,255,255,0.2)`,
                                                boxShadow: r.status === 'ACTIVE' ? `0 0 8px rgba(34,197,94,0.5)` : "none",
                                                marginTop: 14,
                                            }} />
                                            {!isLast && (
                                                <div style={{ flex: 1, width: 2, background: "rgba(255,255,255,0.08)", minHeight: 24, marginTop: 4 }} />
                                            )}
                                        </div>
                                        <div style={{
                                            flex: 1, padding: "10px 14px 16px",
                                            display: "flex", alignItems: "flex-start",
                                            justifyContent: "space-between", gap: 12,
                                        }}>
                                            <div>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                                    <span style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700 }}>
                                                        Round {r.order_number} — {r.name}
                                                    </span>
                                                </div>
                                                <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                                                    Deadline: {fmtDate(r.submission_deadline)}
                                                </div>
                                            </div>
                                            <div style={{
                                                background: badge.bg, color: badge.color,
                                                fontFamily: "'JetBrains Mono', monospace",
                                                fontSize: 9, letterSpacing: "0.12em",
                                                padding: "3px 10px", flexShrink: 0,
                                                boxShadow: badge.shadow,
                                            }}>
                                                {r.status}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}