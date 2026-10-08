import { getAuthToken, getRefreshToken, getTokenExpiry, saveAccessToken, clearSession } from './token';
import { ApiError } from './apiError';
import { resetConversation } from '../conversation';

// Same origin every REST service (listMyBooks, uploadPdf, ...) talks to.
export const API_BASE_URL = import.meta.env.VITE_API_HOST;

const REFRESH_PATH = '/api/refreshAccessToken';

// Coalesces concurrent refresh attempts into one in-flight request.
let refreshPromise: Promise<boolean> | null = null;

// RefreshAccessToken only ever returns { accessToken, expiresIn } — the
// refresh token itself isn't rotated and no user object comes back.
async function performRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const accessToken = getAuthToken();
    const response = await fetch(`${API_BASE_URL}${REFRESH_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ params: { refreshToken } }),
    });

    if (!response.ok) return false;

    const envelope = await response.json();
    if (envelope.error || !envelope.data?.accessToken) return false;

    saveAccessToken({ accessToken: envelope.data.accessToken, expiresIn: envelope.data.expiresIn });
    return true;
  } catch {
    return false;
  }
}

// The backend rejected the request's token: get a new one, or end the session
// (RequireAuth then sends the user to sign in). Whether it was renewed.
async function renewOrEndSession(): Promise<boolean> {
  const refreshed = await (refreshPromise ??= performRefresh().finally(() => {
    refreshPromise = null;
  }));
  if (!refreshed) {
    clearSession();
    resetConversation();
  }
  return refreshed;
}

// CLAUDE.md: refreshAccessToken runs whenever the access token has reached
// (or is about to reach) its expiry, proactively — not only reactively on 401.
export async function ensureFreshToken(): Promise<void> {
  const expiresAt = getTokenExpiry();
  if (!expiresAt || !getRefreshToken()) return;
  if (Date.now() < expiresAt - 10_000) return; // still valid, 10s safety margin

  // Shared with the 401 path, so frequent callers (e.g. every socket message)
  // trigger one refresh, not one each.
  await (refreshPromise ??= performRefresh().finally(() => {
    refreshPromise = null;
  }));
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH';

export type HttpRequest = {
  method: HttpMethod;
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
};

export type HttpResult<T> =
  | { statusCode: number; data: T; error?: undefined }
  | { statusCode?: number; data?: undefined; error: ApiError };

// Shared transport for every service in ./services — attaches the bearer token so services only describe method + path + body.
export async function httpFetch<T>(
  { method, path, headers, body }: HttpRequest,
  _isRetry = false
): Promise<HttpResult<T>> {
  if (path !== REFRESH_PATH && !_isRetry) {
    await ensureFreshToken();
  }

  const token = getAuthToken();

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    return { error: new ApiError('NetworkError', (err as Error).message) };
  }

  // Reactive refresh: the proactive check above can still miss a token the
  // backend has independently invalidated.
  if (response.status === 401 && path !== REFRESH_PATH && !_isRetry) {
    if (await renewOrEndSession()) {
      return httpFetch<T>({ method, path, headers, body }, true);
    }
  }

  // Every failure this backend sends back is a ServiceResult body — even on
  // a 500 — shaped { app, service, data, warnings, error: { code,
  // description }, instanceId }. Surface that real code, not just the HTTP
  // status text.
  const data = await response.json().catch(() => undefined);

  if (!response.ok) {
    const serviceError = data?.error;

    // The backend's way of saying the request had no valid token (a 500,
    // like its other errors): handled like a 401.
    if (serviceError?.code === 'MISSING_TOKEN' && path !== REFRESH_PATH && !_isRetry) {
      if (await renewOrEndSession()) {
        return httpFetch<T>({ method, path, headers, body }, true);
      }
    }

    if (serviceError?.code) {
      return {
        statusCode: response.status,
        error: new ApiError(serviceError.code, serviceError.description, response.status, serviceError.missingParams),
      };
    }
    return { statusCode: response.status, error: new ApiError('HTTPError', response.statusText, response.status) };
  }

  return { statusCode: response.status, data: data as T };
}
