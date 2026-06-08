'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { type AuthTokenPayload, clearSession, saveSession } from '@/lib/auth-session';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      setError('No authorization code received');
      return;
    }

    const exchange = async () => {
      try {
        const response = await fetch(`${apiUrl}/auth/github/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        const body = (await response.json()) as AuthTokenPayload & { message?: string };

        if (!response.ok) {
          setError(body.message ?? 'GitHub sign-in failed');
          clearSession();
          return;
        }

        saveSession(body as AuthTokenPayload);
        router.push('/dashboard');
        router.refresh();
      } catch {
        setError('An unexpected error occurred');
        clearSession();
      }
    };

    exchange();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="text-primary underline"
          >
            Return to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <p>Completing sign in…</p>
    </div>
  );
}

function CallbackFallback() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <p>Completing sign in…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackFallback />}>
      <AuthCallbackInner />
    </Suspense>
  );
}
