'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useResetPassword } from '@/lib/queries/auth-mutations';
import { getSupabaseClient } from '@/lib/supabase/client';

function ResetPasswordForm({ sessionReady }: { sessionReady: boolean }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const resetPassword = useResetPassword();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return;
    }

    resetPassword.mutate(password);
  };

  if (!sessionReady) {
    return (
      <AuthPageShell
        title="Invalid reset link"
        description="This password reset link is invalid or has expired. Please request a new one."
        footer={
          <p className="text-muted-foreground text-sm">
            <Link
              href="/forgot-password"
              className="text-primary underline-offset-4 hover:underline"
            >
              Request a new reset link
            </Link>
          </p>
        }
      >
        <Button
          type="button"
          className="w-full"
          onClick={() => (window.location.href = '/forgot-password')}
        >
          Request new link
        </Button>
      </AuthPageShell>
    );
  }

  const error = localError ?? resetPassword.error?.message ?? null;

  return (
    <AuthPageShell
      title="Set new password"
      description="Enter your new password below."
      footer={
        <p className="text-muted-foreground text-sm">
          Remember your password?{' '}
          <Link href="/login" className="text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <Button type="submit" className="w-full" disabled={resetPassword.isPending}>
          {resetPassword.isPending ? 'Resetting…' : 'Reset password'}
        </Button>
      </form>
    </AuthPageShell>
  );
}

function ResetPasswordLoader() {
  const [sessionReady, setSessionReady] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const resolveRecoverySession = async () => {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      if (!cancelled && data.session) {
        setSessionReady(true);
        setChecking(false);
        return;
      }

      const hash = window.location.hash;
      if (hash) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken && refreshToken) {
          const { data: setData, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!cancelled && !error && setData.session) {
            window.history.replaceState(null, '', window.location.pathname);
            setSessionReady(true);
            setChecking(false);
            return;
          }
        }
      }

      if (!cancelled) {
        setSessionReady(false);
        setChecking(false);
      }
    };

    void resolveRecoverySession();
    return () => {
      cancelled = true;
    };
  }, []);

  if (checking) {
    return <AuthPageShell title="Set new password" description="Loading your reset session…" />;
  }

  return <ResetPasswordForm sessionReady={sessionReady} />;
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthPageShell title="Set new password" description="Loading…" />}>
      <ResetPasswordLoader />
    </Suspense>
  );
}
