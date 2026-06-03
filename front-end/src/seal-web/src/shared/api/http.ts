const DEFAULT_API_BASE_URL = "http://localhost:8080";
const TOKEN_STORAGE_KEY = "hms_auth_token";

type RequestBody = BodyInit | Record<string, unknown> | null | undefined;

interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  auth?: boolean;
  body?: RequestBody;
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function getEnvApiBaseUrl() {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  return env?.VITE_API_BASE_URL;
}

export const API_BASE_URL = (getEnvApiBaseUrl() ?? DEFAULT_API_BASE_URL).replace(/\/$/, "");

export function getAuthToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

function isJsonBody(body: RequestBody): body is Record<string, unknown> {
  return !!body && typeof body === "object" && !(body instanceof FormData) && !(body instanceof Blob);
}

function getErrorMessage(data: unknown, fallback: string) {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    const message = record.message ?? record.error ?? record.detail;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { auth = true, body, headers: rawHeaders, ...requestOptions } = options;
  const headers = new Headers(rawHeaders);

  let requestBody: BodyInit | null | undefined;
  if (isJsonBody(body)) {
    headers.set("Content-Type", "application/json");
    requestBody = JSON.stringify(body);
  } else {
    requestBody = body;
  }

  if (auth) {
    const token = getAuthToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    headers,
    body: requestBody,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    throw new ApiError(response.status, getErrorMessage(data, response.statusText), data);
  }

  return data as T;
}
