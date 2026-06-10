'use client';

import { useEffect } from 'react';
import { STORAGE_KEYS } from '@/lib/auth-session';
import { getSupabaseClient } from '@/lib/supabase/client';

/**
 * Hydrates the legacy sessionStorage mirror from the Supabase client session.
 * Runs once on mount for any session established before this component was added.
 */
export function SupabaseListener() {
  useEffect(() => {
    const supabase = getSupabaseClient();

    const mirrorSession = (session: {
      access_token: string;
      refresh_token?: string | null;
      expires_at?: number | null;
    }) => {
      sessionStorage.setItem(STORAGE_KEYS.access_token, session.access_token);
      if (session.refresh_token) {
        sessionStorage.setItem(STORAGE_KEYS.refresh_token, session.refresh_token);
      }
      if (session.expires_at != null) {
        sessionStorage.setItem(STORAGE_KEYS.expires_at, String(session.expires_at));
      }
    };

    // Mirror the Supabase session to sessionStorage for apiFetch compatibility.
    // When cookies are missing (e.g. after a hard refresh), rehydrate the
    // Supabase client from the legacy sessionStorage mirror first.
    void supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        mirrorSession(data.session);
        return;
      }

      const accessToken = sessionStorage.getItem(STORAGE_KEYS.access_token);
      const refreshToken = sessionStorage.getItem(STORAGE_KEYS.refresh_token);
      if (!accessToken || !refreshToken) return;

      const restored = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (restored.data.session) {
        mirrorSession(restored.data.session);
      }
    });

    // Keep sessionStorage in sync for apiFetch compatibility
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        mirrorSession(session);
        return;
      }

      if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem(STORAGE_KEYS.access_token);
        sessionStorage.removeItem(STORAGE_KEYS.refresh_token);
        sessionStorage.removeItem(STORAGE_KEYS.expires_at);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
