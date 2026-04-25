"use client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
let refreshRequest: Promise<boolean> | null = null;

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function refreshAccessToken() {
  if (!refreshRequest) {
    refreshRequest = fetch(`${API_BASE}/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  hasRetried = false,
) {
  const headers = new Headers(init.headers);
  const isFormData = init.body instanceof FormData;

  if (!isFormData && init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}/v1${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  const payload = await response
    .text()
    .then((text) => (text ? JSON.parse(text) : null))
    .catch(() => null);

  if (!response.ok) {
    if (
      response.status === 401 &&
      !hasRetried &&
      path !== "/auth/refresh" &&
      path !== "/auth/logout"
    ) {
      const didRefresh = await refreshAccessToken();

      if (didRefresh) {
        return apiRequest<T>(path, init, true);
      }
    }

    const message =
      typeof payload === "object" && payload && "error" in payload
        ? JSON.stringify(payload)
        : "Request failed";
    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}

export function apiGet<T>(path: string) {
  return apiRequest<T>(path);
}

export function apiPost<T>(path: string, body?: unknown) {
  return apiRequest<T>(path, {
    method: "POST",
    body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
  });
}

export function apiPatch<T>(path: string, body?: unknown) {
  return apiRequest<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body ?? {}),
  });
}
