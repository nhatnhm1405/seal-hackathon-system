import { useState } from "react";
import {
    C, GradientText, PixelButton,
} from "../../../../../shared/components/PixelComponents";
import { tracks, events } from "../../../../../shared/mocks/mockData";
import { TRACK_SPOTS_LEFT } from "../utils/formatters";

interface FormState {
    teamName: string;
    eventId: number | null;
    trackId: number | null;
}

export function CreateTeamScreen({
    initialEventId,
    initialTrackId,
    onBack,
    onSubmit,
}: {
    initialEventId: number | null;
    initialTrackId: number | null;
    onBack: () => void;
    onSubmit: (data: { teamName: string; eventId: number; trackId: number }) => void;
}) {
    const [form, setForm] = useState<FormState>({
        teamName: "",
        eventId: initialEventId,
        trackId: initialTrackId,
    });

    const openEvents = events.filter(e => e.status === 'OPEN');
    const eventTracks = form.eventId ? tracks.filter(t => t.event_id === form.eventId) : [];
    const selectedTrack = form.trackId ? tracks.find(t => t.track_id === form.trackId) : null;
    const selectedEvent = form.eventId ? events.find(e => e.event_id === form.eventId) : null;
    const spotsLeft = form.trackId ? (TRACK_SPOTS_LEFT[form.trackId] ?? 5) : null;
    const canSubmit = form.teamName.trim() !== "" && form.eventId !== null && form.trackId !== null;

    const inputStyle: React.CSSProperties = {
        width: "100%",
        padding: "10px 14px",
        background: "#1a1a24",
        border: "1px solid #2a2a3a",
        color: C.text,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 13,
        borderRadius: 0,
        outline: "none",
        boxSizing: "border-box",
        transition: "border-color 0.15s, box-shadow 0.15s",
    };

    function handleFocus(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
        e.currentTarget.style.borderColor = C.green;
        e.currentTarget.style.boxShadow = `0 0 0 1px rgba(34,197,94,0.35)`;
    }
    function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
        e.currentTarget.style.borderColor = "#2a2a3a";
        e.currentTarget.style.boxShadow = "none";
    }

    return (
        <div style={{ padding: "28px 24px", maxWidth: 560, margin: "0 auto" }}>
            <button
                onClick={onBack}
                style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: C.textMuted, fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12, letterSpacing: "0.04em", marginBottom: 28,
                    display: "flex", alignItems: "center", gap: 6,
                    padding: 0, transition: "color 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.green; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
            >
                ← Back to Events
            </button>

            <div style={{ marginBottom: 32 }}>
                <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 8 }}>
                    // create_team
                </div>
                <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 900, fontSize: 32, lineHeight: 1.1, marginBottom: 10 }}>
                    <GradientText>Create Your Team</GradientText>
                </h1>
                <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: 1.8 }}>
                    You will become the team leader. Your team will be reviewed by a coordinator before competing.
                </p>
            </div>

            <div style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                padding: 28,
                display: "flex",
                flexDirection: "column",
                gap: 20,
                position: "relative",
                overflow: "hidden",
            }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${C.green}, ${C.blue}, transparent)`, opacity: 0.6 }} />

                {/* Team Name */}
                <div>
                    <label style={{ color: C.greenMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                        Team Name
                    </label>
                    <input
                        style={inputStyle}
                        placeholder="e.g. ByteBuilders"
                        value={form.teamName}
                        onChange={(e) => setForm(f => ({ ...f, teamName: e.target.value }))}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                    />
                </div>

                {/* Event select */}
                <div>
                    <label style={{ color: C.greenMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                        Event
                    </label>
                    <select
                        style={{ ...inputStyle, cursor: "pointer", appearance: "none", WebkitAppearance: "none" }}
                        value={form.eventId ?? ""}
                        onChange={(e) => {
                            const id = e.target.value ? Number(e.target.value) : null;
                            setForm(f => ({ ...f, eventId: id, trackId: null }));
                        }}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                    >
                        <option value="" style={{ background: "#1a1a24" }}>— Select an event —</option>
                        {openEvents.map(ev => (
                            <option key={ev.event_id} value={ev.event_id} style={{ background: "#1a1a24" }}>{ev.name}</option>
                        ))}
                    </select>
                </div>

                {/* Track select */}
                <div>
                    <label style={{ color: C.greenMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                        Track
                    </label>
                    <select
                        style={{ ...inputStyle, cursor: form.eventId ? "pointer" : "not-allowed", appearance: "none", WebkitAppearance: "none", opacity: form.eventId ? 1 : 0.4 }}
                        value={form.trackId ?? ""}
                        disabled={!form.eventId}
                        onChange={(e) => {
                            const id = e.target.value ? Number(e.target.value) : null;
                            setForm(f => ({ ...f, trackId: id }));
                        }}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                    >
                        <option value="" style={{ background: "#1a1a24" }}>— Select a track —</option>
                        {eventTracks.map(tr => (
                            <option key={tr.track_id} value={tr.track_id} style={{ background: "#1a1a24" }}>{tr.name}</option>
                        ))}
                    </select>

                    {selectedTrack && spotsLeft !== null && (
                        <div style={{
                            marginTop: 8,
                            display: "inline-flex", alignItems: "center", gap: 8,
                            background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.25)",
                            color: "#06b6d4", fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 10, letterSpacing: "0.06em", padding: "4px 12px",
                        }}>
                            Max teams: {spotsLeft} · {spotsLeft} spots left
                        </div>
                    )}
                </div>

                {/* Info callout */}
                {selectedEvent && selectedTrack && (
                    <div style={{
                        background: "rgba(34,197,94,0.06)",
                        border: `1px solid rgba(34,197,94,0.25)`,
                        borderLeft: `3px solid ${C.green}`,
                        padding: "12px 16px",
                        display: "flex", flexDirection: "column", gap: 6,
                    }}>
                        <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.1em", marginBottom: 2 }}>
                            TEAM SUMMARY
                        </div>
                        {[
                            { label: "Event", value: selectedEvent.name },
                            { label: "Track", value: selectedTrack.name },
                            { label: "Role", value: "Team Leader" },
                        ].map(({ label, value }) => (
                            <div key={label} style={{ display: "flex", gap: 12 }}>
                                <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, minWidth: 48 }}>{label}</span>
                                <span style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700 }}>{value}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Submit */}
                <div style={{ marginTop: 4 }}>
                    <PixelButton
                        variant="cyber"
                        size="lg"
                        fullWidth
                        onClick={() => {
                            if (canSubmit && form.eventId && form.trackId) {
                                onSubmit({ teamName: form.teamName.trim(), eventId: form.eventId, trackId: form.trackId });
                            }
                        }}
                    >
                        CREATE TEAM
                    </PixelButton>
                    <div style={{ color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, marginTop: 10, textAlign: "center", lineHeight: 1.6 }}>
                        Your team status will be PENDING until approved by a coordinator.
                    </div>
                </div>
            </div>
        </div>
    );
}