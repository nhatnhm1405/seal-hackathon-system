import { useState } from "react";
import { useAuth } from "../../../app/providers/AuthContext";
import type { HackathonEvent } from "../../../shared/mocks/mockData";
import { NoTeamDashboard } from "./participant/screens/NoTeamDashboard";
import { ExistingTeamDashboard } from "./participant/screens/ExistingTeamDashboard";
import { CreateTeamScreen } from "./participant/screens/CreateTeamScreen";
import { SuccessScreen } from "./participant/screens/SuccessScreen";
import { EventDetailDrawer } from "./participant/components/EventDetailDrawer";

type Screen = 'dashboard' | 'create' | 'success';

export function ParticipantDashboard() {
    const { currentUser } = useAuth();

    const [screen, setScreen] = useState<Screen>('dashboard');
    const [drawerEvent, setDrawerEvent] = useState<HackathonEvent | null>(null);
    const [createEventId, setCreateEventId] = useState<number | null>(null);
    const [createTrackId, setCreateTrackId] = useState<number | null>(null);
    const [pendingTeamName, setPendingTeamName] = useState<string | null>(null);

    if (!currentUser) return null;

    const { is_leader, team_id } = currentUser;

    if (team_id !== null) {
        return <ExistingTeamDashboard is_leader={is_leader} team_id={team_id} />;
    }

    if (screen === 'success' && pendingTeamName) {
        return (
            <SuccessScreen
                teamName={pendingTeamName}
                onDashboard={() => setScreen('dashboard')}
                onViewTeam={() => setScreen('dashboard')}
            />
        );
    }

    if (screen === 'create') {
        return (
            <CreateTeamScreen
                initialEventId={createEventId}
                initialTrackId={createTrackId}
                onBack={() => { setScreen('dashboard'); setDrawerEvent(null); }}
                onSubmit={({ teamName }) => {
                    setPendingTeamName(teamName);
                    setDrawerEvent(null);
                    setScreen('success');
                }}
            />
        );
    }

    return (
        <div style={{ position: "relative" }}>
            <NoTeamDashboard
                pendingTeamName={pendingTeamName}
                onCreateTeam={(eventId, trackId) => {
                    setCreateEventId(eventId ?? null);
                    setCreateTrackId(trackId ?? null);
                    setDrawerEvent(null);
                    setScreen('create');
                }}
                onViewDetails={(ev) => setDrawerEvent(ev)}
            />

            {drawerEvent && (
                <EventDetailDrawer
                    event={drawerEvent}
                    onClose={() => setDrawerEvent(null)}
                    onCreateTeam={(eventId, trackId) => {
                        setCreateEventId(eventId);
                        setCreateTrackId(trackId);
                        setDrawerEvent(null);
                        setScreen('create');
                    }}
                />
            )}
        </div>
    );
}