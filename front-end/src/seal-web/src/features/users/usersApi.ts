import { apiRequest } from "@/shared/api/http";
import type { AccountApproval, User } from "@/shared/mocks/mockData";

export interface PendingApprovalsResult {
  approvals: AccountApproval[];
  users: User[];
}

export interface CreateStaffRequest {
  email: string;
  password: string;
  fullName: string;
  roleName: "JUDGE" | "MENTOR" | "COORDINATOR";
  judgeType?: "INTERNAL" | "GUEST";
  eventId?: number;
  roundId?: number;
  trackId?: number;
}

export interface AssignRoleRequest {
  roleName: "JUDGE" | "MENTOR" | "COORDINATOR";
  eventId?: number;
  roundId?: number;
  trackId?: number;
}

function unwrapData(response: unknown): unknown {
  if (response && typeof response === "object" && "data" in response) {
    return (response as { data: unknown }).data;
  }
  return response;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function pickString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") return value;
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

function unwrapArray(response: unknown, keys: string[]) {
  const data = unwrapData(response);
  if (Array.isArray(data)) return data;
  const record = toRecord(data);
  if (!record) return [];
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function normalizeRole(value: unknown): User["role"] {
  if (typeof value !== "string") return "PARTICIPANT";
  const role = value.toUpperCase();
  if (role.includes("COORDINATOR") || role.includes("ADMIN")) return "COORDINATOR";
  if (role.includes("MENTOR")) return "MENTOR";
  if (role.includes("JUDGE")) return "JUDGE";
  return "PARTICIPANT";
}

function normalizeStudentType(value: unknown): User["student_type"] {
  if (typeof value !== "string") return null;
  const studentType = value.toUpperCase();
  if (studentType.includes("EXTERNAL")) return "EXTERNAL";
  if (studentType.includes("FPT")) return "FPT";
  return null;
}

function normalizeStatus(value: unknown): AccountApproval["status"] {
  if (typeof value !== "string") return "PENDING";
  const status = value.toUpperCase();
  if (status.includes("APPROVED")) return "APPROVED";
  if (status.includes("REJECTED")) return "REJECTED";
  return "PENDING";
}

export function mapApiUser(value: unknown): User | null {
  const record = toRecord(value);
  if (!record) return null;
  const userId = pickNumber(record, ["user_id", "userId", "id"]);
  const email = pickString(record, ["email", "mail"]);
  if (userId === undefined || !email) return null;

  return {
    user_id: userId,
    role: normalizeRole(record.role ?? record.roleName ?? record.userRole),
    email,
    full_name: pickString(record, ["full_name", "fullName", "name", "displayName"]) ?? email,
    student_type: normalizeStudentType(record.student_type ?? record.studentType ?? record.userType),
    student_id: pickString(record, ["student_id", "studentId"]) ?? null,
    university_name: pickString(record, ["university_name", "universityName", "university"]) ?? null,
    status: normalizeStatus(record.status) === "REJECTED" ? "INACTIVE" : "ACTIVE",
  };
}

function mapPendingApproval(value: unknown, index: number): { approval: AccountApproval; user: User | null } | null {
  const record = toRecord(value);
  if (!record) return null;
  const nestedUser = toRecord(record.user ?? record.account ?? record.profile);
  const user = mapApiUser(nestedUser ?? record);
  const userId = pickNumber(record, ["user_id", "userId", "userID"]) ?? user?.user_id;
  if (userId === undefined) return null;

  return {
    approval: {
      approval_id: pickNumber(record, ["approval_id", "approvalId", "id"]) ?? userId ?? index + 1,
      user_id: userId,
      status: normalizeStatus(record.status),
      note: pickString(record, ["note", "reason", "rejectionReason"]) ?? null,
      created_at: pickString(record, ["created_at", "createdAt", "appliedAt", "createdDate"]) ?? new Date().toISOString(),
    },
    user,
  };
}

export async function getPendingApprovals(): Promise<PendingApprovalsResult> {
  const response = await apiRequest<unknown>("/api/account-approvals/pending");
  const mapped = unwrapArray(response, ["approvals", "pendingApprovals", "items", "content"])
    .map(mapPendingApproval)
    .filter((item): item is { approval: AccountApproval; user: User | null } => !!item);

  return {
    approvals: mapped.map(item => item.approval),
    users: mapped.map(item => item.user).filter((user): user is User => !!user),
  };
}

export function approveUser(userId: number) {
  return apiRequest<unknown>(`/api/account-approvals/${userId}/approve`, { method: "PUT" });
}

export function rejectUser(userId: number) {
  return apiRequest<unknown>(`/api/account-approvals/${userId}/reject`, { method: "PUT" });
}

export async function getUsers() {
  const response = await apiRequest<unknown>("/api/users");
  return unwrapArray(response, ["users", "items", "content"]).map(mapApiUser).filter((user): user is User => !!user);
}

export async function getUserById(userId: number) {
  const response = await apiRequest<unknown>(`/api/users/${userId}`);
  return mapApiUser(unwrapData(response));
}

export function createStaff(payload: CreateStaffRequest) {
  return apiRequest<unknown>("/api/users/staff", {
    method: "POST",
    body: payload as unknown as Record<string, unknown>,
  });
}

export function assignRoleToStaff(userId: number, payload: AssignRoleRequest) {
  return apiRequest<unknown>(`/api/users/${userId}/roles`, {
    method: "POST",
    body: payload as unknown as Record<string, unknown>,
  });
}

export function deactivateUser(userId: number) {
  return apiRequest<unknown>(`/api/users/${userId}/deactivate`, { method: "PUT" });
}

export function activateUser(userId: number) {
  return apiRequest<unknown>(`/api/users/${userId}/activate`, { method: "PUT" });
}
