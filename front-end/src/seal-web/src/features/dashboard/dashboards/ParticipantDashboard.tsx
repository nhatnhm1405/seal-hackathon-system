import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/app/providers/AuthProvider";
import { useNotifications } from "@/app/providers/NotificationProvider";
import {
  C, GradientText, PixelCard, PixelButton, PixelBadge, CyberStatCard,
} from "@/shared/components/PixelComponents";
import {
  teams, tracks, events, rounds, submissions, rankings, auditLogs, users,
  teamInvites, TeamInvite,
  HackathonEvent, Track,
} from "@/shared/mocks/mockData";

// ── helpers ────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const TRACK_SPOTS_LEFT: Record<number, number> = { 1: 4, 2: 7, 3: 9, 4: 2 };

type Screen = 'dashboard' | 'create' | 'success';

interface FormState {
  teamName: string;
  eventId: number | null;
  trackId: number | null;
}

// ── badge color helpers ────────────────────────────────────────────
function roundBadgeColor(status: string) {
  if (status === 'ACTIVE')   return { bg: "rgba(34,197,94,0.14)",  color: "#22c55e", shadow: "0 0 8px rgba(34,197,94,0.35)" };
  if (status === 'UPCOMING') return { bg: "rgba(234,179,8,0.12)",  color: "#eab308", shadow: "none" };
  return                            { bg: "rgba(239,68,68,0.10)",  color: "#ef4444", shadow: "none" };
}

// ══════════════════════════════════════════════════════════════════
// SCREEN 2 — Event Detail Drawer
// ══════════════════════════════════════════════════════════════════
function EventDetailDrawer({
  event,
  onClose,
  onCreateTeam,
}: {
  event: HackathonEvent;
  onClose: () => void;
  onCreateTeam: (eventId: number, trackId: number) => void;
}) {
  const eventTracks  = tracks.filter(t => t.event_id === event.event_id);
  const eventRounds  = rounds.filter(r => r.event_id === event.event_id);
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
        background: C.surface,
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
          background: C.surface,
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
              <GradientText>{event.event_name}</GradientText>
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
                      {tr.track_name}
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
                      Max teams: {tr.max_teams}
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
                    {/* Timeline track */}
                    <div style={{ width: 28, display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                      <div style={{
                        width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                        background: r.status === 'ACTIVE' ? C.green : r.status === 'CLOSED' ? "rgba(255,255,255,0.2)" : "transparent",
                        border: r.status === 'ACTIVE' ? `2px solid ${C.green}` : r.status === 'UPCOMING' ? `2px solid rgba(234,179,8,0.5)` : `2px solid rgba(255,255,255,0.2)`,
                        boxShadow: r.status === 'ACTIVE' ? `0 0 8px rgba(34,197,94,0.5)` : "none",
                        marginTop: 14,
                      }} />
                      {!isLast && (
                        <div style={{ flex: 1, width: 2, background: C.border, minHeight: 24, marginTop: 4 }} />
                      )}
                    </div>

                    {/* Round content */}
                    <div style={{
                      flex: 1,
                      padding: "10px 14px 16px",
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 12,
                    }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700 }}>
                            Round {r.round_order} — {r.round_name}
                          </span>
                        </div>
                        <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                          Deadline: {fmtDate(r.submission_deadline)}
                        </div>
                      </div>
                      <div style={{
                        background: badge.bg,
                        color: badge.color,
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 9, letterSpacing: "0.12em",
                        padding: "3px 10px",
                        flexShrink: 0,
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

// ══════════════════════════════════════════════════════════════════
// SCREEN 3 — Create Team Form
// ══════════════════════════════════════════════════════════════════
function CreateTeamScreen({
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

  const openEvents   = events.filter(e => e.status === 'OPEN');
  const eventTracks  = form.eventId ? tracks.filter(t => t.event_id === form.eventId) : [];
  const selectedTrack = form.trackId ? tracks.find(t => t.track_id === form.trackId) : null;
  const selectedEvent = form.eventId ? events.find(e => e.event_id === form.eventId) : null;
  const spotsLeft     = form.trackId ? (TRACK_SPOTS_LEFT[form.trackId] ?? 5) : null;
  const canSubmit     = form.teamName.trim() !== "" && form.eventId !== null && form.trackId !== null;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    background: C.surface2,
    border: `1px solid ${C.border}`,
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
    e.currentTarget.style.borderColor = C.border;
    e.currentTarget.style.boxShadow = "none";
  }

  return (
    <div style={{ padding: "28px 24px", maxWidth: 560, margin: "0 auto" }}>
      {/* Back link */}
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

      {/* Header */}
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

      {/* Form card */}
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
        {/* Top glow line */}
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
            <option value="" style={{ background: C.surface2 }}>— Select an event —</option>
            {openEvents.map(ev => (
              <option key={ev.event_id} value={ev.event_id} style={{ background: C.surface2 }}>{ev.event_name}</option>
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
            <option value="" style={{ background: C.surface2 }}>— Select a track —</option>
            {eventTracks.map(tr => (
              <option key={tr.track_id} value={tr.track_id} style={{ background: C.surface2 }}>{tr.track_name}</option>
            ))}
          </select>

          {/* Track info badge */}
          {selectedTrack && spotsLeft !== null && (
            <div style={{
              marginTop: 8,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(6,182,212,0.08)",
              border: "1px solid rgba(6,182,212,0.25)",
              color: "#06b6d4",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              letterSpacing: "0.06em",
              padding: "4px 12px",
            }}>
              Max teams: {selectedTrack.max_teams} · {spotsLeft} spots left
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
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}>
            <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.1em", marginBottom: 2 }}>
              TEAM SUMMARY
            </div>
            {[
              { label: "Event",  value: selectedEvent.event_name },
              { label: "Track",  value: selectedTrack.track_name },
              { label: "Role",   value: "Team Leader" },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", gap: 12 }}>
                <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, minWidth: 48 }}>{label}</span>
                <span style={{ color: C.text,      fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700 }}>{value}</span>
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
          <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, marginTop: 10, textAlign: "center", lineHeight: 1.6, opacity: 0.65 }}>
            Your team status will be PENDING until approved by a coordinator.
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SCREEN 4 — Success / Pending State
// ══════════════════════════════════════════════════════════════════
function SuccessScreen({
  teamName,
  onDashboard,
  onViewTeam,
}: {
  teamName: string;
  onDashboard: () => void;
  onViewTeam: () => void;
}) {
  return (
    <div style={{ padding: "60px 24px", display: "flex", justifyContent: "center" }}>
      <div style={{ maxWidth: 480, width: "100%" }}>
        <div style={{
          position: "relative",
          padding: 40,
          textAlign: "center",
          overflow: "hidden",
          border: "1px solid transparent",
          background: `linear-gradient(${C.surface}, ${C.surface}) padding-box, linear-gradient(135deg, rgba(34,197,94,0.5), rgba(59,130,246,0.4), rgba(34,197,94,0.2)) border-box`,
          boxShadow: "0 0 40px rgba(34,197,94,0.12), 0 0 80px rgba(59,130,246,0.08)",
        }}>
          {/* Corner accent */}
          <div style={{ position: "absolute", top: 0, left: 0, width: 16, height: 16, borderTop: `2px solid ${C.green}`, borderLeft: `2px solid ${C.green}` }} />
          <div style={{ position: "absolute", bottom: 0, right: 0, width: 16, height: 16, borderBottom: `2px solid ${C.blue}`, borderRight: `2px solid ${C.blue}` }} />
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${C.green}, ${C.blue}, transparent)`, opacity: 0.7 }} />

          {/* Checkmark */}
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "rgba(34,197,94,0.1)",
            border: `2px solid rgba(34,197,94,0.5)`,
            boxShadow: "0 0 20px rgba(34,197,94,0.3), 0 0 40px rgba(34,197,94,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 24px",
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M4 12l5 5L20 7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Heading */}
          <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 900, fontSize: 30, lineHeight: 1.1, marginBottom: 14 }}>
            <GradientText>Team Created!</GradientText>
          </h1>

          {/* Team name */}
          <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 12 }}>
            {teamName}
          </div>

          {/* Subtext */}
          <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: 1.8, marginBottom: 24 }}>
            Your team is now pending coordinator approval. You can submit your project once approved.
          </p>

          {/* PENDING badge */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(234,179,8,0.1)",
            border: "1px solid rgba(234,179,8,0.4)",
            color: "#eab308",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            letterSpacing: "0.14em",
            padding: "5px 16px",
            marginBottom: 32,
          }}>
            <span style={{ width: 6, height: 6, background: "#eab308", borderRadius: "50%", display: "inline-block" }} />
            PENDING APPROVAL
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <PixelButton variant="cyber" size="lg" fullWidth onClick={onDashboard}>
              GO TO MY DASHBOARD
            </PixelButton>
            <PixelButton variant="secondary" size="lg" fullWidth onClick={onViewTeam}>
              VIEW TEAM
            </PixelButton>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// INVITATIONS DRAWER
// ══════════════════════════════════════════════════════════════════
function InvitationsDrawer({
  userId,
  onClose,
  onAccept,
  onDecline,
}: {
  userId: number;
  onClose: () => void;
  onAccept: (invite: TeamInvite) => void;
  onDecline: (invite: TeamInvite) => void;
}) {
  const [localStatus, setLocalStatus] = useState<Record<number, 'ACCEPTED' | 'DECLINED'>>({});

  const myInvites = teamInvites.filter(inv => inv.invited_user_id === userId);

  function getStatus(inv: TeamInvite): 'PENDING' | 'ACCEPTED' | 'DECLINED' {
    return localStatus[inv.invite_id] ?? inv.status;
  }

  function handleAccept(inv: TeamInvite) {
    setLocalStatus(s => ({ ...s, [inv.invite_id]: 'ACCEPTED' }));
    onAccept(inv);
  }

  function handleDecline(inv: TeamInvite) {
    setLocalStatus(s => ({ ...s, [inv.invite_id]: 'DECLINED' }));
    onDecline(inv);
  }

  const mono = "'JetBrains Mono', monospace";

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
        width: "min(520px, 100vw)",
        background: C.surface,
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
          justifyContent: "space-between",
          flexShrink: 0,
          position: "sticky",
          top: 0,
          background: C.surface,
          zIndex: 1,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={onClose}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: C.textMuted, padding: "2px 6px",
                display: "flex", alignItems: "center", gap: 6,
                fontFamily: mono, fontSize: 12,
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.green; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
            >
              ← Back
            </button>
            <span style={{ color: C.green, fontFamily: mono, fontSize: 11, letterSpacing: "0.1em" }}>
              // team_invitations
            </span>
          </div>
          <div style={{
            background: "rgba(59,130,246,0.12)",
            border: "1px solid rgba(59,130,246,0.3)",
            color: C.blue,
            fontFamily: mono,
            fontSize: 10,
            letterSpacing: "0.1em",
            padding: "2px 10px",
          }}>
            {myInvites.filter(inv => getStatus(inv) === 'PENDING').length} PENDING
          </div>
        </div>

        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Info banner */}
          <div style={{
            background: "rgba(59,130,246,0.06)",
            border: `1px solid rgba(59,130,246,0.2)`,
            borderLeft: `3px solid ${C.blue}`,
            padding: "12px 16px",
            fontFamily: mono,
            fontSize: 11,
            color: C.textMuted,
            lineHeight: 1.7,
          }}>
            Team leaders can invite you directly. Accept an invite to join their team and start competing together.
          </div>

          {myInvites.length === 0 ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", padding: "60px 24px", gap: 16, textAlign: "center",
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "rgba(134,239,172,0.06)",
                border: `1px solid ${C.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke={C.textMuted} strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="9" cy="7" r="4" stroke={C.textMuted} strokeWidth="1.5"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke={C.textMuted} strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div style={{ color: C.textMuted, fontFamily: mono, fontSize: 12 }}>No invitations yet</div>
              <div style={{ color: "rgba(134,239,172,0.4)", fontFamily: mono, fontSize: 10, lineHeight: 1.7 }}>
                When a team leader invites you,<br />it will appear here.
              </div>
            </div>
          ) : (
            myInvites.map(inv => {
              const status = getStatus(inv);
              const team   = teams.find(t => t.team_id === inv.team_id);
              const track  = team ? tracks.find(tr => tr.track_id === team.track_id) : null;
              const event  = track ? events.find(e => e.event_id === track.event_id) : null;
              const leader = users.find(u => u.user_id === inv.invited_by);

              const statusStyle: Record<string, React.CSSProperties> = {
                PENDING:  { bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.25)", color: C.blue },
                ACCEPTED: { bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.3)",  color: C.green },
                DECLINED: { bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.25)", color: "#ef4444" },
              };
              const s = statusStyle[status];

              return (
                <div
                  key={inv.invite_id}
                  style={{
                    background: C.surface2,
                    border: `1px solid ${status === 'ACCEPTED' ? 'rgba(34,197,94,0.3)' : status === 'DECLINED' ? 'rgba(239,68,68,0.2)' : C.border}`,
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    position: "relative",
                    overflow: "hidden",
                    opacity: status !== 'PENDING' ? 0.7 : 1,
                    transition: "opacity 0.2s, border-color 0.2s",
                  }}
                >
                  {/* Top accent */}
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: 2,
                    background: status === 'ACCEPTED'
                      ? `linear-gradient(90deg, ${C.green}, transparent)`
                      : status === 'DECLINED'
                        ? "linear-gradient(90deg, #ef4444, transparent)"
                        : `linear-gradient(90deg, ${C.blue}, transparent)`,
                    opacity: 0.6,
                  }} />

                  {/* Team name + status */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div>
                      <div style={{ color: C.text, fontFamily: mono, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                        {team?.team_name ?? "Unknown Team"}
                      </div>
                      <div style={{ color: C.textMuted, fontFamily: mono, fontSize: 11 }}>
                        {event?.event_name ?? "—"} · {track?.track_name ?? "—"}
                      </div>
                    </div>
                    <div style={{
                      background: s.bg as string,
                      border: `1px solid ${s.border as string}`,
                      color: s.color as string,
                      fontFamily: mono,
                      fontSize: 9,
                      letterSpacing: "0.12em",
                      padding: "3px 10px",
                      flexShrink: 0,
                    }}>
                      {status}
                    </div>
                  </div>

                  {/* Team info chips */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={{
                      background: team?.status === 'APPROVED' ? "rgba(34,197,94,0.08)" : "rgba(234,179,8,0.08)",
                      border: `1px solid ${team?.status === 'APPROVED' ? "rgba(34,197,94,0.25)" : "rgba(234,179,8,0.25)"}`,
                      color: team?.status === 'APPROVED' ? C.green : "#eab308",
                      fontFamily: mono, fontSize: 9, letterSpacing: "0.1em", padding: "2px 10px",
                    }}>
                      TEAM {team?.status ?? "UNKNOWN"}
                    </span>
                    <span style={{
                      background: "rgba(6,182,212,0.08)",
                      border: "1px solid rgba(6,182,212,0.2)",
                      color: "#06b6d4",
                      fontFamily: mono, fontSize: 9, letterSpacing: "0.1em", padding: "2px 10px",
                    }}>
                      {track?.track_name ?? "—"}
                    </span>
                  </div>

                  {/* Message */}
                  <div style={{
                    background: "rgba(0,0,0,0.2)",
                    border: `1px solid ${C.border}`,
                    padding: "10px 14px",
                    color: C.textMuted,
                    fontFamily: mono,
                    fontSize: 11,
                    lineHeight: 1.7,
                    fontStyle: "italic",
                  }}>
                    "{inv.message}"
                  </div>

                  {/* From + date */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ color: "rgba(134,239,172,0.5)", fontFamily: mono, fontSize: 10 }}>
                      From <span style={{ color: C.textMuted }}>{leader?.full_name ?? "Team Leader"}</span>
                    </div>
                    <div style={{ color: "rgba(134,239,172,0.35)", fontFamily: mono, fontSize: 10 }}>
                      {fmtShort(inv.created_at)}
                    </div>
                  </div>

                  {/* Action buttons */}
                  {status === 'PENDING' && (
                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        onClick={() => handleAccept(inv)}
                        style={{
                          flex: 1,
                          padding: "9px 12px",
                          background: "rgba(34,197,94,0.1)",
                          border: `1px solid rgba(34,197,94,0.4)`,
                          color: C.green,
                          fontFamily: mono,
                          fontSize: 11,
                          letterSpacing: "0.06em",
                          cursor: "pointer",
                          borderRadius: 0,
                          fontWeight: 700,
                          transition: "background 0.15s, box-shadow 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "rgba(34,197,94,0.2)";
                          (e.currentTarget as HTMLElement).style.boxShadow = `0 0 12px rgba(34,197,94,0.25)`;
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "rgba(34,197,94,0.1)";
                          (e.currentTarget as HTMLElement).style.boxShadow = "none";
                        }}
                      >
                        ACCEPT INVITE
                      </button>
                      <button
                        onClick={() => handleDecline(inv)}
                        style={{
                          padding: "9px 16px",
                          background: "rgba(239,68,68,0.06)",
                          border: "1px solid rgba(239,68,68,0.25)",
                          color: "#ef4444",
                          fontFamily: mono,
                          fontSize: 11,
                          letterSpacing: "0.06em",
                          cursor: "pointer",
                          borderRadius: 0,
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.12)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.06)";
                        }}
                      >
                        DECLINE
                      </button>
                    </div>
                  )}

                  {status === 'ACCEPTED' && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      color: C.green, fontFamily: mono, fontSize: 11, fontWeight: 700,
                    }}>
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                        <path d="M4 12l5 5L20 7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Invite accepted — welcome to the team!
                    </div>
                  )}

                  {status === 'DECLINED' && (
                    <div style={{
                      color: "rgba(239,68,68,0.7)", fontFamily: mono, fontSize: 11,
                    }}>
                      Invitation declined.
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════
// SCREEN 1 — No-Team Dashboard (Join an Event)
// ══════════════════════════════════════════════════════════════════
function NoTeamDashboard({
  onCreateTeam,
  onViewDetails,
  onWaitForInvite,
  pendingTeamName,
  pendingInviteCount,
}: {
  onCreateTeam: (eventId?: number, trackId?: number) => void;
  onViewDetails: (event: HackathonEvent) => void;
  onWaitForInvite: () => void;
  pendingTeamName: string | null;
  pendingInviteCount: number;
}) {
  const openEvents = events.filter(e => e.status === 'OPEN');

  return (
    <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header hero card */}
      <div style={{
        position: "relative",
        background: `linear-gradient(${C.surface}, ${C.surface}) padding-box, linear-gradient(135deg, rgba(34,197,94,0.45), rgba(59,130,246,0.35), rgba(34,197,94,0.15)) border-box`,
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
          <div style={{ position: "relative", display: "inline-flex" }}>
            <PixelButton variant="ghost" onClick={onWaitForInvite}>
              WAIT FOR INVITE
            </PixelButton>
            {pendingInviteCount > 0 && (
              <span style={{
                position: "absolute",
                top: -8,
                right: -8,
                minWidth: 18,
                height: 18,
                borderRadius: "50%",
                background: C.blue,
                color: "#fff",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 0 8px rgba(59,130,246,0.6)`,
                pointerEvents: "none",
              }}>
                {pendingInviteCount}
              </span>
            )}
          </div>
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
            const eventTracks  = tracks.filter(t => t.event_id === ev.event_id);
            const eventRounds  = rounds.filter(r => r.event_id === ev.event_id);
            const activeRound  = eventRounds.find(r => r.status === 'ACTIVE');

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
                {/* Top accent line */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${C.green}, transparent)`, opacity: 0.5 }} />
                <div style={{ position: "absolute", top: 0, left: 0, width: 10, height: 10, borderTop: `2px solid ${C.green}`, borderLeft: `2px solid ${C.green}` }} />

                {/* Row 1: name + badge */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700 }}>
                    {ev.event_name}
                  </div>
                  <PixelBadge color="green">OPEN</PixelBadge>
                </div>

                {/* Date range */}
                <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginBottom: 10 }}>
                  {fmtShort(ev.start_date)} — {fmtShort(ev.end_date)}
                </div>

                {/* Meta info */}
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.textMuted, marginBottom: 12 }}>
                  {eventTracks.length} tracks · {eventRounds.length} rounds ·{" "}
                  {activeRound ? (
                    <span>Qualifier <span style={{ color: C.green, fontWeight: 700 }}>ACTIVE</span></span>
                  ) : (
                    <span>No active round</span>
                  )}
                </div>

                {/* Track badges */}
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

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <PixelButton variant="cyber" onClick={() => onCreateTeam(ev.event_id)}>
                    REGISTER & CREATE TEAM
                  </PixelButton>
                  <PixelButton
                    variant="secondary"
                    onClick={() => onViewDetails(ev)}
                  >
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

// ══════════════════════════════════════════════════════════════════
// Main export — handles routing between all 4 screens
// ══════════════════════════════════════════════════════════════════
export function ParticipantDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { addToast } = useNotifications();

  const [screen, setScreen]           = useState<Screen>('dashboard');
  const [drawerEvent, setDrawerEvent] = useState<HackathonEvent | null>(null);
  const [createEventId, setCreateEventId] = useState<number | null>(null);
  const [createTrackId, setCreateTrackId] = useState<number | null>(null);
  const [pendingTeamName, setPendingTeamName] = useState<string | null>(null);
  const [showInvites, setShowInvites]   = useState(false);
  const [declinedIds, setDeclinedIds]   = useState<number[]>([]);
  const [acceptedIds, setAcceptedIds]   = useState<number[]>([]);

  if (!currentUser) return null;

  const { is_leader, team_id } = currentUser;

  const myPendingInvites = teamInvites.filter(
    inv => inv.invited_user_id === currentUser.user_id
      && inv.status === 'PENDING'
      && !declinedIds.includes(inv.invite_id)
      && !acceptedIds.includes(inv.invite_id)
  );

  function handleAcceptInvite(inv: TeamInvite) {
    setAcceptedIds(ids => [...ids, inv.invite_id]);
    const team = teams.find(t => t.team_id === inv.team_id);
    addToast({
      type: "success",
      title: "Invite Accepted!",
      message: `You've joined team "${team?.team_name ?? "Unknown"}". The team leader has been notified.`,
    });
  }

  function handleDeclineInvite(inv: TeamInvite) {
    setDeclinedIds(ids => [...ids, inv.invite_id]);
    const team = teams.find(t => t.team_id === inv.team_id);
    addToast({
      type: "info",
      title: "Invite Declined",
      message: `You declined the invitation from "${team?.team_name ?? "Unknown"}".`,
    });
  }

  // ── participant WITH a team — existing dashboard ──────────────
  if (team_id !== null) {
    return <ExistingTeamDashboard is_leader={is_leader} team_id={team_id} />;
  }

  // ── SUCCESS screen ────────────────────────────────────────────
  if (screen === 'success' && pendingTeamName) {
    return (
      <SuccessScreen
        teamName={pendingTeamName}
        onDashboard={() => setScreen('dashboard')}
        onViewTeam={() => setScreen('dashboard')}
      />
    );
  }

  // ── CREATE TEAM screen ────────────────────────────────────────
  if (screen === 'create') {
    return (
      <CreateTeamScreen
        initialEventId={createEventId}
        initialTrackId={createTrackId}
        onBack={() => { setScreen('dashboard'); setDrawerEvent(null); }}
        onSubmit={({ teamName }) => {
          setPendingTeamName(teamName);
          setDrawerEvent(null);
          setScreen('success');
          addToast({
            type: "success",
            title: "Team Created!",
            message: `"${teamName}" is pending coordinator approval.`,
          });
        }}
      />
    );
  }

  // ── DASHBOARD (Screen 1) ──────────────────────────────────────
  return (
    <div style={{ position: "relative" }}>
      <NoTeamDashboard
        pendingTeamName={pendingTeamName}
        pendingInviteCount={myPendingInvites.length}
        onCreateTeam={(eventId, trackId) => {
          setCreateEventId(eventId ?? null);
          setCreateTrackId(trackId ?? null);
          setDrawerEvent(null);
          setScreen('create');
        }}
        onViewDetails={(ev) => setDrawerEvent(ev)}
        onWaitForInvite={() => setShowInvites(true)}
      />

      {/* Invitations drawer */}
      {showInvites && (
        <InvitationsDrawer
          userId={currentUser.user_id}
          onClose={() => setShowInvites(false)}
          onAccept={handleAcceptInvite}
          onDecline={handleDeclineInvite}
        />
      )}

      {/* Event detail drawer */}
      {drawerEvent && (
        <EventDetailDrawer
          event={drawerEvent}
          onClose={() => setDrawerEvent(null)}
          onCreateTeam={(eventId, trackId) => {
            setCreateEventId(eventId);
            setCreateTrackId(trackId);
            setDrawerEvent(null);
            setScreen('create');
          }}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Existing-team dashboard (unchanged logic, just extracted)
// ══════════════════════════════════════════════════════════════════
function ExistingTeamDashboard({ is_leader, team_id }: { is_leader: boolean; team_id: number }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  if (!currentUser) return null;

  const team        = teams.find(t => t.team_id === team_id);
  const track       = team ? tracks.find(tr => tr.track_id === team.track_id) : null;
  const event       = track ? events.find(e => e.event_id === track.event_id) : null;
  const activeRound = rounds.find(r => r.status === 'ACTIVE');
  const latestSub   = team ? submissions.find(s => s.team_id === team.team_id && s.round_id === 2) : null;
  const round1Rank  = team ? rankings.find(r => r.team_id === team.team_id && r.round_id === 1) : null;
  const recentLogs  = [...auditLogs].slice(-3).reverse();

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
            {is_leader ? `Leading` : `Member of`} {team?.team_name ?? "—"}
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
            <InfoRow label="Team"          value={team.team_name} />
            <InfoRow label="Track"         value={track?.track_name ?? "—"} />
            <InfoRow label="Event"         value={event?.event_name ?? "—"} />
            <InfoRow label="Current Round" value={activeRound?.round_name ?? "—"} badge={activeRound?.status} />
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
          value={round1Rank ? `#${round1Rank.position}` : "—"}
          label="Last Round Rank"
          accent="blue"
          sublabel={round1Rank ? `Score: ${round1Rank.total_score.toFixed(1)}` : "No data"}
        />
        <CyberStatCard
          value={activeRound ? fmtDate(activeRound.submission_deadline) : "—"}
          label="Next Deadline"
          accent="cyan"
          sublabel={activeRound?.round_name}
        />
      </div>

      <PixelCard style={{ padding: 20 }}>
        <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 12 }}>
          // activity_feed
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {recentLogs.map(log => {
            const actor = users.find(u => u.user_id === log.performed_by);
            return (
              <div key={log.log_id} style={{
                display: "flex", gap: 12, padding: "10px 12px",
                background: C.surface2, border: `1px solid ${C.border}`,
              }}>
                <div style={{ width: 6, height: 6, background: C.green, marginTop: 6, flexShrink: 0, boxShadow: `0 0 6px ${C.green}` }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{log.details}</div>
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
