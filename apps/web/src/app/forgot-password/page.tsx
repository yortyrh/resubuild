'use client';

import { useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';
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
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Check your email</h1>
        <p className="text-muted-foreground text-sm">
          If an account exists for <strong>{email}</strong>, we sent a password reset link.
        </p>
        <Button variant="outline" onClick={() => router.push('/login')}>
          Return to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Reset your password</h1>
        <p className="text-muted-foreground text-sm">
          Enter your email address and we&apos;ll send you a reset link.
        </p>
      </div>

      {forgotPassword.error?.message ? (
        <p className="text-destructive text-sm">{forgotPassword.error.message}</p>
      ) : null}

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

      <p className="text-muted-foreground text-center text-sm">
        Remember your password?{' '}
        <a href="/login" className="text-primary hover:underline">
          Sign in
        </a>
      </p>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground text-sm">Loading…</div>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
