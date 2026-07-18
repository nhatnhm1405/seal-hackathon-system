import { apiFetch, type ApiResponse } from './core';

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

  // Active, approved participants — the "All Participant" account tab.
  getActiveParticipants: () =>
    apiFetch<ApiResponse<UserItem[]>>('/api/account-approvals/participants'),

  // Active, approved judge/mentor-eligible staff — the "Judge & Mentor" account tab.
  getActiveJudgeMentorStaff: () =>
    apiFetch<ApiResponse<UserItem[]>>('/api/account-approvals/staff'),

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

  // Directly (re)activate / deactivate an account — e.g. bring a guest judge back
  // for a new season (guest judges have no self-service request flow).
  activateUser: (userId: number) =>
    apiFetch<ApiResponse<UserItem>>(`/api/admin/users/${userId}/activate`, { method: 'POST' }),

  deactivateUser: (userId: number) =>
    apiFetch<ApiResponse<UserItem>>(`/api/admin/users/${userId}/deactivate`, { method: 'POST' }),

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
