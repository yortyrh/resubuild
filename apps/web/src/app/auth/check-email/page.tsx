'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useVerifyEmailToken } from '@/lib/queries/auth-mutations';

export default function CheckEmailPage() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') ?? '';

  const verifyEmail = useVerifyEmailToken();

  useEffect(() => {
    if (!token) return;
    verifyEmail.mutate(token);
  }, [token, verifyEmail.mutate]); // eslint-disable-line react-hooks/exhaustive-deps

  if (verifyEmail.isPending) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Checking verification…</h1>
      </div>
    );
  }

  if (verifyEmail.data?.verified) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Email verified!</h1>
        <p className="text-muted-foreground text-sm">
          Your email has been verified. You can now sign in.
        </p>
        <Button variant="outline" onClick={() => (window.location.href = '/login')}>
          Go to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center">
      <h1 className="text-2xl font-semibold">Check your email</h1>
      <p className="text-muted-foreground text-sm">
        We sent a confirmation link to your email. Click the link to verify your account, then sign
        in.
      </p>
      <Button variant="outline" onClick={() => (window.location.href = '/login')}>
        Go to sign in
      </Button>
    </div>
  );
}
