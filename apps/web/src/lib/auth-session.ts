'use client';

const PREFIX = 'resumind.';
export const STORAGE_KEYS = {
  access_token: `${PREFIX}access_token`,
  refresh_token: `${PREFIX}refresh_token`,
  expires_at: `${PREFIX}expires_at`,
} as const;

/** Shape returned by Nest `POST /auth/login`, `POST /auth/register`, and `POST /auth/refresh` */
export interface AuthTokenPayload {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: 'bearer';
  user: { id: string; email?: string };
}

export function saveSession(payload: AuthTokenPayload): void {
  if (typeof window === 'undefined') return;

  sessionStorage.setItem(STORAGE_KEYS.access_token, payload.access_token);
  sessionStorage.setItem(STORAGE_KEYS.refresh_token, payload.refresh_token);
  if (payload.expires_at != null) {
    sessionStorage.setItem(STORAGE_KEYS.expires_at, String(payload.expires_at));
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;

  sessionStorage.removeItem(STORAGE_KEYS.access_token);
  sessionStorage.removeItem(STORAGE_KEYS.refresh_token);
  sessionStorage.removeItem(STORAGE_KEYS.expires_at);
}

export function hasSession(): boolean {
  if (typeof window === 'undefined') return false;

  return Boolean(sessionStorage.getItem(STORAGE_KEYS.access_token));
}

function loadStored(): {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
} {
  if (typeof window === 'undefined') {
    return { access_token: null, refresh_token: null, expires_at: null };
  }

  const access_token = sessionStorage.getItem(STORAGE_KEYS.access_token);
  const refresh_token = sessionStorage.getItem(STORAGE_KEYS.refresh_token);
  const expiresRaw = sessionStorage.getItem(STORAGE_KEYS.expires_at);
  const expires_at =
    expiresRaw != null && expiresRaw !== '' ? Number.parseInt(expiresRaw, 10) : null;

  return {
    access_token,
    refresh_token,
    expires_at: Number.isFinite(expires_at) ? expires_at! : null,
  };
}

/**
 * Ensures we have an access token, refreshing shortly before expiry.
 */
export async function getValidAccessToken(apiUrl: string): Promise<string> {
  const { access_token, refresh_token, expires_at } = loadStored();

  if (!access_token) {
    throw new Error('Not authenticated');
  }

  const expiryMs = expires_at != null ? expires_at * 1000 : 0;
  const expiresSoon = expiryMs === 0 || expiryMs < Date.now() + 60_000;

  if (!expiresSoon) {
    return access_token;
  }

  if (!refresh_token) {
    clearSession();
    throw new Error('Session expired');
  }

  const response = await fetch(`${apiUrl}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token }),
  });

  if (!response.ok) {
    clearSession();
    throw new Error('Session expired');
  }

  const payload = (await response.json()) as AuthTokenPayload;
  saveSession(payload);
  return payload.access_token;
}
