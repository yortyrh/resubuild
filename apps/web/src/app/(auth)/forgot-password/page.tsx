'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import { DevMailpitHint } from '@/components/auth/dev-mailpit-hint';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForgotPassword } from '@/lib/queries/auth-mutations';

function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const forgotPassword = useForgotPassword();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    forgotPassword.mutate(email, {
      onSuccess: () => setSent(true),
    });
  };

  if (sent) {
    return (
      <AuthPageShell
        title="Check your email"
        description={
          <>
            If an account exists for <strong>{email}</strong>, we sent a password reset link.
          </>
        }
      >
        <DevMailpitHint emailKind="password reset link" />
        <Button type="button" className="w-full" onClick={() => router.push('/login')}>
          Return to sign in
        </Button>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      title="Reset your password"
      description="Enter your email address and we'll send you a reset link."
      footer={
        <p className="text-muted-foreground text-sm">
          Remember your password?{' '}
          <Link href="/login" className="text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      {forgotPassword.error?.message ? (
        <p className="text-destructive text-sm">{forgotPassword.error.message}</p>
      ) : null}

      <DevMailpitHint emailKind="password reset link" />

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <Button type="submit" className="w-full" disabled={forgotPassword.isPending}>
          {forgotPassword.isPending ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
    </AuthPageShell>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground p-6 text-sm">Loading…</div>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
