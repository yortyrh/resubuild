'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useResetPassword } from '@/lib/queries/auth-mutations';

function ResetPasswordForm({ token }: { token: string }) {
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

    resetPassword.mutate({ token, password });
  };

  if (!token) {
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

/** Reads the `?token=` from the emailed reset link (`/reset-password?token=…`). */
function ResetPasswordLoader() {
  const token = useSearchParams().get('token') ?? '';
  return <ResetPasswordForm token={token} />;
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthPageShell title="Set new password" description="Loading…" />}>
      <ResetPasswordLoader />
    </Suspense>
  );
}
