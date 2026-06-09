import { useState } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  C, GradientText, PixelCard, PixelButton, PixelBadge, PixelInput,
} from "@/shared/components/PixelComponents";
import {
  teams, tracks, events, teamMembers as initialTeamMembers, users, TeamMember,
} from "@/shared/mocks/mockData";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function TeamViewPage() {
  const { currentUser, updateLeaderStatus } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>(initialTeamMembers);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteQuery, setInviteQuery] = useState("");
  const [inviteResult, setInviteResult] = useState<string | null>(null);
  const [transferTarget, setTransferTarget] = useState<TeamMember | null>(null);

  if (!currentUser || currentUser.team_id === null) {
    return (
      <div style={{ padding: 24 }}>
        <PixelCard style={{ padding: 24 }}>
          <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
            You are not part of any team yet.
          </p>
        </PixelCard>
      </div>
    );
  }

  const team = teams.find(t => t.team_id === currentUser.team_id)!;
  if (!team) return null;

  const track = tracks.find(tr => tr.track_id === team.track_id);
  const event = track ? events.find(e => e.event_id === track.event_id) : null;
  const teamMemberRows = members.filter(m => m.team_id === team.team_id);
  const displayName = teamName ?? team.name;
  const isLeader = currentUser.is_leader;

  const statusColor = team.status === 'APPROVED' ? 'green' : team.status === 'PENDING' ? 'yellow' : 'red';

  function handleInvite() {
    const q = inviteQuery.trim().toLowerCase();
    if (!q) return;
    const found = users.find(u =>
      u.email.toLowerCase() === q || u.student_id?.toLowerCase() === q
    );
    if (!found) {
      setInviteResult("No user found with that email or student ID.");
      return;
    }
    const alreadyMember = teamMemberRows.some(m => m.user_id === found.user_id);
    if (alreadyMember) {
      setInviteResult(`${found.full_name} is already on the team.`);
      return;
    }
    if (teamMemberRows.length >= 5) {
      setInviteResult("Team is full (maximum 5 members).");
      return;
    }
    setMembers(prev => [...prev, {
      team_id: team.team_id,
      user_id: found.user_id,
      joined_at: new Date().toISOString(),
      member_role: 'MEMBER' as const,
    }]);
    setInviteResult(`${found.full_name} has been invited and added to the team.`);
    setInviteQuery("");
    setShowInvite(false);
    setTimeout(() => setInviteResult(null), 3000);
  }

  function handleRemove(userId: number) {
    setMembers(prev => prev.filter(m => !(m.team_id === team.team_id && m.user_id === userId)));
  }

  function handleTransferConfirm() {
    if (!transferTarget) return;
    setMembers(prev => prev.map(m => {
      if (m.team_id !== team.team_id) return m;
      if (m.user_id === currentUser!.user_id) return { ...m, member_role: 'MEMBER' as const };
      if (m.user_id === transferTarget.user_id) return { ...m, member_role: 'LEADER' as const };
      return m;
    }));
    updateLeaderStatus(false);
    setTransferTarget(null);
  }

  function handleSaveName() {
    if (nameInput.trim()) setTeamName(nameInput.trim());
    setEditingName(false);
    setNameInput("");
  }

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {editingName ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                autoFocus
                style={{
                  background: C.surface2,
                  border: `1px solid ${C.green}`,
                  color: C.text,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 24,
                  fontWeight: 800,
                  padding: "4px 10px",
                  outline: "none",
                  borderRadius: 0,
                }}
              />
              <PixelButton size="sm" variant="cyber" onClick={handleSaveName}>SAVE</PixelButton>
              <PixelButton size="sm" variant="ghost" onClick={() => setEditingName(false)}>CANCEL</PixelButton>
            </div>
          ) : (
            <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800, lineHeight: 1.1 }}>
              <GradientText>{displayName}</GradientText>
            </h1>
          )}
          <PixelBadge color={statusColor}>{team.status}</PixelBadge>
          {isLeader && !editingName && (
            <button
              onClick={() => { setNameInput(displayName); setEditingName(true); }}
              style={{
                background: "transparent",
                border: `1px solid ${C.border}`,
                color: C.textMuted,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                padding: "4px 8px",
                cursor: "pointer",
                borderRadius: 0,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              EDIT NAME
            </button>
          )}
        </div>
      </div>

      {/* Pending banner */}
      {team.status === 'PENDING' && (
        <div style={{
          background: "rgba(234,179,8,0.08)",
          border: "1px solid rgba(234,179,8,0.4)",
          color: "#eab308",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          padding: "12px 16px",
          letterSpacing: "0.01em",
        }}>
          Your team is awaiting coordinator approval. You cannot submit until approved.
        </div>
      )}

      {/* Team info */}
      <PixelCard style={{ padding: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
          <InfoCell label="Track" value={track?.name ?? "—"} />
          <InfoCell label="Event" value={event?.name ?? "—"} />
          <InfoCell label="Members" value={`${teamMemberRows.length}/5`} accent />
        </div>
      </PixelCard>

      {/* Member list */}
      <PixelCard style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {isLeader && teamMemberRows.length < 5 && (
            <PixelButton size="sm" variant="cyber" onClick={() => { setShowInvite(s => !s); setInviteResult(null); }}>
              {showInvite ? "CANCEL INVITE" : "INVITE MEMBER"}
            </PixelButton>
          )}
        </div>

        {/* Invite form */}
        {showInvite && (
          <div style={{ padding: "12px 18px", background: "rgba(34,197,94,0.04)", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <PixelInput
                label="Search by email or student ID"
                placeholder="se000000 or user@seal.edu"
                value={inviteQuery}
                onChange={e => setInviteQuery(e.target.value)}
              />
            </div>
            <PixelButton size="sm" variant="cyber" onClick={handleInvite}>ADD</PixelButton>
          </div>
        )}

        {inviteResult && (
          <div style={{ padding: "8px 18px", background: "rgba(34,197,94,0.06)", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{inviteResult}</span>
          </div>
        )}

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono', monospace" }}>
            <thead>
              <tr style={{ background: C.surface2, borderBottom: `1px solid ${C.border}` }}>
                {["Full Name", "Student Type", "Student ID", "Role", "Joined", ...(isLeader ? ["Actions"] : [])].map(h => (
                  <th key={h} style={{ color: C.green, fontSize: 10, letterSpacing: "0.12em", textAlign: "left", padding: "11px 14px", fontWeight: 600, textTransform: "uppercase" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teamMemberRows.map((m, i) => {
                const u = users.find(uu => uu.user_id === m.user_id);
                if (!u) return null;
                const isSelf = m.user_id === currentUser.user_id;
                return (
                  <tr key={m.user_id} style={{ borderBottom: `1px solid rgba(34,197,94,0.06)`, background: i % 2 === 0 ? C.surface : C.surface2 }}>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: m.member_role === 'LEADER' ? 700 : 400 }}>{u.full_name}</span>
                      {isSelf && <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, marginLeft: 6 }}>(you)</span>}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <PixelBadge color={u.student_type === 'FPT' ? 'green' : 'cyan'}>{u.student_type ?? "—"}</PixelBadge>
                    </td>
                    <td style={{ color: C.textMuted, fontSize: 11, padding: "11px 14px" }}>{u.student_id ?? "—"}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <PixelBadge color={m.member_role === 'LEADER' ? 'cyan' : 'blue'}>{m.member_role === 'LEADER' ? "Leader" : "Member"}</PixelBadge>
                    </td>
                    <td style={{ color: C.textMuted, fontSize: 11, padding: "11px 14px" }}>{fmtDate(m.joined_at)}</td>
                    {isLeader && (
                      <td style={{ padding: "11px 14px" }}>
                        {m.member_role === 'MEMBER' && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <PixelButton
                              size="sm"
                              variant="ghost"
                              onClick={() => setTransferTarget(m)}
                            >
                              TRANSFER LEAD
                            </PixelButton>
                            <PixelButton
                              size="sm"
                              variant="danger"
                              onClick={() => handleRemove(m.user_id)}
                            >
                              REMOVE
                            </PixelButton>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </PixelCard>

      {/* Transfer Leadership Modal */}
      {transferTarget && (() => {
        const targetUser = users.find(u => u.user_id === transferTarget.user_id);
        return (
          <div style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(7,12,15,0.85)",
            backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <PixelCard glow style={{ padding: 32, maxWidth: 440, width: "90%", display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 700, lineHeight: 1.5 }}>
                  Transfer leadership to{" "}
                  <span style={{ color: C.green }}>{targetUser?.full_name}</span>?
                </div>
                <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginTop: 10, lineHeight: 1.7 }}>
                  You will become a regular member and lose access to team management, invite, and submit controls.
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <PixelButton variant="danger" onClick={handleTransferConfirm}>CONFIRM TRANSFER</PixelButton>
                <PixelButton variant="ghost" onClick={() => setTransferTarget(null)}>CANCEL</PixelButton>
              </div>
            </PixelCard>
          </div>
        );
      })()}
    </div>
  );
}

function InfoCell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ color: accent ? C.green : C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 600 }}>
        {value}
      </div>
    </div>
  );
}
