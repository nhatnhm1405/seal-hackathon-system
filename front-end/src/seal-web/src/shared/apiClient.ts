const BASE_URL = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ?? 'http://localhost:8080';
export const API_BASE_URL = BASE_URL;
const TOKEN_KEY = 'seal_auth_token';

// ── Token helpers ────────────────────────────────────────────────────
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string, remember = true): void {
  // Clear the *other* store first. getToken() reads localStorage before
  // sessionStorage, so a leftover token in localStorage (e.g. a previous
  // "remember me" session) would otherwise shadow a new sessionStorage token
  // and make every request carry the wrong identity.
  if (remember) {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
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

// Pull a user-facing message out of any thrown value. Backend errors surface
// as ApiError (message from the API body); anything else gets the fallback.
// Used by CRUD handlers to feed the failure banner a meaningful message.
export function apiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof ApiError && err.message) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
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

  // Complete a running event (IN_PROGRESS → COMPLETED). Backend: SYSTEM_ADMIN
  // only — a Coordinator token gets 403 here.
  complete: (eventId: number) =>
    apiFetch<ApiResponse<HackathonEvent>>(`/api/events/${eventId}/complete`, {
      method: 'POST',
    }),

  // Reopen a COMPLETED event (COMPLETED → IN_PROGRESS). Backend: SYSTEM_ADMIN
  // only — a Coordinator token gets 403 here.
  reopen: (eventId: number) =>
    apiFetch<ApiResponse<HackathonEvent>>(`/api/events/${eventId}/reopen`, {
      method: 'POST',
    }),
};

// ── Reopen Requests ────────────────────────────────────────────────
// Coordinator asks an Admin to reopen a COMPLETED event (Coordinators cannot
// reopen themselves). Admin reviews the queue and approves (→ reopens) / rejects.

export interface ReopenRequest {
  requestId: number;
  eventId: number;
  eventName?: string;
  requestedById: number;
  requesterName?: string;
  requesterEmail?: string;
  reason?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  resolvedById?: number;
  resolverName?: string;
  createdAt: string;
  resolvedAt?: string;
}

export const reopenRequestsApi = {
  // Coordinator: file a reopen request for a COMPLETED event.
  create: (eventId: number, reason?: string) =>
    apiFetch<ApiResponse<ReopenRequest>>(`/api/events/${eventId}/reopen-requests`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // Latest request for an event (data may be null) — used to show "awaiting
  // admin review" instead of a fresh request button.
  getForEvent: (eventId: number) =>
    apiFetch<ApiResponse<ReopenRequest | null>>(`/api/events/${eventId}/reopen-requests`),

  // Admin: pending review queue.
  getPending: () =>
    apiFetch<ApiResponse<ReopenRequest[]>>('/api/admin/reopen-requests'),

  approve: (requestId: number) =>
    apiFetch<ApiResponse<ReopenRequest>>(`/api/admin/reopen-requests/${requestId}/approve`, { method: 'POST' }),

  reject: (requestId: number) =>
    apiFetch<ApiResponse<ReopenRequest>>(`/api/admin/reopen-requests/${requestId}/reject`, { method: 'POST' }),
};

// ── Audit Log ──────────────────────────────────────────────────────
// Competition business-action trail for an event (CREATE_EVENT, DRAW_TRACKS,
// REDRAW_TRACKS...). Readable by the event's Coordinator and the System Admin.

export interface AuditLogEntry {
  logId: number;
  actorUserId: number;
  actorName?: string;
  action: string;
  targetType?: string;
  targetId?: number;
  reason?: string;
  metadataJson?: string;
  ipAddress?: string;
  createdAt: string;
}

export const auditLogsApi = {
  // Newest-first audit entries scoped to one event (target EVENT/eventId).
  getForEvent: (eventId: number) =>
    apiFetch<ApiResponse<AuditLogEntry[]>>(`/api/events/${eventId}/audit-logs`),
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

// ── Track "đề thi" (problem statement) ─────────────────────────────
// One file per track. Coordinator uploads (event SETUP/IN_PROGRESS) then releases
// it; members of an approved team in the track download a released problem. The
// file is access-controlled — never served from the public /uploads path.

export interface TrackProblem {
  trackId: number;
  trackName: string;
  hasProblem: boolean;
  fileName?: string | null;
  fileSize?: number | null;
  contentType?: string | null;
  released: boolean;
  uploadedAt?: string | null;
  releasedAt?: string | null;
}

export const problemsApi = {
  // Coordinator: status of every track's problem in the event.
  listForEvent: (eventId: number) =>
    apiFetch<ApiResponse<TrackProblem[]>>(`/api/events/${eventId}/problems`),

  // Coordinator or a participant in the track: problem metadata (participants only
  // see it once released).
  get: (eventId: number, trackId: number) =>
    apiFetch<ApiResponse<TrackProblem>>(`/api/events/${eventId}/tracks/${trackId}/problem`),

  // Coordinator: upload / replace the problem file (multipart).
  upload: (eventId: number, trackId: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiFetch<ApiResponse<TrackProblem>>(
      `/api/events/${eventId}/tracks/${trackId}/problem`,
      { method: 'POST', body: form },
    );
  },

  // Coordinator: publish / hide the problem.
  release: (eventId: number, trackId: number) =>
    apiFetch<ApiResponse<TrackProblem>>(
      `/api/events/${eventId}/tracks/${trackId}/problem/release`, { method: 'PUT' }),
  retract: (eventId: number, trackId: number) =>
    apiFetch<ApiResponse<TrackProblem>>(
      `/api/events/${eventId}/tracks/${trackId}/problem/retract`, { method: 'PUT' }),

  // Coordinator: remove the problem entirely.
  remove: (eventId: number, trackId: number) =>
    apiFetch<ApiResponse<void>>(
      `/api/events/${eventId}/tracks/${trackId}/problem`, { method: 'DELETE' }),

  // Open the file (with auth) in a new tab to VIEW it. PDFs/images preview inline;
  // other types (docx/zip) the browser can't preview, so they download instead.
  // Opens the tab synchronously first so popup blockers don't kill it after await.
  view: async (eventId: number, trackId: number) => {
    const win = window.open('', '_blank');
    try {
      const res = await fetch(
        `${BASE_URL}/api/events/${eventId}/tracks/${trackId}/problem/download`,
        { headers: { ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) } },
      );
      if (!res.ok) {
        win?.close();
        const body = await res.json().catch(() => ({}));
        throw new ApiError(res.status, body?.message ?? `HTTP ${res.status}`);
      }
      const url = URL.createObjectURL(await res.blob());
      if (win) win.location.href = url;
      else window.open(url, '_blank', 'noopener'); // popup blocked — best-effort retry
      setTimeout(() => URL.revokeObjectURL(url), 60_000); // give the tab time to load
    } catch (err) {
      win?.close();
      throw err;
    }
  },

  // Download the file (with auth) and trigger a browser "Save as". Returns nothing;
  // throws ApiError on failure so callers can surface a message.
  download: async (eventId: number, trackId: number, fallbackName = 'problem') => {
    const res = await fetch(
      `${BASE_URL}/api/events/${eventId}/tracks/${trackId}/problem/download`,
      { headers: { ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) } },
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(res.status, body?.message ?? `HTTP ${res.status}`);
    }
    const blob = await res.blob();
    const name = filenameFromContentDisposition(res.headers.get('Content-Disposition')) ?? fallbackName;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

// Pull the original file name out of a Content-Disposition header
// (prefers RFC 5987 `filename*=UTF-8''…`, falls back to `filename="…"`).
function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (star?.[1]) {
    try { return decodeURIComponent(star[1]); } catch { /* fall through */ }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain?.[1] ?? null;
}

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
  clearTopNAdvance?: boolean; // send true to REMOVE the cut-off (topNAdvance can't be unset via null)
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

// ── Round Timers (live countdown per round phase) ───────────────────
// CONTEST gates team submission; JUDGING gates judge scoring. Time is
// server-authoritative: compute remaining from endsAt vs serverNow (correct for
// client clock skew) — never trust the local clock. See useRoundTimer.

export type TimerPhase = 'CONTEST' | 'JUDGING';
export type TimerStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPED' | 'EXPIRED';

export interface RoundTimerState {
  roundId: number;
  phase: TimerPhase;
  status: TimerStatus;
  durationSeconds?: number | null;
  startedAt?: string | null;
  endsAt?: string | null;
  remainingSeconds: number;
  serverNow: string;
  milestoneMinutes?: number[] | null;
  notifyAtHalf?: boolean | null;
}

export interface StartTimerPayload {
  durationSeconds: number;
  milestoneMinutes?: number[];
  notifyAtHalf?: boolean;
}

export const timersApi = {
  get: (eventId: number, roundId: number, phase: TimerPhase) =>
    apiFetch<ApiResponse<RoundTimerState>>(`/api/events/${eventId}/rounds/${roundId}/timer/${phase}`),

  start: (eventId: number, roundId: number, phase: TimerPhase, payload: StartTimerPayload) =>
    apiFetch<ApiResponse<RoundTimerState>>(`/api/events/${eventId}/rounds/${roundId}/timer/${phase}/start`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  pause: (eventId: number, roundId: number, phase: TimerPhase) =>
    apiFetch<ApiResponse<RoundTimerState>>(`/api/events/${eventId}/rounds/${roundId}/timer/${phase}/pause`, { method: 'POST' }),

  resume: (eventId: number, roundId: number, phase: TimerPhase) =>
    apiFetch<ApiResponse<RoundTimerState>>(`/api/events/${eventId}/rounds/${roundId}/timer/${phase}/resume`, { method: 'POST' }),

  stop: (eventId: number, roundId: number, phase: TimerPhase) =>
    apiFetch<ApiResponse<RoundTimerState>>(`/api/events/${eventId}/rounds/${roundId}/timer/${phase}/stop`, { method: 'POST' }),

  extend: (eventId: number, roundId: number, phase: TimerPhase, seconds: number) =>
    apiFetch<ApiResponse<RoundTimerState>>(`/api/events/${eventId}/rounds/${roundId}/timer/${phase}/extend`, {
      method: 'POST',
      body: JSON.stringify({ seconds }),
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
  role?: 'LEADER' | 'MEMBER';
  memberRole?: 'LEADER' | 'MEMBER'; // field name returned by GET /api/teams/event/{id}
  joinedAt?: string;
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
  trackId?: number | null;
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

// One past/present team the participant has been on (GET /api/teams/my/history).
export interface TeamHistoryEntry {
  eventId: number;
  eventName: string;
  season?: string;
  year?: number;
  eventStatus: string;
  teamId: number;
  teamName: string;
  trackName?: string | null;
  teamStatus: string;
  myRole?: string;
  members: { fullName: string; role: string }[];
  rounds: { roundName: string; isFinal: boolean; rankPosition: number; advanced: boolean; totalScore: number }[];
  submissions: { roundName: string; repoUrl?: string; demoUrl?: string; slideUrl?: string; submittedAt?: string; status: string }[];
  prize: { name: string; rankPosition: number; awardedAt?: string } | null;
}

export const teamsApi = {
  getActiveEvents: () =>
    apiFetch<ApiResponse<ActiveEventWithTracks[]>>('/api/teams/active-events'),

  getMyHistory: () =>
    apiFetch<ApiResponse<TeamHistoryEntry[]>>('/api/teams/my/history'),

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

  // SETUP only: coordinator drags a team into a track, or to the unassigned pool
  // (trackId = null). Capacity is NOT hard-capped here (soft warning on the UI).
  assignTrack: (teamId: number, trackId: number | null) =>
    apiFetch<ApiResponse<Team>>(`/api/teams/${teamId}/track-assignment`, {
      method: 'PUT',
      body: JSON.stringify({ trackId }),
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
  teamName: string;
  eventId: number;
  eventName: string;
  trackId?: number;
  trackName?: string;
  teamStatus: string;
  memberCount: number;
  leaderName?: string;
  alreadyRequested?: boolean;
}

export interface JoinableTeamList {
  totalJoinableTeams: number;
  teams: JoinableTeam[];
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
    return apiFetch<ApiResponse<JoinableTeamList>>(`/api/join-requests/joinable-teams${suffix}`);
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

// ── AI Judge Assistant ────────────────────────────────────────────
// Advisory, anonymity-safe reading of a submission to help a judge orient
// before scoring. Never writes scores — suggestions are reference-only.

export interface AiCriteriaInsight {
  criteriaName: string;
  assessment: string;
  suggestedScoreRange: string;
}

// Anonymized analysis of the submission's GitHub repository. Facts here are read
// straight from GitHub (not the model), so techStack/signals/redFlags are reliable.
export interface AiRepoAnalysis {
  analyzed: boolean;
  note: string | null;
  techStack: string[];
  signals: string[];
  redFlags: string[];
}

export interface AiInsight {
  summary: string;
  strengths: string[];
  concerns: string[];
  criteriaInsights: AiCriteriaInsight[];
  repo?: AiRepoAnalysis | null;
  disclaimer: string;
  model: string;
}

export const aiApi = {
  // JUDGE / EVENT_COORDINATOR only. May take a few seconds (calls Gemini).
  getSubmissionInsights: (submissionId: number) =>
    apiFetch<ApiResponse<AiInsight>>(`/api/ai/submissions/${submissionId}/insights`, {
      method: 'POST',
    }),
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

// ── Prizes (event-wide awards) ────────────────────────────────────

export interface Prize {
  prizeId: number;
  eventId: number;
  name: string;
  description?: string;
  rankPosition: number;
  teamId?: number | null;
  teamName?: string | null;
  teamTrackName?: string | null;
  finalScore?: number | null;
  awardedAt?: string | null;
  announced: boolean;
}

export interface CreatePrizePayload {
  name: string;
  description?: string;
  rankPosition: number;
  teamId?: number | null;
}

export interface UpdatePrizePayload {
  name?: string;
  description?: string;
  rankPosition?: number;
  teamId?: number | null;
}

export const prizesApi = {
  // Public sees announced only; coordinator token returns drafts too.
  getAll: (eventId: number) =>
    apiFetch<ApiResponse<Prize[]>>(`/api/events/${eventId}/prizes`),

  create: (eventId: number, payload: CreatePrizePayload) =>
    apiFetch<ApiResponse<Prize>>(`/api/events/${eventId}/prizes`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (eventId: number, prizeId: number, payload: UpdatePrizePayload) =>
    apiFetch<ApiResponse<Prize>>(`/api/events/${eventId}/prizes/${prizeId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  remove: (eventId: number, prizeId: number) =>
    apiFetch<ApiResponse<void>>(`/api/events/${eventId}/prizes/${prizeId}`, {
      method: 'DELETE',
    }),

  autoGenerate: (eventId: number, topN: number) =>
    apiFetch<ApiResponse<Prize[]>>(`/api/events/${eventId}/prizes/auto-generate`, {
      method: 'POST',
      body: JSON.stringify({ topN }),
    }),

  announce: (eventId: number) =>
    apiFetch<ApiResponse<Prize[]>>(`/api/events/${eventId}/prizes/announce`, {
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
  // Set only for ANNOUNCEMENT notifications (resolved from the source Announcement).
  senderName?: string | null;
  senderRole?: string | null;   // MENTOR | COORDINATOR
  scopeLabel?: string | null;   // track name (mentor) or event name (coordinator)
  linkUrl?: string | null;      // optional attachment link
}

export interface AnnouncementItem {
  announcementId: number;
  title: string;
  content: string;
  senderName: string;
  senderRole: string;   // MENTOR | COORDINATOR
  scope: string;        // TRACK | EVENT
  audience?: string | null;   // PARTICIPANT | JUDGE | MENTOR | ALL
  scopeLabel: string;
  linkUrl?: string | null;
  recipientCount: number;
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
  trackId: number;
  trackName: string;
  members: AssignmentMember[];
  submissionCount: number;
  lastSubmittedAt: string | null;
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

// Read-only mentor history (GET /api/mentor/assignments/history).
export interface MentorHistoryEntry {
  eventId: number;
  eventName: string;
  season?: string;
  year?: number;
  eventStatus: string;
  tracks: {
    trackId: number;
    trackName: string;
    teams: { teamId: number; teamName: string; teamStatus: string; finalRank?: number | null; prizeName?: string | null }[];
  }[];
}

export const assignmentsApi = {
  getMentorAssignments: () =>
    apiFetch<ApiResponse<MentorAssignment>>('/api/mentor/assignments'),

  getMentorHistory: () =>
    apiFetch<ApiResponse<MentorHistoryEntry[]>>('/api/mentor/assignments/history'),

  getJudgeAssignments: () =>
    apiFetch<ApiResponse<JudgeAssignment>>('/api/judge/assignments'),
};

// ── Announcements (Mentor: track-scoped · Coordinator: event-scoped) ──
export const announcementsApi = {
  // Mentor → all participants of one of their tracks.
  createMentor: (payload: { trackId: number; title: string; content: string; linkUrl?: string }) =>
    apiFetch<ApiResponse<AnnouncementItem>>('/api/mentor/announcements', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  listMentor: () =>
    apiFetch<ApiResponse<AnnouncementItem[]>>('/api/mentor/announcements'),

  // Coordinator → an audience (PARTICIPANT | JUDGE | MENTOR | ALL) across an event.
  createCoordinator: (payload: { eventId: number; audience: string; title: string; content: string; linkUrl?: string }) =>
    apiFetch<ApiResponse<AnnouncementItem>>('/api/coordinator/announcements', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  listCoordinator: () =>
    apiFetch<ApiResponse<AnnouncementItem[]>>('/api/coordinator/announcements'),
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
