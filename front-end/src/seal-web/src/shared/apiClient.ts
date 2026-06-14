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

// ── Admin: Platform Administration (SYSTEM_ADMIN only) ────────────
// Maps the /api/admin/** endpoints. Mirrors backend UserResponse,
// UserEventRoleResponse, SystemLogResponse and the Create/Grant requests.

export interface UserItem {
  userId: number;
  email: string;
  fullName: string;
  userType: string;
  studentId?: string;
  university?: string;
  judgeType?: string;
  isApproved: boolean;
  isActive: boolean;
  expiredAt?: string;
  provider?: string;
  avatarUrl?: string;
  roles?: string[];
  createdAt?: string;
}

export interface RoleGrantItem {
  id: number;
  userId: number;
  userFullName: string;
  userEmail: string;
  roleName: string;
  eventId?: number;
  eventName?: string;
}

export interface SystemLogItem {
  logId: number;
  actorUserId?: number;
  actorName?: string;
  action: string;
  detail?: string;
  ipAddress?: string;
  createdAt: string;
}

// POST /api/admin/users — role grants are a SEPARATE step
export interface CreateUserPayload {
  email: string;
  password: string;
  fullName: string;
  userType: 'FPT_STUDENT' | 'EXTERNAL_STUDENT' | 'STAFF';
  judgeType?: 'INTERNAL' | 'GUEST';
}

// PUT /api/admin/users/{id} — patch semantics, null fields left unchanged
export interface UpdateUserPayload {
  fullName?: string;
  studentId?: string;
  university?: string;
  judgeType?: string;
}

// POST /api/admin/roles/grant — DELETE /api/admin/roles/revoke
export interface GrantRolePayload {
  userId: number;
  roleName: 'SYSTEM_ADMIN' | 'EVENT_COORDINATOR' | 'MENTOR' | 'JUDGE';
  eventId?: number | null;
}

export const adminApi = {
  // Users
  getUsers: () =>
    apiFetch<ApiResponse<UserItem[]>>('/api/admin/users'),

  getUserById: (userId: number) =>
    apiFetch<ApiResponse<UserItem>>(`/api/admin/users/${userId}`),

  createUser: (payload: CreateUserPayload) =>
    apiFetch<ApiResponse<UserItem>>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateUser: (userId: number, payload: UpdateUserPayload) =>
    apiFetch<ApiResponse<UserItem>>(`/api/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  activateUser: (userId: number) =>
    apiFetch<ApiResponse<UserItem>>(`/api/admin/users/${userId}/activate`, { method: 'PUT' }),

  deactivateUser: (userId: number) =>
    apiFetch<ApiResponse<UserItem>>(`/api/admin/users/${userId}/deactivate`, { method: 'PUT' }),

  // Role grants
  getRoleGrants: () =>
    apiFetch<ApiResponse<RoleGrantItem[]>>('/api/admin/roles'),

  grantRole: (payload: GrantRolePayload) =>
    apiFetch<ApiResponse<UserItem>>('/api/admin/roles/grant', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  revokeRole: (payload: GrantRolePayload) =>
    apiFetch<ApiResponse<UserItem>>('/api/admin/roles/revoke', {
      method: 'DELETE',
      body: JSON.stringify(payload),
    }),

  // System log
  getSystemLogs: () =>
    apiFetch<ApiResponse<SystemLogItem[]>>('/api/admin/system-logs'),
};

// ── Events ────────────────────────────────────────────────────────

export interface HackathonEvent {
  eventId: number;
  name: string;
  season: string;
  year: number;
  description?: string;
  registrationStart: string;
  registrationEnd: string;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
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
  trackId: number;
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
  roundId: number;
  eventId: number;
  eventName?: string;
  name: string;
  orderNumber: number;
  startTime: string;
  endTime: string;
  submissionDeadline: string;
  topNAdvance?: number;
  isFinal: boolean;
  status?: string;
}

export interface CreateRoundPayload {
  name: string;
  orderNumber: number;
  startTime: string;
  endTime: string;
  submissionDeadline: string;
  topNAdvance?: number;
  isFinal?: boolean;
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
  teamId: number;
  eventId: number;
  eventName?: string;
  trackId: number;
  trackName?: string;
  name: string;
  description?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISQUALIFIED';
  createdAt?: string;
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
  submissionId: number;
  teamId: number;
  teamName: string;
  roundId: number;
  roundName?: string;
  repoUrl: string;
  demoUrl?: string;
  slideUrl?: string;
  description?: string;
  submittedAt: string;
  submittedByName?: string;
  status?: string;
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
  criteriaId: number;
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

// Backend returns a FLAT list — one row per (judge, criteria) — not grouped.
export interface ScoreRecord {
  scoreId: number;
  submissionId: number;
  judgeUserId: number;
  judgeName: string;
  criteriaId: number;
  criteriaName: string;
  value: number;
  comment?: string;
  isDraft: boolean;
  scoredAt?: string;
  updatedAt?: string;
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
    apiFetch<ApiResponse<unknown>>('/api/scores', {
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
  resultId: number;
  teamId: number;
  teamName: string;
  trackName?: string;
  roundId: number;
  roundName?: string;
  totalScore: number;
  rankPosition: number;
  advanced: boolean;
  isPublished?: boolean;
  finalizedAt?: string;
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
  notificationId: number;
  title: string;
  content: string;
  type?: string;
  isRead: boolean;
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

// ── Coordinator lookups & assignments ─────────────────────────────

// Roster row: one judge assigned to one round (+track for preliminary rounds).
export interface JudgeRosterItem {
  id: number;
  judgeUserId: number;
  judgeName: string;
  judgeType?: string;
  roundId: number;
  roundName: string;
  isFinal?: boolean;
  trackId?: number;
  trackName?: string;
}

export interface AssignJudgePayload {
  judgeUserId: number;
  roundId: number;
  trackId?: number | null;
}

export interface CreateGuestJudgePayload {
  fullName: string;
  email: string;
  password: string;
  roundId: number;
  trackId?: number | null;
}

export const coordinatorApi = {
  // Approved STAFF pool (no longer available under /api/admin after the split)
  getStaff: () =>
    apiFetch<ApiResponse<UserItem[]>>('/api/coordinator/staff'),

  // Judge roster for an event
  getJudgeRoster: (eventId: number) =>
    apiFetch<ApiResponse<JudgeRosterItem[]>>(`/api/coordinator/assignments/judges?eventId=${eventId}`),

  assignJudge: (payload: AssignJudgePayload) =>
    apiFetch<ApiResponse<unknown>>('/api/coordinator/assignments/judges', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  removeJudgeAssignment: (assignmentId: number) =>
    apiFetch<ApiResponse<void>>(`/api/coordinator/assignments/judges/${assignmentId}`, { method: 'DELETE' }),

  createGuestJudge: (payload: CreateGuestJudgePayload) =>
    apiFetch<ApiResponse<unknown>>('/api/coordinator/guest-judges', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
