import { apiRequest, clearAuthToken, setAuthToken } from "@/shared/api/http";

export type RegisterUserType = "FPT_STUDENT" | "EXTERNAL_STUDENT" | "STAFF";

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  userType: RegisterUserType;
  studentId?: string;
  university?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponseData {
  token?: string;
  userId?: number;
  user_id?: number;
  user?: unknown;
  [key: string]: unknown;
}

function unwrapData<T = unknown>(response: unknown): T {
  if (response && typeof response === "object" && "data" in response) {
    return (response as { data: T }).data;
  }
  return response as T;
}

export async function loginUser(payload: LoginRequest) {
  const response = await apiRequest<unknown>("/api/auth/login", {
    method: "POST",
    auth: false,
    body: payload,
  });
  const data = unwrapData<LoginResponseData>(response);
  if (data.token) setAuthToken(data.token);
  return data;
}

export async function registerUser(payload: RegisterRequest) {
  return apiRequest<unknown>("/api/auth/register", {
    method: "POST",
    auth: false,
    body: payload,
  });
}

export async function getCurrentUser() {
  const response = await apiRequest<unknown>("/api/auth/me");
  return unwrapData(response);
}

export async function logoutUser() {
  try {
    await apiRequest<unknown>("/api/auth/logout", { method: "POST" });
  } finally {
    clearAuthToken();
  }
}
