'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAuthFeatures, fetchAuthMe } from '@/lib/api';
import { getSupabaseClient } from '@/lib/supabase/client';

export const authKeys = {
  all: ['auth'] as const,
  features: () => [...authKeys.all, 'features'] as const,
  session: () => [...authKeys.all, 'session'] as const,
  me: () => [...authKeys.all, 'me'] as const,
  emailVerification: (token: string) => [...authKeys.all, 'emailVerification', token] as const,
};

/** Fetch auth capabilities from the API — no Bearer token needed. */
export function useAuthFeatures(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: authKeys.features(),
    queryFn: fetchAuthFeatures,
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 min — features rarely change
  });
}

export interface AuthSession {
  exists: boolean;
  userId: string | null;
  email: string | null;
  emailVerified: boolean;
}

/**
 * Reads the current session from the Supabase client.
 * Used by SessionGate to guard routes and by UserMenu to display user info.
 * Manual invalidation only (staleTime: Infinity) — session is updated by the
 * SupabaseListener component via onAuthStateChange.
 */
export function useAuthSession() {
  return useQuery<AuthSession>({
    queryKey: authKeys.session(),
    queryFn: async (): Promise<AuthSession> => {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        return { exists: false, userId: null, email: null, emailVerified: false };
      }

      const user = data.session.user as unknown as Record<string, unknown>;
      return {
        exists: true,
        userId: data.session.user.id,
        email: data.session.user.email ?? null,
        emailVerified: Boolean(user?.email_verified),
      };
    },
    staleTime: Infinity,
  });
}

export interface AuthMe {
  user: { id: string; email?: string };
  has_password: boolean;
}

/**
 * Fetch the authenticated user envelope from the API. Returns `has_password`
 * so callers (e.g. the Security settings form) can decide whether to ask
 * for the current password when changing it.
 */
export function useAuthMe(options?: { enabled?: boolean }) {
  return useQuery<AuthMe>({
    queryKey: authKeys.me(),
    queryFn: fetchAuthMe,
    enabled: options?.enabled ?? true,
    staleTime: 60 * 1000,
  });
}
