// AuthContext.tsx
import { createContext, useContext, useState, type ReactNode } from "react";
import {
    users, userEventRoles, teamMembers, events, tracks, rounds,
    teams, MOCK_CREDENTIALS,
} from "../../shared/mocks/mockData.ts";
import type { HackathonEvent } from "../../shared/mocks/mockData.ts";

export interface AuthUser {
    user_id: number;
    full_name: string;
    email: string;
    role: 'PARTICIPANT' | 'MENTOR' | 'JUDGE' | 'COORDINATOR';
    student_type: 'FPT_STUDENT' | 'EXTERNAL_STUDENT' | 'STAFF' | null;
    is_leader: boolean;
    team_id: number | null;
}

interface AuthContextType {
    currentUser: AuthUser | null;
    isAuthenticated: boolean;
    currentEvent: HackathonEvent | null;
    setCurrentEvent: (event: HackathonEvent) => void;
    login: (email: string, password: string) => 'ok' | 'invalid_credentials' | 'pending_approval';
    logout: () => void;
    switchUser: (userId: number) => void;
    updateLeaderStatus: (isLeader: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

/** Derive app-level role từ userEventRoles.
 *  STAFF không có role entry → COORDINATOR (fallback).
 *  Student không có role entry → PARTICIPANT.
 */
function deriveRole(userId: number): AuthUser['role'] {
    const roleEntry = userEventRoles.find(r => r.user_id === userId);
    if (!roleEntry) {
        const user = users.find(u => u.user_id === userId);
        return user?.user_type === 'STAFF' ? 'COORDINATOR' : 'PARTICIPANT';
    }
    switch (roleEntry.role_id) {
        case 1: return 'COORDINATOR';
        case 2: return 'MENTOR';
        case 3: return 'JUDGE';
        default: return 'PARTICIPANT';
    }
}

function buildAuthUser(userId: number): AuthUser | null {
    const user = users.find(u => u.user_id === userId);
    if (!user) return null;

    const membership = teamMembers.find(m => m.user_id === userId);

    return {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role: deriveRole(userId),
        student_type: user.user_type,           // 'FPT_STUDENT' | 'EXTERNAL_STUDENT' | 'STAFF'
        is_leader: membership ? membership.member_role === 'LEADER' : false,
        team_id: membership?.team_id ?? null,
    };
}

function deriveDefaultEvent(
    userId: number,
    role: AuthUser['role'],
    teamId: number | null,
): HackathonEvent | null {
    if (role === 'PARTICIPANT') {
        if (teamId === null) return null;
        const team = teams.find(t => t.team_id === teamId);
        if (!team) return null;
        const track = tracks.find(tr => tr.track_id === team.track_id);
        if (!track) return null;
        return events.find(e => e.event_id === track.event_id) ?? null;
    }

    if (role === 'MENTOR') {
        const assigned = userEventRoles.filter(r => r.user_id === userId && r.role_id === 2);
        const eventIds = new Set(
            tracks
                .filter(t => assigned.some(a => a.track_id === t.track_id))
                .map(t => t.event_id),
        );
        return events.find(e => eventIds.has(e.event_id)) ?? null;
    }

    if (role === 'JUDGE') {
        const assigned = userEventRoles.filter(r => r.user_id === userId && r.role_id === 3);
        const eventIds = new Set(
            rounds
                .filter(r => assigned.some(a => a.round_id === r.round_id))
                .map(r => r.event_id),
        );
        return events.find(e => eventIds.has(e.event_id)) ?? null;
    }

    if (role === 'COORDINATOR') {
        return events.find(e => e.status === 'OPEN')
            ?? events.find(e => e.status === 'IN_PROGRESS')
            ?? events[events.length - 1]
            ?? null;
    }

    return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
    const [currentEvent, setCurrentEvent] = useState<HackathonEvent | null>(null);

    function login(email: string, password: string): 'ok' | 'invalid_credentials' | 'pending_approval' {
        const userId = MOCK_CREDENTIALS[email.toLowerCase() as keyof typeof MOCK_CREDENTIALS];
        if (!userId || password !== 'password') return 'invalid_credentials';

        const user = users.find(u => u.user_id === userId);
        if (!user) return 'invalid_credentials';

        // Dùng is_approved + is_active thay vì status / accountApprovals
        if (!user.is_active || !user.is_approved) return 'pending_approval';

        const authUser = buildAuthUser(userId);
        if (!authUser) return 'invalid_credentials';

        setCurrentUser(authUser);
        setCurrentEvent(deriveDefaultEvent(userId, authUser.role, authUser.team_id));
        return 'ok';
    }

    function logout() {
        setCurrentUser(null);
        setCurrentEvent(null);
    }

    function switchUser(userId: number) {
        const user = users.find(u => u.user_id === userId);
        if (!user) return;
        const authUser = buildAuthUser(userId);
        if (!authUser) return;
        setCurrentUser(authUser);
        setCurrentEvent(deriveDefaultEvent(userId, authUser.role, authUser.team_id));
    }

    function updateLeaderStatus(isLeader: boolean) {
        setCurrentUser(prev => prev ? { ...prev, is_leader: isLeader } : prev);
    }

    return (
        <AuthContext.Provider value={{
            currentUser,
            isAuthenticated: !!currentUser,
            currentEvent,
            setCurrentEvent,
            login,
            logout,
            switchUser,
            updateLeaderStatus,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}