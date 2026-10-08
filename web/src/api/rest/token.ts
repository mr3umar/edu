import type { AuthUser } from '../../types/auth';

const STORAGE_KEY = 'auth-token';
const REFRESH_KEY = 'auth-refresh-token';
const EXPIRY_KEY = 'auth-token-expiry';
const USER_KEY = 'auth-user';

let _token: string | undefined;
let _refreshToken: string | undefined;
let _expiresAt: number | undefined;
let _user: AuthUser | undefined;
let _read = { refresh: false, expiry: false, user: false };

export function getAuthToken(): string | undefined {
  if (_token) return _token;

  try {
    _token = localStorage.getItem(STORAGE_KEY) ?? undefined;
  } catch {
    // localStorage unavailable (e.g. SSR) — fall back to in-memory only.
  }

  return _token;
}

export function setAuthToken(token: string | undefined): void {
  _token = token;

  try {
    if (token) {
      localStorage.setItem(STORAGE_KEY, token);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable — token still held in memory for this session.
  }
}

export function clearAuthToken(): void {
  setAuthToken(undefined);
}

export function getRefreshToken(): string | undefined {
  if (_read.refresh) return _refreshToken;
  _read.refresh = true;

  try {
    _refreshToken = localStorage.getItem(REFRESH_KEY) ?? undefined;
  } catch {
    // ignore
  }

  return _refreshToken;
}

export function setRefreshToken(token: string | undefined): void {
  _refreshToken = token;
  _read.refresh = true;

  try {
    if (token) {
      localStorage.setItem(REFRESH_KEY, token);
    } else {
      localStorage.removeItem(REFRESH_KEY);
    }
  } catch {
    // ignore
  }
}

// Epoch ms at which the current access token stops being valid.
export function getTokenExpiry(): number | undefined {
  if (_read.expiry) return _expiresAt;
  _read.expiry = true;

  try {
    const raw = localStorage.getItem(EXPIRY_KEY);
    _expiresAt = raw ? Number(raw) : undefined;
  } catch {
    // ignore
  }

  return _expiresAt;
}

export function setTokenExpiry(expiresAt: number | undefined): void {
  _expiresAt = expiresAt;
  _read.expiry = true;

  try {
    if (expiresAt) {
      localStorage.setItem(EXPIRY_KEY, String(expiresAt));
    } else {
      localStorage.removeItem(EXPIRY_KEY);
    }
  } catch {
    // ignore
  }
}

export function getStoredUser(): AuthUser | undefined {
  if (_read.user) return _user;
  _read.user = true;

  try {
    const raw = localStorage.getItem(USER_KEY);
    _user = raw ? (JSON.parse(raw) as AuthUser) : undefined;
  } catch {
    // ignore
  }

  return _user;
}

export function setStoredUser(user: AuthUser | undefined): void {
  _user = user;
  _read.user = true;

  try {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  } catch {
    // ignore
  }
}

// Persists everything a sign-in/sign-up/refresh/verify response hands back —
// per CLAUDE.md, the user object (and tokens) are saved to local storage so
// the session survives a reload.
export function saveSession(session: {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}): void {
  setAuthToken(session.accessToken);
  setRefreshToken(session.refreshToken);
  setTokenExpiry(Date.now() + session.expiresIn * 1000);
  setStoredUser(session.user);
  notifySession();
}

export function clearSession(): void {
  clearAuthToken();
  setRefreshToken(undefined);
  setTokenExpiry(undefined);
  setStoredUser(undefined);
  notifySession();
}

// Signed in: there's a token, or a refresh token to get a new one with (an
// expired access token is renewed on the next request, see http.ts).
export function hasSession(): boolean {
  return !!(getAuthToken() || getRefreshToken());
}

// Told when the session starts or ends: sign-in, sign-out, or a session the
// backend rejected and that couldn't be renewed. RequireAuth listens, so the
// user is sent to sign in from whatever page they're on.
const sessionListeners = new Set<() => void>();

export function subscribeSession(listener: () => void): () => void {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}

function notifySession(): void {
  sessionListeners.forEach(listener => listener());
}

// refreshAccessToken only returns { accessToken, expiresIn } — the refresh
// token and user stay whatever they already were.
export function saveAccessToken(session: { accessToken: string; expiresIn: number }): void {
  setAuthToken(session.accessToken);
  setTokenExpiry(Date.now() + session.expiresIn * 1000);
}

