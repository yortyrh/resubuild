'use client';

import { useQuery } from '@tanstack/react-query';
import type { AuthMe } from '@/lib/api';
import { fetchAuthMe } from '@/lib/api';
import { authRequest } from '@/lib/auth/client';
import { getAuthFeatures } from '@/lib/auth/features';
import { clearSession, getSessionToken } from '@/lib/auth-session';

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

const NO_SESSION: AuthSession = { exists: false, userId: null, email: null, emailVerified: false };

/**
 * Resolves the stored bearer token against the API (`/api/auth/get-session`).
 * Used by SessionGate to guard routes and by UserMenu to display user info.
 * Manual invalidation only (staleTime: Infinity) — sign-in/out mutations
 * invalidate this query.
 */
export function useAuthSession() {
  return useQuery<AuthSession>({
    queryKey: authKeys.session(),
    queryFn: async (): Promise<AuthSession> => {
      const token = getSessionToken();
      if (!token) return NO_SESSION;

      try {
        const { data } = await authRequest<{
          user?: { id: string; email: string; emailVerified?: boolean };
        } | null>('/get-session', { method: 'GET', token });
        if (!data?.user) {
          clearSession();
          return NO_SESSION;
        }
        return {
          exists: true,
          userId: data.user.id,
          email: data.user.email ?? null,
          emailVerified: Boolean(data.user.emailVerified),
        };
      } catch (error) {
        if ((error as { status?: number }).status === 401) {
          clearSession();
          return NO_SESSION;
        }
        throw error;
      }
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
