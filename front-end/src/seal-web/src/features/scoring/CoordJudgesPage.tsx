import { useState, useEffect, useCallback } from "react";
import {
  C, GradientText, PixelCard, PixelButton, PixelBadge, PixelInput,
} from "@/shared/components/PixelComponents";
import {
  eventsApi, roundsApi, tracksApi, coordinatorApi, ApiError,
  HackathonEvent, Round, Track, UserItem, JudgeRosterItem,
} from "@/shared/apiClient";

const selectStyle: React.CSSProperties = {
  marginTop: 6, padding: "10px 12px", background: C.surface2, border: `1px solid ${C.border}`,
  color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, borderRadius: 0,
  outline: "none", width: "100%",
};
const labelStyle: React.CSSProperties = {
  color: C.greenMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
  letterSpacing: "0.1em", textTransform: "uppercase",
};

function pickDefaultEvent(events: HackathonEvent[]): number | null {
  if (events.length === 0) return null;
  const active = events.find(e => e.status === 'IN_PROGRESS') ?? events.find(e => e.status === 'OPEN');
  return (active ?? events[events.length - 1]).eventId;
}

export function CoordJudgesPage() {
  const [events, setEvents] = useState<HackathonEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [staff, setStaff] = useState<UserItem[]>([]);
  const [roster, setRoster] = useState<JudgeRosterItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [showAssign, setShowAssign] = useState(false);
  const [showGuest, setShowGuest] = useState(false);
  const [searchUser, setSearchUser] = useState("");

  const [assignJudgeId, setAssignJudgeId] = useState(0);
  const [assignRoundId, setAssignRoundId] = useState(0);
  const [assignTrackId, setAssignTrackId] = useState(0);

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPwd, setGuestPwd] = useState("");
  const [guestRoundId, setGuestRoundId] = useState(0);
  const [guestTrackId, setGuestTrackId] = useState(0);
  const [guestSubmitting, setGuestSubmitting] = useState(false);

  // Load events + global staff pool once.
  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    Promise.all([
      eventsApi.getAll().then(res => res.data ?? []),
      coordinatorApi.getStaff().then(res => res.data ?? []).catch(() => [] as UserItem[]),
    ])
      .then(([evs, st]) => {
        setEvents(evs);
        setStaff(st);
        setSelectedEventId(pickDefaultEvent(evs));
      })
      .catch(err => setLoadError(err instanceof ApiError ? err.message : "Failed to load events."))
      .finally(() => setLoading(false));
  }, []);

  const loadRoster = useCallback((eventId: number) => {
    return coordinatorApi.getJudgeRoster(eventId)
      .then(res => setRoster(res.data ?? []))
      .catch(err => setActionError(err instanceof ApiError ? err.message : "Failed to load roster."));
  }, []);

  // Load rounds / tracks / roster whenever the selected event changes.
  useEffect(() => {
    if (selectedEventId == null) { setRounds([]); setTracks([]); setRoster([]); return; }
    setActionError(null);
    roundsApi.getAll(selectedEventId).then(res => setRounds(res.data ?? [])).catch(() => setRounds([]));
    tracksApi.getAll(selectedEventId).then(res => setTracks(res.data ?? [])).catch(() => setTracks([]));
    loadRoster(selectedEventId);
  }, [selectedEventId, loadRoster]);

  const staffPool = staff.filter(u =>
    searchUser === "" || u.fullName.toLowerCase().includes(searchUser.toLowerCase()));

  const assignRound = rounds.find(r => r.roundId === assignRoundId);
  const guestRound = rounds.find(r => r.roundId === guestRoundId);

  async function assign() {
    setActionError(null);
    if (!assignJudgeId || !assignRoundId) { setActionError("Select a judge and a round."); return; }
    if (assignRound && !assignRound.isFinal && !assignTrackId) { setActionError("Preliminary rounds require a track."); return; }
    try {
      await coordinatorApi.assignJudge({
        judgeUserId: assignJudgeId,
        roundId: assignRoundId,
        trackId: assignRound?.isFinal ? null : assignTrackId,
      });
      setAssignJudgeId(0); setAssignRoundId(0); setAssignTrackId(0);
      setShowAssign(false);
      if (selectedEventId != null) await loadRoster(selectedEventId);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to assign judge.");
    }
  }

  async function removeAssignment(id: number) {
    setActionError(null);
    try {
      await coordinatorApi.removeJudgeAssignment(id);
      setRoster(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to remove assignment.");
    }
  }

  async function createGuest() {
    setActionError(null);
    if (!guestName || !guestEmail || !guestPwd || !guestRoundId) { setActionError("Fill in all guest fields and pick a round."); return; }
    if (guestRound && !guestRound.isFinal && !guestTrackId) { setActionError("Preliminary rounds require a track."); return; }
    setGuestSubmitting(true);
    try {
      await coordinatorApi.createGuestJudge({
        fullName: guestName,
        email: guestEmail,
        password: guestPwd,
        roundId: guestRoundId,
        trackId: guestRound?.isFinal ? null : guestTrackId,
      });
      setGuestName(""); setGuestEmail(""); setGuestPwd(""); setGuestRoundId(0); setGuestTrackId(0);
      setShowGuest(false);
      // Refresh staff (new guest) + roster.
      coordinatorApi.getStaff().then(res => setStaff(res.data ?? [])).catch(() => {});
      if (selectedEventId != null) await loadRoster(selectedEventId);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to create guest judge.");
    } finally {
      setGuestSubmitting(false);
    }
  }

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800 }}>
            <GradientText>Judges</GradientText>
          </h1>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <label style={labelStyle}>Event</label>
            <select value={selectedEventId ?? 0} onChange={(e) => setSelectedEventId(Number(e.target.value) || null)} style={{ ...selectStyle, width: 220 }}>
              {events.length === 0 && <option value={0}>No events</option>}
              {events.map(ev => <option key={ev.eventId} value={ev.eventId}>{ev.name}</option>)}
            </select>
          </div>
          <PixelButton variant="secondary" onClick={() => { setShowGuest(s => !s); setShowAssign(false); }}>CREATE GUEST ACCOUNT</PixelButton>
          <PixelButton variant="cyber" onClick={() => { setShowAssign(s => !s); setShowGuest(false); }}>ASSIGN JUDGE</PixelButton>
        </div>
      </div>

      {loadError && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "10px 14px" }}>
          ERROR: {loadError}
        </div>
      )}
      {actionError && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "10px 14px" }}>
          ERROR: {actionError}
        </div>
      )}

      {showAssign && (
        <PixelCard style={{ padding: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
            <PixelInput label="Search Judge" value={searchUser} onChange={(e) => setSearchUser(e.target.value)} placeholder="Name..." />
            <div>
              <label style={labelStyle}>Judge</label>
              <select value={assignJudgeId} onChange={(e) => setAssignJudgeId(Number(e.target.value))} style={selectStyle}>
                <option value={0}>Select...</option>
                {staffPool.map(u => <option key={u.userId} value={u.userId}>{u.fullName}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Round</label>
              <select value={assignRoundId} onChange={(e) => { setAssignRoundId(Number(e.target.value)); setAssignTrackId(0); }} style={selectStyle}>
                <option value={0}>Select...</option>
                {rounds.map(r => <option key={r.roundId} value={r.roundId}>{r.name}{r.isFinal ? " (Final)" : ""}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Track</label>
              <select value={assignTrackId} onChange={(e) => setAssignTrackId(Number(e.target.value))} style={selectStyle} disabled={!assignRound || assignRound.isFinal}>
                <option value={0}>{assignRound?.isFinal ? "All tracks (final)" : "Select..."}</option>
                {!assignRound?.isFinal && tracks.map(t => <option key={t.trackId} value={t.trackId}>{t.name}</option>)}
              </select>
            </div>
            <PixelButton variant="cyber" onClick={assign}>ASSIGN</PixelButton>
          </div>
        </PixelCard>
      )}

      {showGuest && (
        <PixelCard style={{ padding: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
            <PixelInput label="Name" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
            <PixelInput label="Email" type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />
            <PixelInput label="Temp Password" type="password" value={guestPwd} onChange={(e) => setGuestPwd(e.target.value)} showToggle />
            <div>
              <label style={labelStyle}>Round</label>
              <select value={guestRoundId} onChange={(e) => { setGuestRoundId(Number(e.target.value)); setGuestTrackId(0); }} style={selectStyle}>
                <option value={0}>Select round...</option>
                {rounds.map(r => <option key={r.roundId} value={r.roundId}>{r.name}{r.isFinal ? " (Final)" : ""}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Track</label>
              <select value={guestTrackId} onChange={(e) => setGuestTrackId(Number(e.target.value))} style={selectStyle} disabled={!guestRound || guestRound.isFinal}>
                <option value={0}>{guestRound?.isFinal ? "All tracks (final)" : "Select..."}</option>
                {!guestRound?.isFinal && tracks.map(t => <option key={t.trackId} value={t.trackId}>{t.name}</option>)}
              </select>
            </div>
            <PixelButton variant="cyber" onClick={createGuest} disabled={guestSubmitting}>
              {guestSubmitting ? "..." : "CREATE"}
            </PixelButton>
          </div>
        </PixelCard>
      )}

      {loading && (
        <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>Loading...</div>
      )}

      {!loading && rounds.length === 0 && (
        <PixelCard style={{ padding: 18 }}>
          <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
            This event has no rounds yet.
          </div>
        </PixelCard>
      )}

      {!loading && rounds.map(r => {
        const roundJudges = roster.filter(a => a.roundId === r.roundId);
        return (
          <PixelCard key={r.roundId} glow gradient style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 700 }}>
                {r.name}{r.isFinal ? " · Final" : ""}
              </div>
              {r.status && <PixelBadge color={r.status === 'ACTIVE' ? 'green' : r.status === 'UPCOMING' ? 'yellow' : 'gray'}>{r.status}</PixelBadge>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {roundJudges.length === 0 && (
                <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>No judges assigned</div>
              )}
              {roundJudges.map(a => (
                <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: C.surface, border: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{a.judgeName}</span>
                    {a.judgeType && <PixelBadge color={a.judgeType === 'INTERNAL' ? 'blue' : 'cyan'}>{a.judgeType}</PixelBadge>}
                    <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{a.trackName ?? "All tracks"}</span>
                  </div>
                  <PixelButton size="sm" variant="danger" onClick={() => removeAssignment(a.id)}>REMOVE</PixelButton>
                </div>
              ))}
            </div>
          </PixelCard>
        );
      })}
    </div>
  );
}
