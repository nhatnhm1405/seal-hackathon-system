import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/app/providers/AuthProvider";
import { useNotifications } from "@/app/providers/NotificationProvider";
import { invitesApi, HackathonEvent } from "@/shared/apiClient";
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

    const loadInviteCount = useCallback(() => {
        invitesApi.getPending().then(r => setPendingInviteCount((r.data ?? []).length)).catch(() => setPendingInviteCount(0));
    }, []);

    useEffect(() => { loadInviteCount(); }, [loadInviteCount]);

    if (!currentUser) return null;

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
