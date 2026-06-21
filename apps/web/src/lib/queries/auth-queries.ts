'use client';

import { useQuery } from '@tanstack/react-query';
import type { AuthMe } from '@/lib/api';
import { fetchAuthMe } from '@/lib/api';
import { getAuthFeatures } from '@/lib/auth/features';
import { getSupabaseClient } from '@/lib/supabase/client';

export type { AuthMe } from '@/lib/api';

export type { AuthFeatures } from '@/lib/auth/features';

export const authKeys = {
  all: ['auth'] as const,
  features: () => [...authKeys.all, 'features'] as const,
  session: () => [...authKeys.all, 'session'] as const,
  me: () => [...authKeys.all, 'me'] as const,
  emailVerification: (token: string) => [...authKeys.all, 'emailVerification', token] as const,
};

/**
 * Read auth capabilities from the client-bundled `NEXT_PUBLIC_*` env vars.
 *
 * No network round-trip and no loading state: the values are inlined at
 * build time, so the hooks that consume this can render the matching
 * controls synchronously and avoid the layout shift the previous
 * `/auth/features` fetch caused on every navigation. The hook still goes
 * through TanStack Query so consumers can keep their existing
 * `useQuery` patterns (and the test suite can mock the resolver).
 */
export function useAuthFeatures(_options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: authKeys.features(),
    queryFn: getAuthFeatures,
    initialData: getAuthFeatures(),
    staleTime: Infinity, // build-time constants — never need to refetch
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
        emailVerified: Boolean(user.email_confirmed_at ?? user.email_verified),
      };
    },
    staleTime: Infinity,
  });
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
