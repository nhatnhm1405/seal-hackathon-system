import { useState } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  C, GradientText, PixelCard, PixelButton, PixelBadge, PixelInput,
} from "@/shared/components/PixelComponents";
import {
  teams, tracks, events, teamMembers as initialMembers, users,
} from "@/shared/mocks/mockData";

export function TeamManagePage() {
  const { currentUser } = useAuth();
  const [members, setMembers] = useState(initialMembers);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteValue, setInviteValue] = useState("");
  const [inviteSent, setInviteSent] = useState<string | null>(null);

  if (!currentUser || !currentUser.is_leader || currentUser.team_id === null) {
    return (
      <div style={{ padding: 24 }}>
        <PixelCard style={{ padding: 24 }}>
          <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
            {!currentUser?.is_leader ? "Only team leaders can manage the team." : "You don't have a team yet."}
          </p>
        </PixelCard>
      </div>
    );
  }

  const team = teams.find(t => t.team_id === currentUser.team_id);
  const track = team ? tracks.find(tr => tr.track_id === team.track_id) : null;
  const event = track ? events.find(e => e.event_id === track.event_id) : null;
  const teamMembersList = members.filter(m => m.team_id === currentUser.team_id);

  function removeMember(userId: number) {
    setMembers(prev => prev.filter(m => !(m.team_id === currentUser?.team_id && m.user_id === userId)));
  }

  function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteValue) return;
    setInviteSent(inviteValue);
    setInviteValue("");
    setShowInvite(false);
  }

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800 }}>
          <GradientText>My Team</GradientText>
        </h1>
      </div>

      {team?.status === 'PENDING' && (
        <div style={{
          background: "rgba(234,179,8,0.08)",
          border: "1px solid rgba(234,179,8,0.35)",
          color: C.yellow,
          padding: "12px 14px",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
        }}>
          WARNING: Awaiting coordinator approval
        </div>
      )}

      {/* Team info header */}
      {team && (
        <PixelCard glow gradient style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 800 }}>
                {team.team_name}
              </div>
              <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginTop: 6 }}>
                {track?.track_name} · {event?.event_name}
              </div>
            </div>
            <PixelBadge color={team.status === 'APPROVED' ? 'green' : team.status === 'PENDING' ? 'yellow' : 'red'}>
              {team.status}
            </PixelBadge>
          </div>
        </PixelCard>
      )}

      {/* Member count */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ color: C.greenMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
          {teamMembersList.length}/5 members
        </div>
        <PixelButton variant="cyber" onClick={() => setShowInvite(!showInvite)}>
          INVITE MEMBER
        </PixelButton>
      </div>

      {showInvite && (
        <PixelCard style={{ padding: 18 }}>
          <form onSubmit={sendInvite} style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <PixelInput
                label="Email or Student ID"
                placeholder="invitee@seal.edu"
                value={inviteValue}
                onChange={(e) => setInviteValue(e.target.value)}
              />
            </div>
            <PixelButton type="submit" variant="secondary">SEND INVITE</PixelButton>
          </form>
        </PixelCard>
      )}

      {inviteSent && (
        <div style={{
          background: "rgba(34,197,94,0.08)",
          border: "1px solid rgba(34,197,94,0.35)",
          color: C.green,
          padding: "12px 14px",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
        }}>
          Invite sent to {inviteSent}
        </div>
      )}

      {/* Members table */}
      <PixelCard style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono', monospace" }}>
            <thead>
              <tr style={{ background: "linear-gradient(90deg, #0d1117, #0a1020)", borderBottom: `1px solid ${C.border}` }}>
                {["Full Name", "Email", "Student Type", "Role", "Actions"].map(h => (
                  <th key={h} style={{ color: C.green, fontSize: 10, letterSpacing: "0.12em", textAlign: "left", padding: "12px 16px", fontWeight: 600, textTransform: "uppercase" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teamMembersList.map((m, i) => {
                const user = users.find(u => u.user_id === m.user_id);
                if (!user) return null;
                return (
                  <tr key={m.user_id} style={{ borderBottom: `1px solid rgba(34,197,94,0.06)`, background: i % 2 === 0 ? C.surface : "rgba(10,12,15,0.5)" }}>
                    <td style={{ color: C.text, fontSize: 13, padding: "12px 16px" }}>{user.full_name}</td>
                    <td style={{ color: C.textMuted, fontSize: 12, padding: "12px 16px" }}>{user.email}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <PixelBadge color={user.student_type === 'FPT' ? 'green' : 'blue'}>
                        {user.student_type ?? "—"}
                      </PixelBadge>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <PixelBadge color={m.is_leader ? 'cyan' : 'gray'}>
                        {m.is_leader ? "LEADER" : "MEMBER"}
                      </PixelBadge>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {!m.is_leader && (
                        <PixelButton variant="danger" size="sm" onClick={() => removeMember(m.user_id)}>
                          REMOVE
                        </PixelButton>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </PixelCard>
    </div>
  );
}
