import { API_BASE_URL } from '@/lib/env';

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

let unauthorizedHandler: (() => Promise<void> | void) | null = null;

export function registerUnauthorizedHandler(handler: (() => Promise<void> | void) | null) {
  unauthorizedHandler = handler;
}

type RequestOptions = RequestInit & {
  token?: string | null;
};

async function parseResponsePayload(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  const headers = new Headers(options.headers);
  const isFormData = options.body instanceof FormData;

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  if (!isFormData && options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}/v1${path}`, {
    ...options,
    headers,
  });

  const payload = await parseResponsePayload(response);

  if (!response.ok) {
    if (response.status === 401 && unauthorizedHandler) {
      await unauthorizedHandler();
    }

    throw new ApiError(
      typeof payload === 'object' && payload && 'message' in payload
        ? String((payload as { message?: string }).message)
        : 'Request failed',
      response.status,
      payload,
    );
  }

  return payload as T;
}

export function apiGet<T>(path: string, token?: string | null) {
  return apiRequest<T>(path, { method: 'GET', token });
}

export function apiPost<T>(path: string, body?: unknown, token?: string | null) {
  return apiRequest<T>(path, {
    method: 'POST',
    token,
    body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
  });
}

export function apiPatch<T>(path: string, body?: unknown, token?: string | null) {
  const isFormData = body instanceof FormData;

  return apiRequest<T>(path, {
    method: 'PATCH',
    token,
    body: isFormData ? body : JSON.stringify(body ?? {}),
  });
}

export function apiDelete<T>(path: string, token?: string | null) {
  return apiRequest<T>(path, {
    method: 'DELETE',
    token,
  });
}
