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
  // For FormData (file uploads) let the browser set the multipart Content-Type
  // with its boundary — forcing application/json would break the request.
  const isFormData = options.body instanceof FormData;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
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
  avatarUrl?: string | null;
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

  updateMe: (payload: UpdateProfilePayload) =>
    apiFetch<ApiResponse<UserProfile>>('/api/auth/me', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // First-time OAuth user picks their account type + student details.
  completeProfile: (payload: CompleteProfilePayload) =>
    apiFetch<ApiResponse<UserProfile>>('/api/auth/complete-profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  logout: () =>
    apiFetch<void>('/api/auth/logout', { method: 'POST' }),

  // Upload a new profile picture (multipart). Returns the updated profile.
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiFetch<ApiResponse<UserProfile>>('/api/auth/me/avatar', {
      method: 'POST',
      body: form,
    });
  },

  // Remove the current profile picture. Returns the updated profile.
  deleteAvatar: () =>
    apiFetch<ApiResponse<UserProfile>>('/api/auth/me/avatar', { method: 'DELETE' }),
};

export interface UpdateProfilePayload {
  fullName?: string;
  studentId?: string;
  university?: string;
}

// OAuth self-signup is for students only; staff are provisioned by an admin.
export interface CompleteProfilePayload {
  userType: 'FPT_STUDENT' | 'EXTERNAL_STUDENT';
  studentId?: string;
  university?: string;
}

// Sentinel userType for a first-time OAuth account that hasn't completed signup.
export const PENDING_PROFILE = 'PENDING_PROFILE';

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
  status: 'DRAFT' | 'OPEN' | 'SETUP' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  trackSelectionMode?: 'SELF_SELECT' | 'RANDOM';
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
  trackSelectionMode?: string;
}

export interface UpdateEventPayload {
  name?: string;
  description?: string;
  status?: string;
  trackSelectionMode?: string;
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
  capacity?: number | null;
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

// GET /api/teams/my — the current user's team in the active event.
export interface MyTeamMember {
  userId: number;
  memberName: string;
  role: 'LEADER' | 'MEMBER';
}

export interface MyTeam {
  teamId: number;
  eventId?: number;
  eventName?: string;
  trackName?: string;
  name: string;
  eventStatus?: 'DRAFT' | 'OPEN' | 'SETUP' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  trackSelectionMode?: 'SELF_SELECT' | 'RANDOM';
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISQUALIFIED';
  myRole?: 'LEADER' | 'MEMBER';
  members: MyTeamMember[];
}

export interface UpdateTeamPayload {
  name?: string;
  description?: string;
}

export interface ActiveEventWithTracks {
  eventId: number;
  name: string;
  season?: string;
  year?: number;
  description?: string;
  registrationStart?: string;
  registrationEnd?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  tracks: { trackId: number; name: string; description?: string }[];
}

export interface CreateTeamPayload {
  eventId: number;
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
    apiFetch<ApiResponse<MyTeam>>('/api/teams/my'),

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

  // Participant team management
  searchUsers: (query: string) =>
    apiFetch<ApiResponse<UserItem[]>>(`/api/teams/search-users?query=${encodeURIComponent(query)}`),

  update: (teamId: number, payload: UpdateTeamPayload) =>
    apiFetch<ApiResponse<MyTeam>>(`/api/teams/${teamId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  removeMember: (teamId: number, userId: number) =>
    apiFetch<ApiResponse<MyTeam>>(`/api/teams/${teamId}/members/${userId}`, { method: 'DELETE' }),

  transferLeadership: (teamId: number, newLeaderUserId: number) =>
    apiFetch<ApiResponse<MyTeam>>(`/api/teams/${teamId}/transfer/${newLeaderUserId}`, { method: 'PUT' }),

  leave: (teamId: number) =>
    apiFetch<ApiResponse<void>>(`/api/teams/${teamId}/leave`, { method: 'POST' }),

  // SELF_SELECT events: leader picks the team's track during SETUP.
  selectTrack: (teamId: number, trackId: number) =>
    apiFetch<ApiResponse<MyTeam>>(`/api/teams/${teamId}/track`, {
      method: 'PUT',
      body: JSON.stringify({ trackId }),
    }),

  // RANDOM events (or to fill stragglers): coordinator draws teams into tracks.
  drawTracks: (eventId: number, includeAssigned = false) =>
    apiFetch<ApiResponse<Team[]>>(`/api/teams/event/${eventId}/draw-tracks?includeAssigned=${includeAssigned}`, {
      method: 'POST',
    }),
};

// ── Team Invites ──────────────────────────────────────────────────

export interface TeamInvite {
  inviteId: number;
  teamId: number;
  teamName: string;
  eventName?: string;
  trackName?: string;
  teamStatus?: string;
  invitedUserId: number;
  invitedUserName?: string;
  invitedById: number;
  invitedByName: string;
  message?: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: string;
  respondedAt?: string;
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

// ── Join Requests (participant asks to join a team) ────────────────

export interface JoinableTeam {
  teamId: number;
  name: string;
  eventId: number;
  eventName: string;
  trackId?: number;
  trackName?: string;
  status: string;
  memberCount: number;
  leaderName?: string;
  alreadyRequested: boolean;
}

export interface JoinRequest {
  requestId: number;
  teamId: number;
  teamName: string;
  eventName?: string;
  trackName?: string;
  requesterId: number;
  requesterName: string;
  requesterEmail?: string;
  message?: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: string;
  respondedAt?: string;
}

export const joinRequestsApi = {
  // Browse / search teams the participant can request to join.
  getJoinableTeams: (params: { eventId?: number; query?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.eventId != null) qs.set('eventId', String(params.eventId));
    if (params.query) qs.set('query', params.query);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return apiFetch<ApiResponse<JoinableTeam[]>>(`/api/join-requests/joinable-teams${suffix}`);
  },

  send: (teamId: number, message?: string) =>
    apiFetch<ApiResponse<JoinRequest>>(`/api/join-requests/teams/${teamId}`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  // Requests the current participant has sent.
  getMine: () =>
    apiFetch<ApiResponse<JoinRequest[]>>('/api/join-requests/my'),

  cancel: (requestId: number) =>
    apiFetch<ApiResponse<void>>(`/api/join-requests/${requestId}`, { method: 'DELETE' }),

  // Leader inbox: pending requests for a team they lead.
  getForTeam: (teamId: number) =>
    apiFetch<ApiResponse<JoinRequest[]>>(`/api/join-requests/teams/${teamId}`),

  accept: (requestId: number) =>
    apiFetch<ApiResponse<JoinRequest>>(`/api/join-requests/${requestId}/accept`, { method: 'PUT' }),

  decline: (requestId: number) =>
    apiFetch<ApiResponse<JoinRequest>>(`/api/join-requests/${requestId}/decline`, { method: 'PUT' }),
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

// Both endpoints return a SINGLE object (the logged-in mentor/judge) whose
// `teams` is the work list. Judge entries carry the roundId to score.
export interface AssignmentMember {
  userId: number;
  fullName: string;
  email: string;
  memberRole: 'LEADER' | 'MEMBER';
}

export interface MentorAssignedTeam {
  teamId: number;
  teamName: string;
  trackName: string;
  members: AssignmentMember[];
}

export interface JudgeAssignedTeam {
  teamId: number;
  teamName: string;
  trackName: string;
  roundId: number;
  members: AssignmentMember[];
}

export interface MentorAssignment {
  mentorId: number;
  mentorName: string;
  eventName: string;
  teams: MentorAssignedTeam[];
}

export interface JudgeAssignment {
  judgeId: number;
  judgeName: string;
  eventName: string;
  teams: JudgeAssignedTeam[];
}

export const assignmentsApi = {
  getMentorAssignments: () =>
    apiFetch<ApiResponse<MentorAssignment>>('/api/mentor/assignments'),

  getJudgeAssignments: () =>
    apiFetch<ApiResponse<JudgeAssignment>>('/api/judge/assignments'),
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

// Mentor roster row: one mentor assigned to one track (whole event).
export interface MentorRosterItem {
  id: number;
  mentorUserId: number;
  mentorName: string;
  trackId: number;
  trackName: string;
}

export interface AssignMentorPayload {
  mentorUserId: number;
  trackId: number;
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

  // Mentor assignments (mentor -> track, whole event)
  getMentorRoster: (eventId: number) =>
    apiFetch<ApiResponse<MentorRosterItem[]>>(`/api/coordinator/assignments/mentors?eventId=${eventId}`),

  assignMentor: (payload: AssignMentorPayload) =>
    apiFetch<ApiResponse<unknown>>('/api/coordinator/assignments/mentors', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  removeMentorAssignment: (assignmentId: number) =>
    apiFetch<ApiResponse<void>>(`/api/coordinator/assignments/mentors/${assignmentId}`, { method: 'DELETE' }),

  createGuestJudge: (payload: CreateGuestJudgePayload) =>
    apiFetch<ApiResponse<unknown>>('/api/coordinator/guest-judges', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
