'use client';

import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';

const PREFIX = 'resubuild.';
export const STORAGE_KEYS = {
  access_token: `${PREFIX}access_token`,
  refresh_token: `${PREFIX}refresh_token`,
  expires_at: `${PREFIX}expires_at`,
} as const;

/** Shape mirrored from a Supabase session for apiFetch compatibility */
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

export function persistSupabaseSession(session: Session): void {
  saveSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token ?? '',
    expires_in: session.expires_in ?? 3600,
    expires_at: session.expires_at ?? undefined,
    token_type: 'bearer',
    user: { id: session.user.id, email: session.user.email ?? undefined },
  });
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

function sessionExpiresSoon(session: Session): boolean {
  const expiresAt = session.expires_at;
  if (expiresAt == null) return true;
  return expiresAt * 1000 < Date.now() + 60_000;
}

async function hydrateSessionFromStorage(supabase: SupabaseClient): Promise<Session | null> {
  if (typeof window === 'undefined') return null;

  const accessToken = sessionStorage.getItem(STORAGE_KEYS.access_token);
  const refreshToken = sessionStorage.getItem(STORAGE_KEYS.refresh_token);
  if (!accessToken || !refreshToken) return null;

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error || !data.session?.access_token) return null;
  return data.session;
}

/**
 * Returns a valid access token from the Supabase client session, refreshing
 * through the publishable-key session when needed. Mirrors tokens to
 * sessionStorage for apiFetch compatibility.
 */
export async function getValidAccessToken(_apiUrl?: string): Promise<string> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();

  let session = data.session;
  if (!session?.access_token) {
    session = await hydrateSessionFromStorage(supabase);
  }

  if (error && !session?.access_token) {
    clearSession();
    throw new Error('Not authenticated');
  }

  if (!session?.access_token) {
    clearSession();
    throw new Error('Not authenticated');
  }

  if (sessionExpiresSoon(session)) {
    if (!session.refresh_token) {
      clearSession();
      throw new Error('Session expired');
    }

    const refreshed = await supabase.auth.refreshSession();
    if (refreshed.error || !refreshed.data.session?.access_token) {
      clearSession();
      throw new Error('Session expired');
    }
    session = refreshed.data.session;
  }

  persistSupabaseSession(session);
  return session.access_token;
}
