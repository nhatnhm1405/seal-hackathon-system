const BASE_URL = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ?? 'http://localhost:8080';
export const API_BASE_URL = BASE_URL;
const TOKEN_KEY = 'seal_auth_token';

// ── Token helpers ────────────────────────────────────────────────────
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string, remember = true): void {
  if (remember) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
  }
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

// ── Error shape ──────────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// ── Core fetch wrapper ───────────────────────────────────────────────
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body?.message ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ═══════════════════════════════════════════════════════════════════
// Shared types
// ═══════════════════════════════════════════════════════════════════

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

// ── Auth ─────────────────────────────────────────────────────────────

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  userType: 'FPT_STUDENT' | 'EXTERNAL_STUDENT' | 'STAFF';
  studentId?: string;
  university?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthTokenData {
  token: string;
  userId?: number;
}

export interface UserProfile {
  userId: number;
  email: string;
  fullName: string;
  userType: string;
  isApproved: boolean;
  isActive: boolean;
  roles?: UserEventRole[];
}

export interface UserEventRole {
  id: number;
  roleName: string;
  eventId?: number;
  trackId?: number;
  roundId?: number;
  judgeType?: string;
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    apiFetch<ApiResponse<{ userId: number }>>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: LoginPayload) =>
    apiFetch<ApiResponse<AuthTokenData>>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  me: () =>
    apiFetch<ApiResponse<UserProfile>>('/api/auth/me'),

  logout: () =>
    apiFetch<void>('/api/auth/logout', { method: 'POST' }),
};

// ── Account Approvals ─────────────────────────────────────────────

export interface PendingAccount {
  userId: number;
  email: string;
  fullName: string;
  userType: string;
  studentId?: string;
  university?: string;
  createdAt: string;
}

export const accountApprovalsApi = {
  getPending: () =>
    apiFetch<ApiResponse<PendingAccount[]>>('/api/account-approvals/pending'),

  approve: (userId: number) =>
    apiFetch<ApiResponse<void>>(`/api/account-approvals/${userId}/approve`, { method: 'PUT' }),

  reject: (userId: number) =>
    apiFetch<ApiResponse<void>>(`/api/account-approvals/${userId}/reject`, { method: 'PUT' }),
};

// ── User Management ───────────────────────────────────────────────

export interface UserItem {
  userId: number;
  email: string;
  fullName: string;
  userType: string;
  isApproved: boolean;
  isActive: boolean;
  studentId?: string;
  university?: string;
  createdAt?: string;
}

export interface UserEventRoleItem {
  id: number;
  userId: number;
  email: string;
  fullName: string;
  roleName: string;
  eventId?: number;
  trackId?: number;
  roundId?: number;
  judgeType?: string;
  assignedAt: string;
}

export interface CreateStaffPayload {
  email: string;
  password: string;
  fullName: string;
  roleName: 'JUDGE' | 'MENTOR' | 'COORDINATOR';
  judgeType?: 'INTERNAL' | 'GUEST';
  eventId?: number;
  roundId?: number;
  trackId?: number;
}

export interface AssignRolePayload {
  roleName: string;
  eventId?: number;
  trackId?: number;
  roundId?: number;
}

export const usersApi = {
  getAll: () =>
    apiFetch<ApiResponse<UserItem[]>>('/api/users'),

  getById: (userId: number) =>
    apiFetch<ApiResponse<UserItem>>(`/api/users/${userId}`),

  getRoles: () =>
    apiFetch<ApiResponse<UserEventRoleItem[]>>('/api/users/roles'),

  createStaff: (payload: CreateStaffPayload) =>
    apiFetch<ApiResponse<{ userId: number; email: string; fullName: string }>>('/api/users/staff', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  assignRole: (userId: number, payload: AssignRolePayload) =>
    apiFetch<ApiResponse<UserEventRoleItem>>(`/api/users/${userId}/roles`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  activate: (userId: number) =>
    apiFetch<ApiResponse<void>>(`/api/users/${userId}/activate`, { method: 'PUT' }),

  deactivate: (userId: number) =>
    apiFetch<ApiResponse<void>>(`/api/users/${userId}/deactivate`, { method: 'PUT' }),
};

// ── Events ────────────────────────────────────────────────────────

export interface HackathonEvent {
  id: number;
  name: string;
  season: string;
  year: number;
  description?: string;
  registrationStart: string;
  registrationEnd: string;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'OPEN' | 'ONGOING' | 'CLOSED';
}

export interface CreateEventPayload {
  name: string;
  season: string;
  year: number;
  description?: string;
  registrationStart: string;
  registrationEnd: string;
  startDate: string;
  endDate: string;
  status?: string;
}

export interface UpdateEventPayload {
  name?: string;
  description?: string;
  status?: string;
  registrationStart?: string;
  registrationEnd?: string;
  startDate?: string;
  endDate?: string;
}

export const eventsApi = {
  getAll: () =>
    apiFetch<ApiResponse<HackathonEvent[]>>('/api/events'),

  getById: (eventId: number) =>
    apiFetch<ApiResponse<HackathonEvent>>(`/api/events/${eventId}`),

  create: (payload: CreateEventPayload) =>
    apiFetch<ApiResponse<HackathonEvent>>('/api/events', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (eventId: number, payload: UpdateEventPayload) =>
    apiFetch<ApiResponse<HackathonEvent>>(`/api/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
};

// ── Tracks ────────────────────────────────────────────────────────

export interface Track {
  id: number;
  eventId: number;
  name: string;
  description?: string;
}

export interface CreateTrackPayload {
  name: string;
  description?: string;
}

export const tracksApi = {
  getAll: (eventId: number) =>
    apiFetch<ApiResponse<Track[]>>(`/api/events/${eventId}/tracks`),

  getById: (eventId: number, trackId: number) =>
    apiFetch<ApiResponse<Track>>(`/api/events/${eventId}/tracks/${trackId}`),

  create: (eventId: number, payload: CreateTrackPayload) =>
    apiFetch<ApiResponse<Track>>(`/api/events/${eventId}/tracks`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (eventId: number, trackId: number, payload: Partial<CreateTrackPayload>) =>
    apiFetch<ApiResponse<Track>>(`/api/events/${eventId}/tracks/${trackId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  delete: (eventId: number, trackId: number) =>
    apiFetch<ApiResponse<void>>(`/api/events/${eventId}/tracks/${trackId}`, { method: 'DELETE' }),
};

// ── Rounds ────────────────────────────────────────────────────────

export interface Round {
  id: number;
  eventId: number;
  name: string;
  orderNumber: number;
  startTime: string;
  endTime: string;
  submissionDeadline: string;
  topNAdvance?: number;
  isCalibration: boolean;
  status?: string;
}

export interface CreateRoundPayload {
  name: string;
  orderNumber: number;
  startTime: string;
  endTime: string;
  submissionDeadline: string;
  topNAdvance?: number;
  isCalibration?: boolean;
}

export interface UpdateRoundPayload {
  name?: string;
  topNAdvance?: number;
  status?: string;
  startTime?: string;
  endTime?: string;
  submissionDeadline?: string;
}

export const roundsApi = {
  getAll: (eventId: number) =>
    apiFetch<ApiResponse<Round[]>>(`/api/events/${eventId}/rounds`),

  getById: (eventId: number, roundId: number) =>
    apiFetch<ApiResponse<Round>>(`/api/events/${eventId}/rounds/${roundId}`),

  create: (eventId: number, payload: CreateRoundPayload) =>
    apiFetch<ApiResponse<Round>>(`/api/events/${eventId}/rounds`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (eventId: number, roundId: number, payload: UpdateRoundPayload) =>
    apiFetch<ApiResponse<Round>>(`/api/events/${eventId}/rounds/${roundId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
};

// ── Teams ─────────────────────────────────────────────────────────

export interface Team {
  id: number;
  eventId: number;
  trackId: number;
  name: string;
  description?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISQUALIFIED';
  members?: TeamMember[];
}

export interface TeamMember {
  userId: number;
  fullName: string;
  email: string;
  role: 'LEADER' | 'MEMBER';
}

export interface ActiveEventWithTracks {
  id: number;
  name: string;
  tracks: { id: number; name: string }[];
}

export interface CreateTeamPayload {
  eventId: number;
  trackId: number;
  name: string;
  description?: string;
}

export const teamsApi = {
  getActiveEvents: () =>
    apiFetch<ApiResponse<ActiveEventWithTracks[]>>('/api/teams/active-events'),

  create: (payload: CreateTeamPayload) =>
    apiFetch<ApiResponse<Team>>('/api/teams', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMy: () =>
    apiFetch<ApiResponse<Team>>('/api/teams/my'),

  getByEvent: (eventId: number) =>
    apiFetch<ApiResponse<Team[]>>(`/api/teams/event/${eventId}`),

  getById: (teamId: number) =>
    apiFetch<ApiResponse<Team>>(`/api/teams/${teamId}`),

  approve: (teamId: number) =>
    apiFetch<ApiResponse<void>>(`/api/teams/${teamId}/approve`, { method: 'PUT' }),

  reject: (teamId: number, reason: string) =>
    apiFetch<ApiResponse<void>>(`/api/teams/${teamId}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    }),

  disqualify: (teamId: number) =>
    apiFetch<ApiResponse<void>>(`/api/teams/${teamId}/disqualify`, { method: 'PUT' }),
};

// ── Team Invites ──────────────────────────────────────────────────

export interface TeamInvite {
  id: number;
  teamId: number;
  teamName: string;
  invitedByUserId: number;
  invitedByName: string;
  message?: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: string;
}

export interface SendInvitePayload {
  invitedUserId: number;
  message?: string;
}

export const invitesApi = {
  send: (teamId: number, payload: SendInvitePayload) =>
    apiFetch<ApiResponse<TeamInvite>>(`/api/invites/teams/${teamId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getPending: () =>
    apiFetch<ApiResponse<TeamInvite[]>>('/api/invites/pending'),

  accept: (inviteId: number) =>
    apiFetch<ApiResponse<void>>(`/api/invites/${inviteId}/accept`, { method: 'PUT' }),

  decline: (inviteId: number) =>
    apiFetch<ApiResponse<void>>(`/api/invites/${inviteId}/decline`, { method: 'PUT' }),
};

// ── Submissions ───────────────────────────────────────────────────

export interface Submission {
  id: number;
  teamId: number;
  teamName: string;
  roundId: number;
  repoUrl: string;
  demoUrl?: string;
  slideUrl?: string;
  description?: string;
  submittedAt: string;
}

export interface CreateSubmissionPayload {
  roundId: number;
  repoUrl: string;
  demoUrl?: string;
  slideUrl?: string;
  description?: string;
}

export const submissionsApi = {
  submit: (payload: CreateSubmissionPayload) =>
    apiFetch<ApiResponse<Submission>>('/api/submissions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMyForRound: (roundId: number) =>
    apiFetch<ApiResponse<Submission>>(`/api/submissions/my/round/${roundId}`),

  getAllForRound: (roundId: number) =>
    apiFetch<ApiResponse<Submission[]>>(`/api/submissions/round/${roundId}`),

  getById: (submissionId: number) =>
    apiFetch<ApiResponse<Submission>>(`/api/submissions/${submissionId}`),
};

// ── Scoring ───────────────────────────────────────────────────────

export interface ScoringCriteria {
  id: number;
  roundId: number;
  name: string;
  description?: string;
  weight: number;
  maxScore: number;
  orderNumber: number;
}

export interface CreateCriteriaPayload {
  name: string;
  description?: string;
  weight: number;
  maxScore: number;
  orderNumber: number;
}

export interface ScoreEntry {
  criteriaId: number;
  value: number;
  comment?: string;
}

export interface SubmitScoresPayload {
  submissionId: number;
  draft: boolean;
  scores: ScoreEntry[];
}

export interface ScoreRecord {
  id: number;
  submissionId: number;
  judgeId: number;
  judgeName: string;
  draft: boolean;
  scores: (ScoreEntry & { criteriaName: string })[];
  submittedAt: string;
}

export const scoringApi = {
  getCriteria: (eventId: number, roundId: number) =>
    apiFetch<ApiResponse<ScoringCriteria[]>>(`/api/events/${eventId}/rounds/${roundId}/criteria`),

  createCriteria: (eventId: number, roundId: number, payload: CreateCriteriaPayload) =>
    apiFetch<ApiResponse<ScoringCriteria>>(`/api/events/${eventId}/rounds/${roundId}/criteria`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  submitScores: (payload: SubmitScoresPayload) =>
    apiFetch<ApiResponse<ScoreRecord>>('/api/scores', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getScoresForSubmission: (submissionId: number) =>
    apiFetch<ApiResponse<ScoreRecord[]>>(`/api/scores/submission/${submissionId}`),

  getMyScoresForRound: (roundId: number) =>
    apiFetch<ApiResponse<ScoreRecord[]>>(`/api/scores/my/round/${roundId}`),
};

// ── Round Results ─────────────────────────────────────────────────

export interface RoundResult {
  teamId: number;
  teamName: string;
  submissionId: number;
  totalScore: number;
  rank: number;
  advanced: boolean;
}

export const resultsApi = {
  getPublished: (eventId: number, roundId: number) =>
    apiFetch<ApiResponse<RoundResult[]>>(`/api/events/${eventId}/rounds/${roundId}/results`),

  getAll: (eventId: number, roundId: number) =>
    apiFetch<ApiResponse<RoundResult[]>>(`/api/events/${eventId}/rounds/${roundId}/results/all`),

  finalize: (eventId: number, roundId: number) =>
    apiFetch<ApiResponse<void>>(`/api/events/${eventId}/rounds/${roundId}/results/finalize`, {
      method: 'POST',
    }),

  publish: (eventId: number, roundId: number) =>
    apiFetch<ApiResponse<void>>(`/api/events/${eventId}/rounds/${roundId}/results/publish`, {
      method: 'POST',
    }),
};

// ── Notifications ─────────────────────────────────────────────────

export interface Notification {
  id: number;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export const notificationsApi = {
  getAll: () =>
    apiFetch<ApiResponse<Notification[]>>('/api/notifications'),

  getUnreadCount: () =>
    apiFetch<ApiResponse<{ count: number }>>('/api/notifications/unread-count'),

  markAsRead: (notificationId: number) =>
    apiFetch<ApiResponse<void>>(`/api/notifications/${notificationId}/read`, { method: 'PUT' }),

  markAllAsRead: () =>
    apiFetch<ApiResponse<void>>('/api/notifications/read-all', { method: 'PUT' }),
};

// ── Team Assignments ──────────────────────────────────────────────

export interface MentorAssignment {
  teamId: number;
  teamName: string;
  trackId: number;
  trackName: string;
  eventId: number;
  eventName: string;
  members: TeamMember[];
}

export interface JudgeAssignment {
  submissionId: number;
  teamId: number;
  teamName: string;
  roundId: number;
  roundName: string;
  scored: boolean;
}

export const assignmentsApi = {
  getMentorAssignments: () =>
    apiFetch<ApiResponse<MentorAssignment[]>>('/api/mentor/assignments'),

  getJudgeAssignments: () =>
    apiFetch<ApiResponse<JudgeAssignment[]>>('/api/judge/assignments'),
};
