'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

export function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const complete = async () => {
      // Standard PKCE flow: `?code=...` in the query string. We hand
      // Supabase the full URL so its SDK can do the PKCE exchange.
      const code = searchParams.get('code');
      if (code) {
        const supabase = getSupabaseClient();
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
          window.location.href,
        );
        if (cancelled) return;
        if (exchangeError) {
          setError(exchangeError.message);
          return;
        }
        router.push('/dashboard');
        return;
      }

      // Implicit flow: tokens arrive in the URL hash fragment. Supabase's
      // client picks them up automatically (detectSessionInUrl=true); we
      // just need to read the resulting session and route accordingly.
      const supabase = getSupabaseClient();
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (cancelled) return;
      if (sessionError || !data.session) {
        setError('Sign-in failed');
        return;
      }
      router.push('/dashboard');
    };

    void complete();
    return () => {
      cancelled = true;
    };
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
