import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/app/providers/AuthProvider";
import { useNotifications } from "@/app/providers/NotificationProvider";
import {
  C, GradientText, PixelCard, PixelButton, PixelBadge, PixelInput,
} from "@/shared/components/PixelComponents";
import {
  teams as initialTeams, tracks, events,
  teamMembers as initialMembers, users, Team,
} from "@/shared/mocks/mockData";

// ── inline input style ───────────────────────────────────────────────
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

function onFocus(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = C.green;
  e.currentTarget.style.boxShadow = "0 0 0 1px rgba(34,197,94,0.35)";
}
function onBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = C.border;
  e.currentTarget.style.boxShadow = "none";
}

// ── Delete Confirmation Modal ────────────────────────────────────────
function DeleteConfirmModal({
  teamName,
  onConfirm,
  onCancel,
}: {
  teamName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)",
          zIndex: 400, backdropFilter: "blur(2px)",
        }}
      />
      {/* Dialog */}
      <div style={{
        position: "fixed",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 401,
        width: "min(440px, calc(100vw - 32px))",
        background: C.surface,
        border: "1px solid rgba(239,68,68,0.4)",
        boxShadow: "0 0 40px rgba(239,68,68,0.12), 0 16px 48px rgba(0,0,0,0.4)",
        padding: 32,
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, #ef4444, transparent)" }} />

        <div style={{ color: "#ef4444", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 12 }}>
          // confirm_delete
        </div>
        <h2 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 12, lineHeight: 1.2 }}>
          Delete Team?
        </h2>
        <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: 1.8, marginBottom: 24 }}>
          You are about to permanently delete{" "}
          <span style={{ color: C.text, fontWeight: 700 }}>"{teamName}"</span>.
          This action cannot be undone and all team members will be removed.
        </p>

        <div style={{ display: "flex", gap: 10 }}>
          <PixelButton variant="danger" onClick={onConfirm}>
            DELETE TEAM
          </PixelButton>
          <PixelButton variant="secondary" onClick={onCancel}>
            CANCEL
          </PixelButton>
        </div>
      </div>
    </>
  );
}

// ── Edit Team Form ───────────────────────────────────────────────────
function EditTeamForm({
  team,
  onSave,
  onCancel,
}: {
  team: Team;
  onSave: (name: string, trackId: number) => void;
  onCancel: () => void;
}) {
  const currentTrack = tracks.find(t => t.track_id === team.track_id);
  const currentEvent = currentTrack ? events.find(e => e.event_id === currentTrack.event_id) : null;
  const availableTracks = currentEvent ? tracks.filter(t => t.event_id === currentEvent.event_id) : tracks;

  const [teamName, setTeamName] = useState(team.name);
  const [trackId, setTrackId] = useState(team.track_id);
  const [error, setError] = useState<string | null>(null);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!teamName.trim()) { setError("Team name is required."); return; }
    onSave(teamName.trim(), trackId);
  }

  return (
    <PixelCard style={{ padding: 24 }}>
      <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 16 }}>
        // edit_team
      </div>

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 480 }}>
        <div>
          <label style={{ display: "block", color: C.greenMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
            Team Name
          </label>
          <input
            style={inputStyle}
            value={teamName}
            onChange={(e) => { setTeamName(e.target.value); setError(null); }}
            placeholder="e.g. ByteBuilders"
            onFocus={onFocus}
            onBlur={onBlur}
          />
        </div>

        <div>
          <label style={{ display: "block", color: C.greenMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
            Track
          </label>
          <select
            style={{ ...inputStyle, cursor: "pointer", appearance: "none", WebkitAppearance: "none" }}
            value={trackId}
            onChange={(e) => setTrackId(Number(e.target.value))}
            onFocus={onFocus}
            onBlur={onBlur}
          >
            {availableTracks.map(t => (
              <option key={t.track_id} value={t.track_id} style={{ background: C.surface2 }}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", borderLeft: "3px solid #ef4444", color: "#ef4444", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "10px 14px" }}>
            ERROR: {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <PixelButton type="submit" variant="cyber">SAVE CHANGES</PixelButton>
          <PixelButton type="button" variant="secondary" onClick={onCancel}>CANCEL</PixelButton>
        </div>
      </form>
    </PixelCard>
  );
}

// ── Main page ────────────────────────────────────────────────────────
export function TeamManagePage() {
  const navigate = useNavigate();
  const { currentUser, clearTeam } = useAuth();
  const { addToast } = useNotifications();

  const [members, setMembers] = useState(initialMembers);
  const [localTeams, setLocalTeams] = useState(initialTeams);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteValue, setInviteValue] = useState("");
  const [inviteSent, setInviteSent] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleted, setDeleted] = useState(false);

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

  if (deleted) {
    return (
      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
        <PixelCard style={{ padding: 32, textAlign: "center" }}>
          <div style={{ color: "#ef4444", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 12 }}>
            // team_deleted
          </div>
          <h2 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 12 }}>
            Team Deleted
          </h2>
          <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: 1.8, marginBottom: 24 }}>
            Your team has been removed. You can create a new team from the dashboard.
          </p>
          <PixelButton variant="cyber" onClick={() => navigate("/dashboard")}>GO TO DASHBOARD</PixelButton>
        </PixelCard>
      </div>
    );
  }

  const team = localTeams.find(t => t.team_id === currentUser.team_id);
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

  function handleSaveEdit(newName: string, newTrackId: number) {
    setLocalTeams(prev =>
      prev.map(t => t.team_id === currentUser!.team_id
        ? { ...t, team_name: newName, track_id: newTrackId }
        : t
      )
    );
    setEditing(false);
    addToast({ type: "success", title: "Team Updated", message: `"${newName}" details have been saved successfully.` });
  }

  function handleDeleteConfirm() {
    clearTeam();
    setShowDeleteConfirm(false);
    setDeleted(true);
    addToast({ type: "warning", title: "Team Deleted", message: `Your team has been removed from the event.` });
  }

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Delete confirmation modal */}
      {showDeleteConfirm && team && (
        <DeleteConfirmModal
          teamName={team.name}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

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

      {/* Edit form */}
      {editing && team && (
        <EditTeamForm
          team={team}
          onSave={handleSaveEdit}
          onCancel={() => setEditing(false)}
        />
      )}

      {/* Team info header */}
      {team && !editing && (
        <PixelCard glow gradient style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 800 }}>
                {team.name}
              </div>
              <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginTop: 6 }}>
                {track?.name} · {event?.name}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <PixelBadge color={team.status === 'APPROVED' ? 'green' : team.status === 'PENDING' ? 'yellow' : 'red'}>
                {team.status}
              </PixelBadge>
              {/* Leader-only actions */}
              <PixelButton variant="secondary" size="sm" onClick={() => setEditing(true)}>
                EDIT
              </PixelButton>
              <PixelButton variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                DELETE
              </PixelButton>
            </div>
          </div>
        </PixelCard>
      )}

      {/* Member count + invite */}
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
              <tr style={{ background: C.surface2, borderBottom: `1px solid ${C.border}` }}>
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
                  <tr key={m.user_id} style={{ borderBottom: `1px solid rgba(34,197,94,0.06)`, background: i % 2 === 0 ? C.surface : C.surface2 }}>
                    <td style={{ color: C.text, fontSize: 13, padding: "12px 16px" }}>{user.full_name}</td>
                    <td style={{ color: C.textMuted, fontSize: 12, padding: "12px 16px" }}>{user.email}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <PixelBadge color={user.student_type === 'FPT' ? 'green' : 'blue'}>
                        {user.student_type ?? "—"}
                      </PixelBadge>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <PixelBadge color={m.member_role === 'LEADER' ? 'cyan' : 'gray'}>
                        {m.member_role}
                      </PixelBadge>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {m.member_role === 'MEMBER' && (
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
