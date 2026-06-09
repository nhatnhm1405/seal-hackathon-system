import { useState } from "react";
import {
  C, GradientText, PixelCard, PixelButton, PixelBadge, PixelInput,
} from "@/shared/components/PixelComponents";
import {
  userEventRoles, users as initialUsers, rounds, events,
  UserEventRole, User,
} from "@/shared/mocks/mockData";
import { apiFetch, ApiError } from "@/shared/apiClient";

export function CoordJudgesPage() {
  const [assignments, setAssignments] = useState<UserEventRole[]>(userEventRoles.filter(r => r.role_name === 'JUDGE'));
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [showAssign, setShowAssign] = useState(false);
  const [showGuest, setShowGuest] = useState(false);

  const [searchUser, setSearchUser] = useState("");
  const [selectedJudgeId, setSelectedJudgeId] = useState<number>(0);
  const [selectedRoundId, setSelectedRoundId] = useState<number>(0);
  const [judgeType, setJudgeType] = useState<'INTERNAL' | 'GUEST'>('INTERNAL');

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPwd, setGuestPwd] = useState("");
  const [guestRoundId, setGuestRoundId] = useState<number>(0);
  const [guestError, setGuestError] = useState<string | null>(null);
  const [guestSubmitting, setGuestSubmitting] = useState(false);

  const judgeUserIds = new Set(userEventRoles.filter(r => r.role_name === 'JUDGE').map(r => r.user_id));
  const judgesPool = users.filter(u => judgeUserIds.has(u.user_id) && (searchUser === "" || u.full_name.toLowerCase().includes(searchUser.toLowerCase())));

  function assign() {
    if (!selectedJudgeId || !selectedRoundId) return;
    setAssignments(prev => [...prev, {
      id: Math.max(0, ...prev.map(a => a.id)) + 1,
      user_id: selectedJudgeId,
      role_name: 'JUDGE',
      round_id: selectedRoundId,
      event_id: null,
      track_id: null,
      judge_type: judgeType,
      assigned_at: new Date().toISOString(),
      assigned_by: null,
    }]);
    setSelectedJudgeId(0); setSelectedRoundId(0);
    setShowAssign(false);
  }

  function removeAssignment(id: number) {
    setAssignments(prev => prev.filter(a => a.id !== id));
  }

  async function createGuest() {
    if (!guestName || !guestEmail || !guestPwd || !guestRoundId) return;
    const round = rounds.find(r => r.round_id === guestRoundId);
    if (!round) return;
    setGuestError(null);
    setGuestSubmitting(true);
    try {
      const res = await apiFetch<{ data: { userId: number; email: string; fullName: string } }>(
        '/api/users/staff',
        {
          method: 'POST',
          body: JSON.stringify({
            email: guestEmail,
            password: guestPwd,
            fullName: guestName,
            roleName: 'JUDGE',
            judgeType: 'GUEST',
            eventId: round.event_id,
            roundId: guestRoundId,
          }),
        },
      );
      const created = res.data;
      setUsers(prev => [...prev, {
        user_id: created.userId,
        user_type: 'STAFF',
        email: created.email,
        full_name: created.fullName,
        student_id: null,
        university_name: 'Guest',
        is_approved: true,
        is_active: true,
      }]);
      setAssignments(prev => [...prev, {
        id: Math.max(0, ...prev.map(a => a.id)) + 1,
        user_id: created.userId,
        role_name: 'JUDGE',
        round_id: guestRoundId,
        event_id: null,
        track_id: null,
        judge_type: 'GUEST',
        assigned_at: new Date().toISOString(),
        assigned_by: null,
      }]);
      setGuestName(""); setGuestEmail(""); setGuestPwd(""); setGuestRoundId(0);
      setShowGuest(false);
    } catch (err) {
      setGuestError(err instanceof ApiError ? err.message : "Network error. Please try again.");
    } finally {
      setGuestSubmitting(false);
    }
  }

  // Group by event > round
  const eventGroups = events.map(ev => {
    const evRounds = rounds.filter(r => r.event_id === ev.event_id);
    return { event: ev, rounds: evRounds };
  });

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800 }}>
            <GradientText>Judges</GradientText>
          </h1>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <PixelButton variant="secondary" onClick={() => setShowGuest(!showGuest)}>CREATE GUEST ACCOUNT</PixelButton>
          <PixelButton variant="cyber" onClick={() => setShowAssign(!showAssign)}>ASSIGN JUDGE</PixelButton>
        </div>
      </div>

      {showAssign && (
        <PixelCard style={{ padding: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 150px auto", gap: 10, alignItems: "end" }}>
            <PixelInput label="Search Judge" value={searchUser} onChange={(e) => setSearchUser(e.target.value)} placeholder="Name..." />
            <div>
              <label style={{ color: C.greenMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>Judge</label>
              <select value={selectedJudgeId} onChange={(e) => setSelectedJudgeId(Number(e.target.value))} style={selectStyle}>
                <option value={0}>Select...</option>
                {judgesPool.map(u => <option key={u.user_id} value={u.user_id}>{u.full_name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: C.greenMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>Round</label>
              <select value={selectedRoundId} onChange={(e) => setSelectedRoundId(Number(e.target.value))} style={selectStyle}>
                <option value={0}>Select...</option>
                {rounds.map(r => <option key={r.round_id} value={r.round_id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: C.greenMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>Type</label>
              <select value={judgeType} onChange={(e) => setJudgeType(e.target.value as 'INTERNAL'|'GUEST')} style={selectStyle}>
                <option value="INTERNAL">Internal</option>
                <option value="GUEST">Guest</option>
              </select>
            </div>
            <PixelButton variant="cyber" onClick={assign}>ASSIGN</PixelButton>
          </div>
        </PixelCard>
      )}

      {showGuest && (
        <PixelCard style={{ padding: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
            <PixelInput label="Name" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
            <PixelInput label="Email" type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />
            <PixelInput label="Temp Password" type="password" value={guestPwd} onChange={(e) => setGuestPwd(e.target.value)} showToggle />
            <div>
              <label style={{ color: C.greenMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>Assign to Round</label>
              <select value={guestRoundId} onChange={(e) => setGuestRoundId(Number(e.target.value))} style={selectStyle}>
                <option value={0}>Select round...</option>
                {rounds.map(r => <option key={r.round_id} value={r.round_id}>{r.name}</option>)}
              </select>
            </div>
            <PixelButton variant="cyber" onClick={createGuest} disabled={guestSubmitting}>
              {guestSubmitting ? "..." : "CREATE"}
            </PixelButton>
          </div>
          {guestError && (
            <div style={{ marginTop: 10, color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", padding: "8px 12px" }}>
              ERROR: {guestError}
            </div>
          )}
        </PixelCard>
      )}

      {eventGroups.map(({ event, rounds: evRounds }) => (
        <PixelCard key={event.event_id} glow gradient style={{ padding: 18 }}>
          <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700, marginBottom: 14 }}>
            {event.name}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {evRounds.map(r => {
              const roundJudges = assignments.filter(a => a.round_id === r.round_id);
              return (
                <div key={r.round_id} style={{ padding: 14, background: C.surface2, border: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                    <PixelBadge color={r.status === 'ACTIVE' ? 'green' : r.status === 'UPCOMING' ? 'yellow' : 'red'}>{r.status}</PixelBadge>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {roundJudges.length === 0 && <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>No judges assigned</div>}
                    {roundJudges.map(a => {
                      const j = users.find(u => u.user_id === a.user_id);
                      return (
                        <div key={a.assignment_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: C.surface, border: `1px solid ${C.border}` }}>
                          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <span style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{j?.full_name}</span>
                            <PixelBadge color={a.judge_type === 'INTERNAL' ? 'blue' : 'cyan'}>{a.judge_type}</PixelBadge>
                          </div>
                          <PixelButton size="sm" variant="danger" onClick={() => removeAssignment(a.assignment_id)}>REMOVE</PixelButton>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </PixelCard>
      ))}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  marginTop: 6,
  padding: "10px 12px",
  background: C.surface2,
  border: `1px solid ${C.border}`,
  color: C.text,
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 12,
  borderRadius: 0,
  outline: "none",
  width: "100%",
};
