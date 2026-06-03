import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  users, teamMembers, events, tracks, rounds,
  judgeAssignments, mentorAssignments, teams,
  HackathonEvent,
} from "@/shared/mocks/mockData";
import { ApiError, clearAuthToken, getAuthToken } from "@/shared/api/http";
import { getCurrentUser, loginUser, logoutUser, LoginResponseData } from "@/features/auth/authApi";

export interface AuthUser {
  user_id: number;
  full_name: string;
  email: string;
  role: 'PARTICIPANT' | 'MENTOR' | 'JUDGE' | 'COORDINATOR';
  student_type: 'FPT' | 'EXTERNAL' | null;
  is_leader: boolean;
  team_id: number | null;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  currentEvent: HackathonEvent | null;
  setCurrentEvent: (event: HackathonEvent | null) => void;
  login: (email: string, password: string) => Promise<'ok' | 'invalid_credentials' | 'pending_approval'>;
  logout: () => Promise<void>;
  switchUser: (userId: number) => void;
  updateLeaderStatus: (isLeader: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function buildAuthUser(userId: number): AuthUser | null {
  const user = users.find(u => u.user_id === userId);
  if (!user) return null;
  const membership = teamMembers.find(m => m.user_id === userId);
  return {
    user_id: user.user_id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    student_type: user.student_type,
    is_leader: membership?.is_leader ?? false,
    team_id: membership ? membership.team_id : null,
  };
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function unwrapApiUser(value: unknown): Record<string, unknown> | null {
  const record = readRecord(value);
  if (!record) return null;
  if (readRecord(record.user)) return record.user as Record<string, unknown>;
  if (readRecord(record.profile)) return record.profile as Record<string, unknown>;
  if (readRecord(record.account)) return record.account as Record<string, unknown>;
  return record;
}

function pickString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

function pickNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  }
  return undefined;
}

function pickBoolean(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
  }
  return undefined;
}

function normalizeRole(value: unknown): AuthUser["role"] | undefined {
  if (Array.isArray(value) && value.length > 0) return normalizeRole(value[0]);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return normalizeRole(record.roleName ?? record.name ?? record.role);
  }
  if (typeof value !== "string") return undefined;
  const role = value.toUpperCase();
  if (role.includes("COORDINATOR") || role.includes("ADMIN")) return "COORDINATOR";
  if (role.includes("MENTOR")) return "MENTOR";
  if (role.includes("JUDGE")) return "JUDGE";
  if (role.includes("PARTICIPANT") || role.includes("STUDENT") || role.includes("TEAM")) return "PARTICIPANT";
  return undefined;
}

function normalizeStudentType(value: unknown): AuthUser["student_type"] {
  if (typeof value !== "string") return null;
  const studentType = value.toUpperCase();
  if (studentType.includes("EXTERNAL")) return "EXTERNAL";
  if (studentType.includes("FPT")) return "FPT";
  return null;
}

function buildAuthUserFromApi(
  apiPayload: unknown,
  fallbackEmail?: string,
  fallbackUserId?: number,
): AuthUser | null {
  const record = unwrapApiUser(apiPayload);
  if (!record) return null;

  const email = pickString(record, ["email", "mail"]) ?? fallbackEmail ?? "";
  const userId = pickNumber(record, ["user_id", "userId", "id"]) ?? fallbackUserId;
  if (userId === undefined) return null;

  return {
    user_id: userId,
    full_name: pickString(record, ["full_name", "fullName", "name", "displayName"]) ?? email,
    email,
    role: normalizeRole(record.role ?? record.roleName ?? record.roles ?? record.authorities) ?? "PARTICIPANT",
    student_type: normalizeStudentType(record.student_type ?? record.studentType ?? record.userType),
    is_leader: pickBoolean(record, ["is_leader", "isLeader", "leader"]) ?? false,
    team_id: pickNumber(record, ["team_id", "teamId"]) ?? null,
  };
}

async function loadCurrentAuthUser(loginData?: LoginResponseData, fallbackEmail?: string) {
  const fallbackUserId = loginData?.userId ?? loginData?.user_id;
  const loginUserPayload = loginData?.user ?? loginData;
  const profile = await getCurrentUser().catch(() => loginUserPayload);
  return buildAuthUserFromApi(profile, fallbackEmail, fallbackUserId)
    ?? buildAuthUserFromApi(loginUserPayload, fallbackEmail, fallbackUserId);
}

function deriveDefaultEvent(userId: number, role: string, teamId: number | null): HackathonEvent | null {
  if (role === 'PARTICIPANT') {
    if (teamId === null) return null;
    const team = teams.find(t => t.team_id === teamId);
    if (!team) return null;
    const track = tracks.find(tr => tr.track_id === team.track_id);
    if (!track) return null;
    return events.find(e => e.event_id === track.event_id) ?? null;
  }
  if (role === 'MENTOR') {
    const assigned = mentorAssignments.filter(m => m.mentor_id === userId);
    const eventIds = new Set(
      tracks.filter(t => assigned.some(a => a.track_id === t.track_id)).map(t => t.event_id)
    );
    return events.find(e => eventIds.has(e.event_id)) ?? null;
  }
  if (role === 'JUDGE') {
    const assigned = judgeAssignments.filter(j => j.judge_id === userId);
    const eventIds = new Set(
      rounds.filter(r => assigned.some(a => a.round_id === r.round_id)).map(r => r.event_id)
    );
    return events.find(e => eventIds.has(e.event_id)) ?? null;
  }
  if (role === 'COORDINATOR') {
    // Most recent OPEN event first, fall back to any event
    return events.find(e => e.status === 'OPEN') ?? events[events.length - 1] ?? null;
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [currentEvent, setCurrentEvent] = useState<HackathonEvent | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(Boolean(getAuthToken()));

  useEffect(() => {
    let cancelled = false;
    if (!getAuthToken()) {
      setIsAuthLoading(false);
      return;
    }

    loadCurrentAuthUser()
      .then(authUser => {
        if (cancelled) return;
        if (authUser) {
          setCurrentUser(authUser);
          setCurrentEvent(deriveDefaultEvent(authUser.user_id, authUser.role, authUser.team_id));
        } else {
          clearAuthToken();
        }
      })
      .catch(() => {
        if (!cancelled) clearAuthToken();
      })
      .finally(() => {
        if (!cancelled) setIsAuthLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function login(email: string, password: string): Promise<'ok' | 'invalid_credentials' | 'pending_approval'> {
    try {
      const loginData = await loginUser({ email, password });
      if (!loginData.token) return 'invalid_credentials';

      const authUser = await loadCurrentAuthUser(loginData, email);
      if (!authUser) return 'invalid_credentials';

      setCurrentUser(authUser);
      setCurrentEvent(deriveDefaultEvent(authUser.user_id, authUser.role, authUser.team_id));
      return 'ok';
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) return 'pending_approval';
      return 'invalid_credentials';
    }
  }

  async function logout() {
    setCurrentUser(null);
    setCurrentEvent(null);
    await logoutUser();
  }

  function switchUser(userId: number) {
    const authUser = buildAuthUser(userId);
    if (!authUser) return;
    const user = users.find(u => u.user_id === userId);
    if (!user) return;
    setCurrentUser(authUser);
    setCurrentEvent(deriveDefaultEvent(userId, user.role, authUser.team_id));
  }

  function updateLeaderStatus(isLeader: boolean) {
    setCurrentUser(prev => prev ? { ...prev, is_leader: isLeader } : prev);
  }

  return (
    <AuthContext.Provider value={{
      currentUser, isAuthenticated: !!currentUser, isAuthLoading,
      currentEvent, setCurrentEvent,
      login, logout, switchUser, updateLeaderStatus,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
