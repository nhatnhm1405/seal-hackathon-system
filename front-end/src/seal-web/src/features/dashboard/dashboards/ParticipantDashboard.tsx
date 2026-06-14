import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  C, GradientText, PixelCard, PixelButton, PixelBadge,
} from "@/shared/components/PixelComponents";
import {
  teamsApi, roundsApi, invitesApi, ApiError, MyTeam, Round, TeamInvite,
} from "@/shared/apiClient";

function fmtDate(iso?: string) {
  return iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
}

function statusColor(status?: string): "green" | "yellow" | "red" | "gray" {
  const s = (status ?? "").toUpperCase();
  if (s === "APPROVED") return "green";
  if (s === "PENDING") return "yellow";
  if (s === "REJECTED" || s === "DISQUALIFIED") return "red";
  return "gray";
}

export function ParticipantDashboard() {
  const navigate = useNavigate();
  const { currentUser, refreshTeamContext } = useAuth();

  const [team, setTeam] = useState<MyTeam | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [busyInvite, setBusyInvite] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    // Pending invites (works whether or not the user has a team).
    invitesApi.getPending().then(res => setInvites(res.data ?? [])).catch(() => setInvites([]));
    // Team + rounds.
    try {
      const t = (await teamsApi.getMy()).data;
      setTeam(t);
      if (t?.eventId != null) {
        const rs = await roundsApi.getAll(t.eventId).then(r => r.data ?? []).catch(() => []);
        setRounds([...rs].sort((a, b) => (a.orderNumber ?? a.roundId) - (b.orderNumber ?? b.roundId)));
      } else {
        setRounds([]);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) { setTeam(null); setRounds([]); }
      else setError(err instanceof ApiError ? err.message : "Failed to load dashboard.");
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  async function accept(inviteId: number) {
    setBusyInvite(inviteId); setError(null);
    try {
      await invitesApi.accept(inviteId);
      await refreshTeamContext();
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to accept invite.");
    } finally { setBusyInvite(null); }
  }

  async function decline(inviteId: number) {
    setBusyInvite(inviteId);
    try {
      await invitesApi.decline(inviteId);
      setInvites(prev => prev.filter(i => i.inviteId !== inviteId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to decline invite.");
    } finally { setBusyInvite(null); }
  }

  if (!currentUser) return null;
  const isLeader = team?.myRole === 'LEADER' || currentUser.is_leader;

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <PixelCard glow gradient style={{ padding: 24 }}>
        <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.15em", marginBottom: 6 }}>PARTICIPANT</div>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 800, lineHeight: 1.2 }}>
          <GradientText>Good day, {currentUser.full_name}</GradientText>
        </h1>
      </PixelCard>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "10px 14px" }}>ERROR: {error}</div>
      )}

      {/* Pending invites */}
      {invites.length > 0 && (
        <PixelCard glow glowColor="cyan" style={{ padding: 20 }}>
          <div style={{ color: C.cyan, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.15em", marginBottom: 12 }}>// team_invitations</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {invites.map(inv => (
              <div key={inv.inviteId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "12px 14px", background: C.surface2, border: `1px solid ${C.border}`, flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600 }}>{inv.teamName}</div>
                  <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginTop: 2 }}>
                    Invited by {inv.invitedByName}{inv.eventName ? ` · ${inv.eventName}` : ""}{inv.message ? ` — "${inv.message}"` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <PixelButton size="sm" variant="cyber" onClick={() => accept(inv.inviteId)} disabled={busyInvite === inv.inviteId}>ACCEPT</PixelButton>
                  <PixelButton size="sm" variant="danger" onClick={() => decline(inv.inviteId)} disabled={busyInvite === inv.inviteId}>DECLINE</PixelButton>
                </div>
              </div>
            ))}
          </div>
        </PixelCard>
      )}

      {/* Team status / no-team CTA */}
      {team ? (
        <PixelCard style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
            <div>
              <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700 }}>{team.name}</div>
              <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginTop: 4 }}>
                {team.eventName ?? "—"} · {team.trackName ?? "—"} · {team.members?.length ?? 0}/5 members
              </div>
            </div>
            <PixelBadge color={statusColor(team.status)}>{team.status ?? "—"}</PixelBadge>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <PixelButton size="sm" variant="secondary" onClick={() => navigate('/team/view')}>MY TEAM</PixelButton>
            {isLeader && <PixelButton size="sm" variant="cyber" onClick={() => navigate('/team/submit')}>SUBMIT PROJECT</PixelButton>}
            <PixelButton size="sm" variant="ghost" onClick={() => navigate('/leaderboard')}>LEADERBOARD</PixelButton>
          </div>
        </PixelCard>
      ) : (
        <PixelCard style={{ padding: 20 }}>
          <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, marginBottom: 14 }}>
            You are not in a team yet. Create one, or accept an invitation above.
          </div>
          <PixelButton variant="cyber" onClick={() => navigate('/team/create')}>CREATE TEAM</PixelButton>
        </PixelCard>
      )}

      {/* Rounds */}
      {team && rounds.length > 0 && (
        <PixelCard style={{ padding: 20 }}>
          <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.15em", marginBottom: 12 }}>// rounds</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rounds.map(r => (
              <div key={r.roundId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: C.surface2, border: `1px solid ${C.border}` }}>
                <div>
                  <span style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600 }}>{r.name}{r.isFinal ? " · Final" : ""}</span>
                  <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginLeft: 8 }}>Deadline {fmtDate(r.submissionDeadline)}</span>
                </div>
                {r.status && <PixelBadge color={["ACTIVE", "OPEN"].includes((r.status).toUpperCase()) ? "green" : "gray"}>{r.status}</PixelBadge>}
              </div>
            ))}
          </div>
        </PixelCard>
      )}
    </div>
  );
}
