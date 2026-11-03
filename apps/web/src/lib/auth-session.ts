'use client';

/**
 * Client-side session: the Better Auth session token, kept in localStorage so
 * it survives reloads and new tabs (sessions are validated and revoked
 * server-side; the token is only a bearer credential).
 */

const PREFIX = 'resubuild.';
export const STORAGE_KEYS = {
  access_token: `${PREFIX}access_token`,
} as const;

/** Keys written by the previous (Supabase) session mirror; removed on sign-out. */
const LEGACY_KEYS = [`${PREFIX}refresh_token`, `${PREFIX}expires_at`];

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export function saveSessionToken(token: string): void {
  storage()?.setItem(STORAGE_KEYS.access_token, token);
}

export function getSessionToken(): string | null {
  return storage()?.getItem(STORAGE_KEYS.access_token) ?? null;
}

export function clearSession(): void {
  const store = storage();
  if (!store) return;
  store.removeItem(STORAGE_KEYS.access_token);
  for (const key of LEGACY_KEYS) store.removeItem(key);
  // Tokens from the previous release lived in sessionStorage.
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(STORAGE_KEYS.access_token);
    for (const key of LEGACY_KEYS) window.sessionStorage.removeItem(key);
  }
}

export function hasSession(): boolean {
  return Boolean(getSessionToken());
}

/**
 * Returns the stored bearer token or throws `Not authenticated`. Sessions are
 * extended server-side on use, so there is no client refresh step.
 */
export async function getValidAccessToken(_apiUrl?: string): Promise<string> {
  const token = getSessionToken();
  if (!token) {
    throw new Error('Not authenticated');
  }
  return token;
}
