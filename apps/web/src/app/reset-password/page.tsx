'use client';

import { useRouter } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useResetPassword } from '@/lib/queries/auth-mutations';

function ResetPasswordForm({ tokenFound }: { tokenFound: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const resetPassword = useResetPassword();

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (password !== confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }

      if (password.length < 8) {
        toast.error('Password must be at least 8 characters');
        return;
      }

      const accessToken = sessionStorage.getItem('reset_access_token');
      const refreshToken = sessionStorage.getItem('reset_refresh_token');

      if (!accessToken || !refreshToken) {
        toast.error('Reset session expired. Please request a new reset link.');
        return;
      }

      resetPassword.mutate(
        { accessToken, refreshToken, password },
        {
          onSuccess: () => {
            sessionStorage.removeItem('reset_access_token');
            sessionStorage.removeItem('reset_refresh_token');
            toast.success('Password reset successful. Please sign in.');
            router.push('/login');
          },
        },
      );
    },
    [password, confirmPassword, router, resetPassword],
  );

  if (!tokenFound) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Invalid reset link</h1>
        <p className="text-muted-foreground text-sm">
          This password reset link is invalid or has expired. Please request a new one.
        </p>
        <Button variant="outline" onClick={() => router.push('/forgot-password')}>
          Request new link
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Set new password</h1>
        <p className="text-muted-foreground text-sm">Enter your new password below.</p>
      </div>

      {resetPassword.error?.message ? (
        <p className="text-destructive text-sm">{resetPassword.error.message}</p>
      ) : null}

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
    </div>
  );
}

function ResetPasswordLoader() {
  const [tokenFound, setTokenFound] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      if (accessToken && refreshToken) {
        sessionStorage.setItem('reset_access_token', accessToken);
        sessionStorage.setItem('reset_refresh_token', refreshToken);
        setTokenFound(true);
        window.history.replaceState(null, '', window.location.pathname);
        return;
      }
    }

    const stored = sessionStorage.getItem('reset_access_token');
    if (stored) {
      setTokenFound(true);
    }
  }, []);

  return <ResetPasswordForm tokenFound={tokenFound} />;
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground text-sm">Loading…</div>}>
      <ResetPasswordLoader />
    </Suspense>
  );
}
