'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import { DevMailpitHint } from '@/components/auth/dev-mailpit-hint';
import { Button } from '@/components/ui/button';
import { useVerifyEmailToken } from '@/lib/queries/auth-mutations';

export default function CheckEmailClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const verifyEmail = useVerifyEmailToken();

  useEffect(() => {
    if (!token) return;
    verifyEmail.mutate(token);
  }, [token, verifyEmail.mutate]); // eslint-disable-line react-hooks/exhaustive-deps

  if (verifyEmail.isPending) {
    return <AuthPageShell title="Checking verification…" description="Please wait a moment." />;
  }

  if (verifyEmail.data?.verified) {
    return (
      <AuthPageShell
        title="Email verified!"
        description="Your email has been verified. You can now sign in."
      >
        <Button type="button" className="w-full" onClick={() => (window.location.href = '/login')}>
          Go to sign in
        </Button>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      title="Check your email"
      description="We sent a confirmation link to your email. Click the link to verify your account, then sign in."
    >
      <DevMailpitHint emailKind="confirmation link" />
      <Button type="button" className="w-full" onClick={() => (window.location.href = '/login')}>
        Go to sign in
      </Button>
    </AuthPageShell>
  );
}
