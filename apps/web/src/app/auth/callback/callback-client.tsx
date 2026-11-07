'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import { API_URL } from '@/lib/auth/client';
import { saveSessionToken } from '@/lib/auth-session';
import { authKeys } from '@/lib/queries/auth-queries';

/** Only same-origin relative paths; anything else falls back to /dashboard. */
export function safeNext(next: string | null): string {
  if (!next?.startsWith('/') || next.startsWith('//') || next.includes('\\')) {
    return '/dashboard';
  }
  return next;
}

/**
 * Final step of OAuth sign-in: the API redirected here with a one-time
 * `code`; exchange it for the bearer token and continue to `redirect`.
 */
export default function OAuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const code = searchParams.get('code');
    const next = safeNext(searchParams.get('redirect'));
    const fail = (description: string) => {
      const params = new URLSearchParams({ error: 'oauth', error_description: description });
      router.replace(`/login?${params.toString()}`);
    };

    if (!code) {
      fail('The sign-in callback was missing its code.');
      return;
    }

    void (async () => {
      try {
        const response = await fetch(`${API_URL}/auth/oauth/exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        const body = (await response.json().catch(() => ({}))) as {
          token?: string;
          message?: string;
        };
        if (!response.ok || !body.token) {
          fail(body.message ?? 'Sign-in could not be completed. Please try again.');
          return;
        }
        saveSessionToken(body.token);
        await queryClient.invalidateQueries({ queryKey: authKeys.session() });
        router.replace(next);
      } catch {
        fail('Sign-in could not be completed. Please try again.');
      }
    })();
  }, [router, searchParams, queryClient]);

  return <AuthPageShell title="Signing you in…" description="Please wait a moment." />;
}
