import { useState, useEffect } from "react";
import { C, GradientText, PixelButton } from "@/shared/components/PixelComponents";
import { teamsApi, ApiError, ActiveEventWithTracks } from "@/shared/apiClient";
import { useAuth } from "@/app/providers/AuthProvider";

export function CreateTeamScreen({
    initialEventId,
    initialTrackId,
    onBack,
    onSubmit,
}: {
    initialEventId: number | null;
    initialTrackId: number | null;
    onBack: () => void;
    onSubmit: (teamName: string) => void;
}) {
    const { refreshTeamContext } = useAuth();

    const [activeEvents, setActiveEvents] = useState<ActiveEventWithTracks[]>([]);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [teamName, setTeamName] = useState("");
    const [description, setDescription] = useState("");
    const [eventId, setEventId] = useState<number | null>(initialEventId);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        teamsApi.getActiveEvents()
            .then(res => {
                const evs = res.data ?? [];
                setActiveEvents(evs);
                if (initialEventId == null && evs.length === 1) setEventId(evs[0].eventId);
            })
            .catch(err => setLoadError(err instanceof ApiError ? err.message : "Failed to load open events."));
    }, [initialEventId]);

    const selectedEvent = eventId != null ? activeEvents.find(e => e.eventId === eventId) : null;
    const canSubmit = teamName.trim() !== "" && eventId !== null;

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

    function handleFocus(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
        e.currentTarget.style.borderColor = C.green;
        e.currentTarget.style.boxShadow = `0 0 0 1px rgba(34,197,94,0.35)`;
    }
    function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
        e.currentTarget.style.borderColor = "#2a2a3a";
        e.currentTarget.style.boxShadow = "none";
    }

    async function handleCreate() {
        if (!canSubmit || eventId == null) return;
        setSubmitting(true);
        setError(null);
        try {
            await teamsApi.create({
                eventId,
                name: teamName.trim(),
                description: description.trim() || undefined,
            });
            await refreshTeamContext();
            onSubmit(teamName.trim());
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to create team.");
        } finally {
            setSubmitting(false);
        }
    }

    const labelStyle: React.CSSProperties = {
        color: C.greenMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
        letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 8,
    };

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

            {loadError && (
                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "10px 14px", marginBottom: 16 }}>
                    ERROR: {loadError}
                </div>
            )}

            {activeEvents.length === 0 && !loadError ? (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: 24 }}>
                    <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
                        No events are open for registration right now.
                    </p>
                </div>
            ) : (
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
                        <label style={labelStyle}>Team Name</label>
                        <input
                            style={inputStyle}
                            placeholder="e.g. ByteBuilders"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                        />
                    </div>

                    {/* Event select */}
                    <div>
                        <label style={labelStyle}>Event</label>
                        <select
                            style={{ ...inputStyle, cursor: "pointer", appearance: "none", WebkitAppearance: "none" }}
                            value={eventId ?? ""}
                            onChange={(e) => {
                                const id = e.target.value ? Number(e.target.value) : null;
                                setEventId(id);
                            }}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                        >
                            <option value="" style={{ background: "#1a1a24" }}>— Select an event —</option>
                            {activeEvents.map(ev => (
                                <option key={ev.eventId} value={ev.eventId} style={{ background: "#1a1a24" }}>{ev.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Track is assigned later (during SETUP) — not chosen at registration. */}
                    <div style={{ background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.25)", color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "10px 12px", lineHeight: 1.5 }}>
                        Track is assigned after registration closes — you'll pick it during
                        the setup phase, or the coordinator draws it, depending on the event.
                    </div>

                    {/* Description */}
                    <div>
                        <label style={labelStyle}>Description (optional)</label>
                        <textarea
                            style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
                            placeholder="What is your team about?"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                        />
                    </div>

                    {/* Info callout */}
                    {selectedEvent && (
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
                                { label: "Role", value: "Team Leader" },
                            ].map(({ label, value }) => (
                                <div key={label} style={{ display: "flex", gap: 12 }}>
                                    <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, minWidth: 48 }}>{label}</span>
                                    <span style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700 }}>{value}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {error && (
                        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "10px 12px" }}>
                            ERROR: {error}
                        </div>
                    )}

                    {/* Submit */}
                    <div style={{ marginTop: 4 }}>
                        <PixelButton variant="cyber" size="lg" fullWidth disabled={!canSubmit || submitting} onClick={handleCreate}>
                            {submitting ? "CREATING…" : "CREATE TEAM"}
                        </PixelButton>
                        <div style={{ color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, marginTop: 10, textAlign: "center", lineHeight: 1.6 }}>
                            Your team status will be PENDING until approved by a coordinator.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
