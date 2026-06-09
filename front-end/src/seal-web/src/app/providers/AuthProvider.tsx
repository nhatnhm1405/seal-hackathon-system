import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  users, teamMembers, events, tracks, rounds,
  userEventRoles, teams,
  HackathonEvent,
} from "@/shared/mocks/mockData";
import { apiFetch, getToken, setToken, clearToken, ApiError } from "@/shared/apiClient";

// ── Public AuthUser shape ────────────────────────────────────────────
export interface AuthUser {
  user_id: number;
  full_name: string;
  email: string;
  role: 'PARTICIPANT' | 'MENTOR' | 'JUDGE' | 'COORDINATOR';
  student_type: 'FPT' | 'EXTERNAL' | null;
  student_id: string | null;
  university: string | null;
  is_leader: boolean;
  team_id: number | null;
}

// ── Context type ─────────────────────────────────────────────────────
interface AuthContextType {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  currentEvent: HackathonEvent | null;
  setCurrentEvent: (event: HackathonEvent | null) => void;
  availableRoles: string[];
  activeRole: string | null;
  setActiveRole: (role: string | null) => void;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<'ok' | 'ok:select-role' | 'invalid_credentials' | 'pending_approval'>;
  logout: () => void;
  switchUser: (userId: number) => void;
  updateLeaderStatus: (isLeader: boolean) => void;
  clearTeam: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const ACTIVE_ROLE_KEY = 'activeRole';

// ── API response shape (defensive — backend may vary) ─────────────────
interface ApiUserProfile {
  userId?: number;
  user_id?: number;
  email: string;
  fullName?: string;
  full_name?: string;
  userType?: string;
  user_type?: string;
  studentId?: string | null;
  student_id?: string | null;
  university?: string | null;
  // Role — API may return any of these; we handle all cases
  roles?: string | string[];
  role?: string | string[];
  roleName?: string;
  role_name?: string;
  // Team context (optional — may not be in auth response)
  teamId?: number | null;
  team_id?: number | null;
  isLeader?: boolean;
  is_leader?: boolean;
}

// ── Collects all raw role strings from backend profile ────────────────
const STAFF_ROLE_KEYWORDS = ['JUDGE', 'MENTOR', 'COORDINATOR'];

function resolveAllRoles(profile: ApiUserProfile): string[] {
  const raw: string[] = [];
  const collect = (v: unknown) => {
    if (!v) return;
    if (Array.isArray(v)) v.forEach(collect);
    else if (typeof v === 'string') raw.push(v.toUpperCase().trim());
    else if (typeof v === 'object' && v !== null) {
      const obj = v as Record<string, unknown>;
      if (obj.roleName) collect(obj.roleName);
      if (obj.role_name) collect(obj.role_name);
      if (obj.name) collect(obj.name);
    }
  };
  collect(profile.roles);
  collect(profile.role);
  collect(profile.roleName);
  collect(profile.role_name);
  return [...new Set(raw.filter(r => STAFF_ROLE_KEYWORDS.some(k => r.includes(k))))];
}

// ── Maps a raw backend role string to frontend AuthUser role ──────────
function mapBackendRole(backendRole: string): AuthUser['role'] {
  const r = backendRole.toUpperCase();
  if (r.includes('COORDINATOR')) return 'COORDINATOR';
  if (r.includes('JUDGE'))       return 'JUDGE';
  if (r === 'MENTOR')            return 'MENTOR';
  return 'PARTICIPANT';
}

// ── CRITICAL: role resolver ───────────────────────────────────────────
// Handles: string, string[], nested object, snake_case, camelCase
// Priority: COORDINATOR > JUDGE > MENTOR > PARTICIPANT
function resolveRole(profile: ApiUserProfile): AuthUser['role'] {
  const raw: string[] = [];

  const collect = (v: unknown) => {
    if (!v) return;
    if (Array.isArray(v)) v.forEach(collect);
    else if (typeof v === 'string') raw.push(v.toUpperCase().trim());
    else if (typeof v === 'object' && v !== null) {
      const obj = v as Record<string, unknown>;
      if (obj.roleName) collect(obj.roleName);
      if (obj.role_name) collect(obj.role_name);
      if (obj.name) collect(obj.name);
    }
  };

  collect(profile.roles);
  collect(profile.role);
  collect(profile.roleName);
  collect(profile.role_name);

  if (raw.some(r => r.includes('COORDINATOR'))) return 'COORDINATOR';
  if (raw.some(r => r.includes('JUDGE')))       return 'JUDGE';
  if (raw.some(r => r === 'MENTOR'))            return 'MENTOR';
  return 'PARTICIPANT';
}

function mapApiUser(profile: ApiUserProfile): AuthUser {
  const userType = profile.userType ?? profile.user_type ?? '';
  return {
    user_id:      profile.userId ?? profile.user_id ?? 0,
    full_name:    profile.fullName ?? profile.full_name ?? '',
    email:        profile.email,
    role:         resolveRole(profile),
    student_type: userType === 'FPT_STUDENT'      ? 'FPT'
                : userType === 'EXTERNAL_STUDENT'  ? 'EXTERNAL'
                : null,
    student_id:   profile.studentId ?? profile.student_id ?? null,
    university:   profile.university ?? null,
    is_leader:    profile.isLeader ?? profile.is_leader ?? false,
    team_id:      profile.teamId ?? profile.team_id ?? null,
  };
}

// ── Mock helpers (used by DevToolbar switchUser only) ─────────────────
function buildAuthUser(userId: number): AuthUser | null {
  const user = users.find(u => u.user_id === userId);
  if (!user) return null;
  const userMemberships = teamMembers.filter(m => m.user_id === userId);
  const membership = userMemberships.length > 1
    ? userMemberships.slice().sort((a, b) => {
        const eventIdOf = (m: typeof a) => {
          const team = teams.find(t => t.team_id === m.team_id);
          const track = team ? tracks.find(tr => tr.track_id === team.track_id) : null;
          return track?.event_id ?? 0;
        };
        return eventIdOf(b) - eventIdOf(a);
      })[0]
    : userMemberships[0];
  let role: AuthUser['role'] = 'PARTICIPANT';
  if (user.user_type === 'STAFF') {
    const eventRole = userEventRoles.find(r => r.user_id === userId);
    if (eventRole?.role_name === 'EVENT_COORDINATOR') role = 'COORDINATOR';
    else if (eventRole?.role_name === 'JUDGE')        role = 'JUDGE';
    else if (eventRole?.role_name === 'MENTOR')       role = 'MENTOR';
  }

  return {
    user_id:      user.user_id,
    full_name:    user.full_name,
    email:        user.email,
    role,
    student_type: user.user_type === 'FPT_STUDENT'     ? 'FPT'
                : user.user_type === 'EXTERNAL_STUDENT' ? 'EXTERNAL'
                : null,
    student_id:   user.student_id,
    university:   user.university_name,
    is_leader:    membership?.member_role === 'LEADER',
    team_id:      membership ? membership.team_id : null,
  };
}

function deriveDefaultEvent(userId: number, role: string, teamId: number | null): HackathonEvent | null {
  if (role === 'PARTICIPANT') {
    if (teamId === null) return null;
    const team = teams.find(t => t.team_id === teamId);
    const track = team ? tracks.find(tr => tr.track_id === team.track_id) : null;
    return track ? (events.find(e => e.event_id === track.event_id) ?? null) : null;
  }
  if (role === 'MENTOR') {
    const assigned = userEventRoles.filter(r => r.user_id === userId && r.role_name === 'MENTOR');
    const eventIds = new Set(assigned.map(r => r.event_id).filter((id): id is number => id !== null));
    return events.find(e => eventIds.has(e.event_id)) ?? null;
  }
  if (role === 'JUDGE') {
    const assigned = userEventRoles.filter(r => r.user_id === userId && r.role_name === 'JUDGE');
    const eventIds = new Set(assigned.map(r => r.event_id).filter((id): id is number => id !== null));
    return events.find(e => eventIds.has(e.event_id)) ?? null;
  }
  if (role === 'COORDINATOR') {
    return events.find(e => e.status === 'IN_PROGRESS' || e.status === 'OPEN') ?? events[events.length - 1] ?? null;
  }
  return null;
}

// ── Provider ──────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [currentEvent, setCurrentEvent] = useState<HackathonEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [activeRole, setActiveRoleState] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_ROLE_KEY),
  );

  // ── Active role setter (persists to localStorage) ───────────────────
  function setActiveRole(role: string | null) {
    setActiveRoleState(role);
    if (role) {
      localStorage.setItem(ACTIVE_ROLE_KEY, role);
      setCurrentUser(prev => prev ? { ...prev, role: mapBackendRole(role) } : prev);
    } else {
      localStorage.removeItem(ACTIVE_ROLE_KEY);
      setCurrentUser(prev => prev ? { ...prev, role: 'PARTICIPANT' } : prev);
    }
  }

  // ── Restore session from stored token on mount ───────────────────────
  useEffect(() => {
    const token = getToken();
    if (!token) { setIsLoading(false); return; }

    apiFetch<{ data: ApiUserProfile }>('/api/auth/me')
      .then(res => {
        const allRoles = resolveAllRoles(res.data);
        setAvailableRoles(allRoles);

        let resolvedActive: string | null = null;
        if (allRoles.length === 1) {
          resolvedActive = allRoles[0];
          localStorage.setItem(ACTIVE_ROLE_KEY, resolvedActive);
        } else if (allRoles.length > 1) {
          const saved = localStorage.getItem(ACTIVE_ROLE_KEY);
          resolvedActive = (saved && allRoles.includes(saved)) ? saved : null;
          if (!resolvedActive) localStorage.removeItem(ACTIVE_ROLE_KEY);
        }

        setActiveRoleState(resolvedActive);
        const authUser = mapApiUser(res.data);
        if (resolvedActive) authUser.role = mapBackendRole(resolvedActive);
        setCurrentUser(authUser);
        setCurrentEvent(deriveDefaultEvent(authUser.user_id, authUser.role, authUser.team_id));
      })
      .catch(() => {
        clearToken();
        localStorage.removeItem(ACTIVE_ROLE_KEY);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // ── Login (real API) ────────────────────────────────────────────────
  async function login(
    email: string,
    password: string,
    rememberMe = false,
  ): Promise<'ok' | 'ok:select-role' | 'invalid_credentials' | 'pending_approval'> {
    try {
      // Step 1: authenticate and receive token
      const loginRes = await apiFetch<{ data: { token: string; userId?: number } }>(
        '/api/auth/login',
        { method: 'POST', body: JSON.stringify({ email, password }) },
      );
      setToken(loginRes.data.token, rememberMe);

      // Step 2: fetch full profile (roles live here, not in the login response)
      const meRes = await apiFetch<{ data: ApiUserProfile }>('/api/auth/me');
      const allRoles = resolveAllRoles(meRes.data);
      setAvailableRoles(allRoles);

      let resolvedActive: string | null = null;
      if (allRoles.length === 1) {
        resolvedActive = allRoles[0];
        localStorage.setItem(ACTIVE_ROLE_KEY, resolvedActive);
      } else if (allRoles.length > 1) {
        // Check if there is a previously saved valid role
        const saved = localStorage.getItem(ACTIVE_ROLE_KEY);
        resolvedActive = (saved && allRoles.includes(saved)) ? saved : null;
        if (!resolvedActive) localStorage.removeItem(ACTIVE_ROLE_KEY);
      }

      setActiveRoleState(resolvedActive);
      const authUser = mapApiUser(meRes.data);
      if (resolvedActive) authUser.role = mapBackendRole(resolvedActive);
      setCurrentUser(authUser);
      setCurrentEvent(deriveDefaultEvent(authUser.user_id, authUser.role, authUser.team_id));
      // Signal to the caller that the user must pick a role before entering any dashboard
      return allRoles.length > 1 && resolvedActive === null ? 'ok:select-role' : 'ok';
    } catch (err) {
      clearToken();
      localStorage.removeItem(ACTIVE_ROLE_KEY);
      if (err instanceof ApiError) {
        if (err.status === 403) return 'pending_approval';
        if (err.status === 401) return 'invalid_credentials';
      }
      return 'invalid_credentials';
    }
  }

  // ── Logout ──────────────────────────────────────────────────────────
  function logout() {
    // Fire-and-forget — clear local state immediately for snappy UX
    const token = getToken();
    if (token) {
      apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    }
    clearToken();
    localStorage.removeItem(ACTIVE_ROLE_KEY);
    setCurrentUser(null);
    setAvailableRoles([]);
    setActiveRoleState(null);
    setCurrentEvent(null);
  }

  // ── DevToolbar: switch to mock user without touching token ──────────
  function switchUser(userId: number) {
    const authUser = buildAuthUser(userId);
    if (!authUser) return;
    setCurrentUser(authUser);
    setCurrentEvent(deriveDefaultEvent(userId, authUser.role, authUser.team_id));
  }

  function updateLeaderStatus(isLeader: boolean) {
    setCurrentUser(prev => prev ? { ...prev, is_leader: isLeader } : prev);
  }

  function clearTeam() {
    setCurrentUser(prev => prev ? { ...prev, team_id: null, is_leader: false } : prev);
  }

  return (
    <AuthContext.Provider value={{
      currentUser,
      isAuthenticated: !!currentUser,
      isLoading,
      currentEvent, setCurrentEvent,
      availableRoles, activeRole, setActiveRole,
      login, logout, switchUser, updateLeaderStatus, clearTeam,
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
