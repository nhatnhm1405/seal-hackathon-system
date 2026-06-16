import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  C, GradientText, PixelCard, PixelButton, PixelBadge, PixelInput,
} from "@/shared/components/PixelComponents";
import { teamsApi, invitesApi, joinRequestsApi, ApiError, MyTeam, MyTeamMember, UserItem, JoinRequest } from "@/shared/apiClient";

function statusBadgeColor(status?: string): "green" | "yellow" | "red" | "gray" {
  const s = (status ?? "").toUpperCase();
  if (s === "APPROVED") return "green";
  if (s === "PENDING") return "yellow";
  if (s === "REJECTED" || s === "DISQUALIFIED") return "red";
  return "gray";
}

export function TeamViewPage() {
  const navigate = useNavigate();
  const { currentUser, refreshTeamContext } = useAuth();

  const [team, setTeam] = useState<MyTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const [showInvite, setShowInvite] = useState(false);
  const [inviteQuery, setInviteQuery] = useState("");
  const [inviteResults, setInviteResults] = useState<UserItem[]>([]);
  const [searching, setSearching] = useState(false);

  const [transferTarget, setTransferTarget] = useState<MyTeamMember | null>(null);
  const [removeTarget, setRemoveTarget] = useState<MyTeamMember | null>(null);

  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [busyReq, setBusyReq] = useState<number | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const loadJoinRequests = useCallback((teamId: number) => {
    joinRequestsApi.getForTeam(teamId).then(r => setJoinRequests(r.data ?? [])).catch(() => setJoinRequests([]));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    teamsApi.getMy()
      .then(res => {
        setTeam(res.data);
        if (res.data?.myRole === 'LEADER') loadJoinRequests(res.data.teamId);
      })
      .catch(err => {
        if (err instanceof ApiError && err.status === 404) setTeam(null);
        else setLoadError(err instanceof ApiError ? err.message : "Failed to load your team.");
      })
      .finally(() => setLoading(false));
  }, [loadJoinRequests]);

  useEffect(() => { load(); }, [load]);

  const isLeader = team?.myRole === 'LEADER';

  if (loading) {
    return <div style={{ padding: 24 }}><PixelCard style={{ padding: 32, textAlign: "center" }}>
      <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>Loading...</p>
    </PixelCard></div>;
  }

  if (!team) {
    return (
      <div style={{ padding: 24 }}>
        <PixelCard style={{ padding: 32, textAlign: "center" }}>
          <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, marginBottom: 20 }}>
            {loadError ?? "You are not part of any team yet."}
          </p>
          {!loadError && <PixelButton variant="cyber" onClick={() => navigate('/team/create')}>CREATE A TEAM</PixelButton>}
        </PixelCard>
      </div>
    );
  }

  async function saveName() {
    if (!team || !nameInput.trim() || nameInput.trim() === team.name) { setEditingName(false); return; }
    setBusy(true); setActionError(null);
    try {
      const res = await teamsApi.update(team.teamId, { name: nameInput.trim() });
      setTeam(res.data);
      setEditingName(false);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to rename team.");
    } finally { setBusy(false); }
  }

  async function doSearch() {
    const q = inviteQuery.trim();
    if (q.length < 2) { setInviteResults([]); return; }
    setSearching(true);
    try {
      const res = await teamsApi.searchUsers(q);
      setInviteResults(res.data ?? []);
    } catch { setInviteResults([]); }
    finally { setSearching(false); }
  }

  async function sendInvite(user: UserItem) {
    if (!team) return;
    setActionError(null); setNotice(null);
    try {
      await invitesApi.send(team.teamId, { invitedUserId: user.userId });
      setNotice(`Invitation sent to ${user.fullName}. They will appear once they accept.`);
      setInviteQuery(""); setInviteResults([]); setShowInvite(false);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to send invite.");
    }
  }

  async function acceptJoin(r: JoinRequest) {
    if (!team) return;
    setBusyReq(r.requestId); setActionError(null); setNotice(null);
    try {
      await joinRequestsApi.accept(r.requestId);
      const res = await teamsApi.getMy();
      setTeam(res.data);
      loadJoinRequests(team.teamId);
      setNotice(`${r.requesterName} has joined the team.`);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to accept request.");
    } finally { setBusyReq(null); }
  }

  async function declineJoin(r: JoinRequest) {
    setBusyReq(r.requestId); setActionError(null);
    try {
      await joinRequestsApi.decline(r.requestId);
      setJoinRequests(prev => prev.filter(x => x.requestId !== r.requestId));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to decline request.");
    } finally { setBusyReq(null); }
  }

  async function removeMember(m: MyTeamMember) {
    if (!team) return;
    setBusy(true); setActionError(null);
    try {
      const res = await teamsApi.removeMember(team.teamId, m.userId);
      setTeam(res.data);
      setRemoveTarget(null);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to remove member.");
    } finally { setBusy(false); }
  }

  async function confirmTransfer() {
    if (!team || !transferTarget) return;
    setBusy(true); setActionError(null);
    try {
      const res = await teamsApi.transferLeadership(team.teamId, transferTarget.userId);
      setTeam(res.data);
      await refreshTeamContext();
      setTransferTarget(null);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to transfer leadership.");
    } finally { setBusy(false); }
  }

  async function leaveTeam() {
    if (!team) return;
    setBusy(true); setActionError(null);
    try {
      await teamsApi.leave(team.teamId);
      await refreshTeamContext();
      navigate('/dashboard');
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to leave team.");
    } finally { setBusy(false); }
  }

  const memberRows = team.members ?? [];

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {editingName ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              value={nameInput} onChange={e => setNameInput(e.target.value)} autoFocus
              onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
              style={{ background: C.surface2, border: `1px solid ${C.green}`, color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 800, padding: "4px 10px", outline: "none", borderRadius: 0 }}
            />
            <PixelButton size="sm" variant="cyber" onClick={saveName} disabled={busy}>SAVE</PixelButton>
            <PixelButton size="sm" variant="ghost" onClick={() => setEditingName(false)}>CANCEL</PixelButton>
          </div>
        ) : (
          <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800, lineHeight: 1.1 }}>
            <GradientText>{team.name}</GradientText>
          </h1>
        )}
        <PixelBadge color={statusBadgeColor(team.status)}>{team.status ?? "—"}</PixelBadge>
        {isLeader && !editingName && (
          <button onClick={() => { setNameInput(team.name); setEditingName(true); }}
            style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, padding: "4px 8px", cursor: "pointer", borderRadius: 0, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            EDIT NAME
          </button>
        )}
      </div>

      {team.status === 'PENDING' && (
        <div style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.4)", color: "#eab308", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, padding: "12px 16px" }}>
          Your team is awaiting coordinator approval. You cannot submit until approved.
        </div>
      )}

      {actionError && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "10px 14px" }}>ERROR: {actionError}</div>
      )}
      {notice && (
        <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.35)", color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, padding: "10px 14px" }}>{notice}</div>
      )}

      {/* Info */}
      <PixelCard style={{ padding: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
          <InfoCell label="Event" value={team.eventName ?? "—"} />
          <InfoCell label="Track" value={team.trackName ?? "—"} />
          <InfoCell label="Members" value={`${memberRows.length}/5`} accent />
          <InfoCell label="Your role" value={team.myRole ?? "—"} />
        </div>
      </PixelCard>

      {/* Members */}
      <PixelCard style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <span style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 700 }}>Members</span>
          {isLeader && memberRows.length < 5 && (
            <PixelButton size="sm" variant="cyber" onClick={() => { setShowInvite(s => !s); setInviteResults([]); setInviteQuery(""); }}>
              {showInvite ? "CLOSE" : "INVITE MEMBER"}
            </PixelButton>
          )}
        </div>

        {showInvite && (
          <div style={{ padding: "12px 18px", background: "rgba(34,197,94,0.04)", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <PixelInput label="Search by name, email or student ID" placeholder="min 2 characters"
                  value={inviteQuery}
                  onChange={e => setInviteQuery(e.target.value)}
                />
              </div>
              <PixelButton size="sm" variant="secondary" onClick={doSearch} disabled={searching}>{searching ? "…" : "SEARCH"}</PixelButton>
            </div>
            {inviteResults.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                {inviteResults.map(u => (
                  <div key={u.userId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: C.surface2, border: `1px solid ${C.border}` }}>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{u.fullName}</span>
                      <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>{u.email}{u.studentId ? ` · ${u.studentId}` : ""}</div>
                    </div>
                    <PixelButton size="sm" variant="cyber" onClick={() => sendInvite(u)}>INVITE</PixelButton>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono', monospace" }}>
            <thead>
              <tr style={{ background: C.surface2, borderBottom: `1px solid ${C.border}` }}>
                {["Member", "Role", ...(isLeader ? ["Actions"] : [])].map(h => (
                  <th key={h} style={{ color: C.green, fontSize: 10, letterSpacing: "0.12em", textAlign: "left", padding: "11px 14px", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {memberRows.map((m, i) => {
                const isSelf = currentUser?.user_id === m.userId;
                return (
                  <tr key={m.userId} style={{ borderBottom: `1px solid rgba(34,197,94,0.06)`, background: i % 2 === 0 ? C.surface : C.surface2 }}>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: m.role === 'LEADER' ? 700 : 400 }}>{m.memberName}</span>
                      {isSelf && <span style={{ color: C.textMuted, fontSize: 10, marginLeft: 6 }}>(you)</span>}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <PixelBadge color={m.role === 'LEADER' ? 'cyan' : 'blue'}>{m.role === 'LEADER' ? "Leader" : "Member"}</PixelBadge>
                    </td>
                    {isLeader && (
                      <td style={{ padding: "11px 14px" }}>
                        {m.role === 'MEMBER' && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <PixelButton size="sm" variant="ghost" onClick={() => setTransferTarget(m)} disabled={busy}>TRANSFER LEAD</PixelButton>
                            <PixelButton size="sm" variant="danger" onClick={() => setRemoveTarget(m)} disabled={busy}>REMOVE</PixelButton>
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

      {/* Join requests (leader only) */}
      {isLeader && (
        <PixelCard glow={joinRequests.length > 0} glowColor="cyan" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ color: C.cyan, fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 700 }}>Join Requests</span>
          </div>
          {joinRequests.length === 0 ? (
            <div style={{ padding: "14px 18px" }}>
              <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, margin: 0 }}>
                No pending requests.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {joinRequests.map(r => (
                <div key={r.requestId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "12px 18px", borderTop: `1px solid rgba(34,197,94,0.06)`, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600 }}>{r.requesterName}</div>
                    <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginTop: 2 }}>
                      {r.requesterEmail ?? ""}{r.message ? ` — "${r.message}"` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <PixelButton size="sm" variant="cyber" onClick={() => acceptJoin(r)} disabled={busyReq === r.requestId || memberRows.length >= 5}>ACCEPT</PixelButton>
                    <PixelButton size="sm" variant="danger" onClick={() => declineJoin(r)} disabled={busyReq === r.requestId}>DECLINE</PixelButton>
                  </div>
                </div>
              ))}
              {memberRows.length >= 5 && (
                <div style={{ padding: "0 18px 12px", color: "#eab308", fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                  Team is full (5/5) — remove a member before accepting new requests.
                </div>
              )}
            </div>
          )}
        </PixelCard>
      )}

      {/* Leave */}
      <div>
        <PixelButton variant="danger" onClick={() => setConfirmLeave(true)} disabled={busy}>LEAVE TEAM</PixelButton>
        {isLeader && memberRows.length > 1 && (
          <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginLeft: 12 }}>
            (transfer leadership first)
          </span>
        )}
      </div>

      {/* Leave confirmation modal */}
      {confirmLeave && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(7,12,15,0.85)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <PixelCard glow style={{ padding: 32, maxWidth: 440, width: "90%", display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 700, lineHeight: 1.5 }}>
                Leave <span style={{ color: C.red }}>{team.name}</span>?
              </div>
              <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginTop: 10, lineHeight: 1.7 }}>
                {isLeader && memberRows.length > 1
                  ? "As leader you must transfer leadership before leaving."
                  : isLeader
                    ? "You are the only member — leaving will disband this team."
                    : "You will be removed from the team and can be re-invited later."}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <PixelButton
                variant="danger"
                onClick={async () => { await leaveTeam(); setConfirmLeave(false); }}
                disabled={busy || (isLeader && memberRows.length > 1)}
              >
                CONFIRM LEAVE
              </PixelButton>
              <PixelButton variant="ghost" onClick={() => setConfirmLeave(false)}>CANCEL</PixelButton>
            </div>
          </PixelCard>
        </div>
      )}

      {/* Remove member confirmation modal */}
      {removeTarget && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(7,12,15,0.85)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <PixelCard glow style={{ padding: 32, maxWidth: 440, width: "90%", display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 700, lineHeight: 1.5 }}>
                Remove <span style={{ color: C.red }}>{removeTarget.memberName}</span> from the team?
              </div>
              <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginTop: 10, lineHeight: 1.7 }}>
                They will lose access to this team and can be re-invited later.
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <PixelButton variant="danger" onClick={() => removeMember(removeTarget)} disabled={busy}>CONFIRM REMOVE</PixelButton>
              <PixelButton variant="ghost" onClick={() => setRemoveTarget(null)} disabled={busy}>CANCEL</PixelButton>
            </div>
          </PixelCard>
        </div>
      )}

      {/* Transfer modal */}
      {transferTarget && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(7,12,15,0.85)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <PixelCard glow style={{ padding: 32, maxWidth: 440, width: "90%", display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 700, lineHeight: 1.5 }}>
                Transfer leadership to <span style={{ color: C.green }}>{transferTarget.memberName}</span>?
              </div>
              <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginTop: 10, lineHeight: 1.7 }}>
                You will become a regular member and lose management, invite and submit controls.
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <PixelButton variant="danger" onClick={confirmTransfer} disabled={busy}>CONFIRM TRANSFER</PixelButton>
              <PixelButton variant="ghost" onClick={() => setTransferTarget(null)}>CANCEL</PixelButton>
            </div>
          </PixelCard>
        </div>
      )}
    </div>
  );
}

function InfoCell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ color: accent ? C.green : C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
