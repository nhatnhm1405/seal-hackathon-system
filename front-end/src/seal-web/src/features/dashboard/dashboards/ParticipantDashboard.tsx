import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/app/providers/AuthProvider";
import { useNotifications } from "@/app/providers/NotificationProvider";
import { invitesApi, HackathonEvent, participationRequestsApi, ApiError, apiErrorMessage } from "@/shared/apiClient";
import { C, GradientText, PixelButton, PixelCard } from "@/shared/components/PixelComponents";
import { NoTeamDashboard } from "./participant/screens/NoTeamDashboard";
import { ExistingTeamDashboard } from "./participant/screens/ExistingTeamDashboard";
import { CreateTeamScreen } from "./participant/screens/CreateTeamScreen";
import { SuccessScreen } from "./participant/screens/SuccessScreen";
import { EventDetailDrawer } from "./participant/components/EventDetailDrawer";
import { InvitationsDrawer } from "./participant/components/InvitationsDrawer";

type Screen = 'dashboard' | 'create' | 'success';

export function ParticipantDashboard() {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { addToast } = useNotifications();

    const [screen, setScreen] = useState<Screen>('dashboard');
    const [drawerEvent, setDrawerEvent] = useState<HackathonEvent | null>(null);
    const [createEventId, setCreateEventId] = useState<number | null>(null);
    const [createTrackId, setCreateTrackId] = useState<number | null>(null);
    const [pendingTeamName, setPendingTeamName] = useState<string | null>(null);
    const [showInvites, setShowInvites] = useState(false);
    const [pendingInviteCount, setPendingInviteCount] = useState(0);
    const [requestingAccess, setRequestingAccess] = useState(false);
    const [accessRequested, setAccessRequested] = useState(false);

    const loadInviteCount = useCallback(() => {
        invitesApi.getPending().then(r => setPendingInviteCount((r.data ?? []).length)).catch(() => setPendingInviteCount(0));
    }, []);

    useEffect(() => { loadInviteCount(); }, [loadInviteCount]);

    if (!currentUser) return null;

    async function requestParticipationAccess() {
        if (requestingAccess || accessRequested) return;
        setRequestingAccess(true);
        try {
            await participationRequestsApi.request();
            setAccessRequested(true);
            addToast({ type: "success", title: "Request submitted", message: "A System Admin will review your participation access request." });
        } catch (err) {
            const message = apiErrorMessage(err, "Failed to submit participation access request.");
            if (err instanceof ApiError && err.status === 400) {
                setAccessRequested(true);
            }
            addToast({ type: "warning", title: "Request failed", message });
        } finally {
            setRequestingAccess(false);
        }
    }

    // Just-created team → show success first, even though team context is now set.
    if (screen === 'success' && pendingTeamName) {
        return (
            <SuccessScreen
                teamName={pendingTeamName}
                onDashboard={() => { setPendingTeamName(null); setScreen('dashboard'); }}
                onViewTeam={() => navigate('/team/view')}
            />
        );
    }

    // Participant WITH a team → member / leader console.
    if (currentUser.team_id !== null) {
        return <ExistingTeamDashboard />;
    }

    if (!currentUser.is_active) {
        return (
            <ReadOnlyAccessPanel
                requesting={requestingAccess}
                requested={accessRequested}
                onRequest={requestParticipationAccess}
            />
        );
    }

    // Create-team form.
    if (screen === 'create') {
        return (
            <CreateTeamScreen
                initialEventId={createEventId}
                initialTrackId={createTrackId}
                onBack={() => { setScreen('dashboard'); setDrawerEvent(null); }}
                onSubmit={(teamName) => {
                    setPendingTeamName(teamName);
                    setDrawerEvent(null);
                    setScreen('success');
                    addToast({ type: "success", title: "Team Created!", message: `"${teamName}" is pending coordinator approval.` });
                }}
            />
        );
    }

    // No-team dashboard.
    return (
        <div style={{ position: "relative" }}>
            <NoTeamDashboard
                pendingTeamName={pendingTeamName}
                pendingInviteCount={pendingInviteCount}
                onCreateTeam={(eventId, trackId) => {
                    setCreateEventId(eventId ?? null);
                    setCreateTrackId(trackId ?? null);
                    setDrawerEvent(null);
                    setScreen('create');
                }}
                onViewDetails={(ev) => setDrawerEvent(ev)}
                onWaitForInvite={() => setShowInvites(true)}
            />

            {showInvites && (
                <InvitationsDrawer onClose={() => { setShowInvites(false); loadInviteCount(); }} />
            )}

            {drawerEvent && (
                <EventDetailDrawer
                    event={drawerEvent}
                    onClose={() => setDrawerEvent(null)}
                    onCreateTeam={(eventId) => {
                        setCreateEventId(eventId);
                        setDrawerEvent(null);
                        setScreen('create');
                    }}
                />
            )}
        </div>
    );
}

function ReadOnlyAccessPanel({
    requesting,
    requested,
    onRequest,
}: {
    requesting: boolean;
    requested: boolean;
    onRequest: () => void;
}) {
    return (
        <div style={{ padding: 24 }}>
            <PixelCard glow gradient style={{ padding: 28, maxWidth: 720 }}>
                <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: "0.12em", marginBottom: 10 }}>
                    // is_active_account
                </div>
                <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 900, lineHeight: 1.2, marginBottom: 12 }}>
                    <GradientText>Participation access required</GradientText>
                </h1>
                <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: 1.8, maxWidth: 560, marginBottom: 18 }}>
                    Your account is currently read-only. You can still view existing information, but creating teams, joining teams, accepting invites, selecting tracks and submitting projects require System Admin approval.
                </p>
                <PixelButton variant="cyber" disabled={requesting || requested} onClick={onRequest}>
                    {requested ? "REQUEST SENT" : requesting ? "SENDING..." : "REQUEST PARTICIPATION ACCESS"}
                </PixelButton>
            </PixelCard>
        </div>
    );
}
