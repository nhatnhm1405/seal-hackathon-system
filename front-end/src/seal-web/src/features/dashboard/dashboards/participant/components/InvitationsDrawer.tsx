import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { C, PixelButton, PixelInput } from "@/shared/components/PixelComponents";
import {
    invitesApi, joinRequestsApi,
    TeamInvite, JoinableTeam, JoinRequest, ApiError, apiErrorMessage,
} from "@/shared/apiClient";
import { useNotifications } from "@/app/providers/NotificationProvider";
import { fmtShort } from "../utils/formatters";

const mono = "'JetBrains Mono', monospace";

export function InvitationsDrawer({ onClose }: { onClose: () => void }) {
    const { refreshTeamContext } = useAuth();
    const { addToast } = useNotifications();

    const [invites, setInvites] = useState<TeamInvite[]>([]);
    const [localStatus, setLocalStatus] = useState<Record<number, 'ACCEPTED' | 'DECLINED'>>({});
    const [busy, setBusy] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Find-a-team search
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<JoinableTeam[]>([]);
    const [myRequests, setMyRequests] = useState<JoinRequest[]>([]);
    const [searching, setSearching] = useState(false);
    const [searched, setSearched] = useState(false);

    const loadInvites = useCallback(() => {
        invitesApi.getPending().then(r => setInvites(r.data ?? [])).catch(() => setInvites([]));
    }, []);
    const loadRequests = useCallback(() => {
        joinRequestsApi.getMine()
            .then(r => setMyRequests((r.data ?? []).filter(req => req.status === 'PENDING')))
            .catch(() => setMyRequests([]));
    }, []);

    useEffect(() => { loadInvites(); loadRequests(); }, [loadInvites, loadRequests]);

    function getStatus(inv: TeamInvite): 'PENDING' | 'ACCEPTED' | 'DECLINED' {
        return localStatus[inv.inviteId] ?? (inv.status as 'PENDING' | 'ACCEPTED' | 'DECLINED');
    }

    async function handleAccept(inv: TeamInvite) {
        setBusy(inv.inviteId); setError(null);
        try {
            await invitesApi.accept(inv.inviteId);
            setLocalStatus(s => ({ ...s, [inv.inviteId]: 'ACCEPTED' }));
            await refreshTeamContext();
            addToast({ type: "success", title: "Invite accepted", message: `You've joined "${inv.teamName}".` });
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to accept invite.");
            addToast({ type: "warning", title: "Accept failed", message: apiErrorMessage(err, "Failed to accept invite.") });
        } finally { setBusy(null); }
    }

    async function handleDecline(inv: TeamInvite) {
        setBusy(inv.inviteId); setError(null);
        try {
            await invitesApi.decline(inv.inviteId);
            setLocalStatus(s => ({ ...s, [inv.inviteId]: 'DECLINED' }));
            addToast({ type: "info", title: "Invite declined", message: `You declined the invite from "${inv.teamName}".` });
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to decline invite.");
            addToast({ type: "warning", title: "Decline failed", message: apiErrorMessage(err, "Failed to decline invite.") });
        } finally { setBusy(null); }
    }

    async function doSearch() {
        setSearching(true); setError(null);
        try {
            const res = await joinRequestsApi.getJoinableTeams({ query: query.trim() || undefined });
            setResults(res.data?.teams ?? []);
            setSearched(true);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Search failed.");
        } finally { setSearching(false); }
    }

    async function requestToJoin(team: JoinableTeam) {
        setBusy(team.teamId); setError(null);
        try {
            await joinRequestsApi.send(team.teamId);
            setResults(prev => prev.map(t => t.teamId === team.teamId ? { ...t, alreadyRequested: true } : t));
            loadRequests();
            addToast({ type: "success", title: "Request sent", message: `Your request to join "${team.name}" was sent.` });
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to send join request.");
            addToast({ type: "warning", title: "Request failed", message: apiErrorMessage(err, "Failed to send join request.") });
        } finally { setBusy(null); }
    }

    const pendingCount = invites.filter(inv => getStatus(inv) === 'PENDING').length;

    const statusStyle: Record<string, { bg: string; border: string; color: string }> = {
        PENDING: { bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.25)", color: C.blue },
        ACCEPTED: { bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.3)", color: C.green },
        DECLINED: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: "#ef4444" },
    };

    return (
        <>
            {/* Backdrop */}
            <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, backdropFilter: "blur(2px)" }} />

            {/* Drawer */}
            <div style={{
                position: "fixed", top: 0, right: 0, bottom: 0, width: "min(520px, 100vw)",
                background: C.surface, borderLeft: `1px solid ${C.border}`, zIndex: 201,
                overflowY: "auto", display: "flex", flexDirection: "column", boxShadow: "-8px 0 40px rgba(0,0,0,0.6)",
            }}>
                {/* Header */}
                <div style={{
                    padding: "16px 24px", borderBottom: `1px solid ${C.border}`, display: "flex",
                    alignItems: "center", justifyContent: "space-between", flexShrink: 0,
                    position: "sticky", top: 0, background: C.surface, zIndex: 1,
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <button
                            onClick={onClose}
                            style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted, padding: "2px 6px", display: "flex", alignItems: "center", gap: 6, fontFamily: mono, fontSize: 12, transition: "color 0.15s" }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.green; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
                        >
                            ← Back
                        </button>
                        <span style={{ color: C.green, fontFamily: mono, fontSize: 15, fontWeight: 700 }}>Team Invitations</span>
                    </div>
                    <div style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)", color: C.blue, fontFamily: mono, fontSize: 10, letterSpacing: "0.1em", padding: "2px 10px" }}>
                        {pendingCount} PENDING
                    </div>
                </div>

                <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>
                    {error && (
                        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: mono, fontSize: 11, padding: "10px 14px" }}>ERROR: {error}</div>
                    )}

                    {/* Info banner */}
                    <div style={{ background: "rgba(59,130,246,0.06)", border: `1px solid rgba(59,130,246,0.2)`, borderLeft: `3px solid ${C.blue}`, padding: "12px 16px", fontFamily: mono, fontSize: 11, color: C.textMuted, lineHeight: 1.7 }}>
                        Team leaders can invite you directly. Accept an invite to join their team — or search for a team below and request to join.
                    </div>

                    {/* Received invites */}
                    {invites.length === 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", gap: 16, textAlign: "center" }}>
                            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(134,239,172,0.06)", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke={C.textMuted} strokeWidth="1.5" strokeLinecap="round" />
                                    <circle cx="9" cy="7" r="4" stroke={C.textMuted} strokeWidth="1.5" />
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke={C.textMuted} strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                            </div>
                            <div style={{ color: C.textMuted, fontFamily: mono, fontSize: 12 }}>No invitations yet</div>
                        </div>
                    ) : (
                        invites.map(inv => {
                            const status = getStatus(inv);
                            const s = statusStyle[status];
                            return (
                                <div key={inv.inviteId} style={{
                                    background: C.surface2,
                                    border: `1px solid ${status === 'ACCEPTED' ? 'rgba(34,197,94,0.3)' : status === 'DECLINED' ? 'rgba(239,68,68,0.2)' : C.border}`,
                                    padding: "20px", display: "flex", flexDirection: "column", gap: 14,
                                    position: "relative", overflow: "hidden",
                                    opacity: status !== 'PENDING' ? 0.7 : 1, transition: "opacity 0.2s, border-color 0.2s",
                                }}>
                                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: status === 'ACCEPTED' ? `linear-gradient(90deg, ${C.green}, transparent)` : status === 'DECLINED' ? "linear-gradient(90deg, #ef4444, transparent)" : `linear-gradient(90deg, ${C.blue}, transparent)`, opacity: 0.6 }} />

                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                                        <div>
                                            <div style={{ color: C.text, fontFamily: mono, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{inv.teamName}</div>
                                            <div style={{ color: C.textMuted, fontFamily: mono, fontSize: 11 }}>{inv.eventName ?? "—"} · {inv.trackName ?? "—"}</div>
                                        </div>
                                        <div style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color, fontFamily: mono, fontSize: 9, letterSpacing: "0.12em", padding: "3px 10px", flexShrink: 0 }}>{status}</div>
                                    </div>

                                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                        <span style={{
                                            background: inv.teamStatus === 'APPROVED' ? "rgba(34,197,94,0.08)" : "rgba(234,179,8,0.08)",
                                            border: `1px solid ${inv.teamStatus === 'APPROVED' ? "rgba(34,197,94,0.25)" : "rgba(234,179,8,0.25)"}`,
                                            color: inv.teamStatus === 'APPROVED' ? C.green : "#eab308",
                                            fontFamily: mono, fontSize: 9, letterSpacing: "0.1em", padding: "2px 10px",
                                        }}>
                                            TEAM {inv.teamStatus ?? "—"}
                                        </span>
                                        {inv.trackName && (
                                            <span style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)", color: "#06b6d4", fontFamily: mono, fontSize: 9, letterSpacing: "0.1em", padding: "2px 10px" }}>{inv.trackName}</span>
                                        )}
                                    </div>

                                    {inv.message && (
                                        <div style={{ background: "rgba(0,0,0,0.2)", border: `1px solid ${C.border}`, padding: "10px 14px", color: C.textMuted, fontFamily: mono, fontSize: 11, lineHeight: 1.7, fontStyle: "italic" }}>
                                            "{inv.message}"
                                        </div>
                                    )}

                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <div style={{ color: "rgba(134,239,172,0.5)", fontFamily: mono, fontSize: 10 }}>
                                            From <span style={{ color: C.textMuted }}>{inv.invitedByName}</span>
                                        </div>
                                        <div style={{ color: "rgba(134,239,172,0.35)", fontFamily: mono, fontSize: 10 }}>{fmtShort(inv.createdAt)}</div>
                                    </div>

                                    {status === 'PENDING' && (
                                        <div style={{ display: "flex", gap: 10 }}>
                                            <button
                                                onClick={() => handleAccept(inv)}
                                                disabled={busy === inv.inviteId}
                                                style={{ flex: 1, padding: "9px 12px", background: "rgba(34,197,94,0.1)", border: `1px solid rgba(34,197,94,0.4)`, color: C.green, fontFamily: mono, fontSize: 11, letterSpacing: "0.06em", cursor: "pointer", borderRadius: 0, fontWeight: 700 }}
                                            >
                                                ACCEPT INVITE
                                            </button>
                                            <button
                                                onClick={() => handleDecline(inv)}
                                                disabled={busy === inv.inviteId}
                                                style={{ padding: "9px 16px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", fontFamily: mono, fontSize: 11, letterSpacing: "0.06em", cursor: "pointer", borderRadius: 0 }}
                                            >
                                                DECLINE
                                            </button>
                                        </div>
                                    )}

                                    {status === 'ACCEPTED' && (
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.green, fontFamily: mono, fontSize: 11, fontWeight: 700 }}>
                                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M4 12l5 5L20 7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                            Invite accepted — welcome to the team!
                                        </div>
                                    )}
                                    {status === 'DECLINED' && (
                                        <div style={{ color: "rgba(239,68,68,0.7)", fontFamily: mono, fontSize: 11 }}>Invitation declined.</div>
                                    )}
                                </div>
                            );
                        })
                    )}

                    {/* Find a team to join */}
                    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20 }}>
                        <div style={{ color: C.green, fontFamily: mono, fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Find a Team</div>
                        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                            <div style={{ flex: 1 }}>
                                <PixelInput label="Search teams with open seats (blank = all)" placeholder="e.g. ByteBuilders" value={query} onChange={e => setQuery(e.target.value)} />
                            </div>
                            <PixelButton size="sm" variant="secondary" onClick={doSearch} disabled={searching}>{searching ? "…" : "SEARCH"}</PixelButton>
                        </div>

                        {searched && results.length === 0 && (
                            <p style={{ color: C.textMuted, fontFamily: mono, fontSize: 11, marginTop: 12 }}>No teams with open seats match.</p>
                        )}

                        {results.length > 0 && (
                            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                                {results.map(t => {
                                    const requested = t.alreadyRequested || myRequests.some(r => r.teamId === t.teamId);
                                    return (
                                        <div key={t.teamId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 12px", background: C.surface2, border: `1px solid ${C.border}`, flexWrap: "wrap" }}>
                                            <div style={{ minWidth: 0 }}>
                                                <span style={{ color: C.text, fontFamily: mono, fontSize: 12, fontWeight: 600 }}>{t.teamName}</span>
                                                <div style={{ color: C.textMuted, fontFamily: mono, fontSize: 10, marginTop: 2 }}>
                                                    {t.eventName} · {t.trackName ?? "—"} · {t.memberCount}/5{t.leaderName ? ` · ${t.leaderName}` : ""}
                                                </div>
                                            </div>
                                            <PixelButton size="sm" variant={requested ? "ghost" : "cyber"} disabled={requested || busy === t.teamId} onClick={() => requestToJoin(t)}>
                                                {requested ? "REQUESTED" : busy === t.teamId ? "…" : "REQUEST TO JOIN"}
                                            </PixelButton>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
