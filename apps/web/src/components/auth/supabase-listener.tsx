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

    // Mirror the Supabase session to sessionStorage for apiFetch compatibility
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        sessionStorage.setItem(STORAGE_KEYS.access_token, data.session.access_token);
        if (data.session.refresh_token) {
          sessionStorage.setItem(STORAGE_KEYS.refresh_token, data.session.refresh_token);
        }
      }
    });

    // Keep sessionStorage in sync for apiFetch compatibility
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        sessionStorage.setItem(STORAGE_KEYS.access_token, session.access_token);
        if (session.refresh_token) {
          sessionStorage.setItem(STORAGE_KEYS.refresh_token, session.refresh_token);
        }
      } else {
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
