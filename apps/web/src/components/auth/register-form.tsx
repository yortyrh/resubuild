'use client';

import { useState } from 'react';
import {
  SignedInAuthFallback,
  useAuthenticatedEntryRedirect,
} from '@/components/auth/authenticated-entry';
import { DevMailpitHint } from '@/components/auth/dev-mailpit-hint';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRegister } from '@/lib/queries/auth-mutations';

export function RegisterForm() {
  const { showSignedInUi } = useAuthenticatedEntryRedirect();
  const register = useRegister();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (showSignedInUi) {
    return <SignedInAuthFallback />;
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    register.mutate({ email, password });
  };

  const verificationMessage =
    register.isSuccess && register.data?.kind === 'verification' ? register.data.message : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DevMailpitHint emailKind="confirmation link" />
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
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {register.error?.message ? (
        <p className="text-destructive text-sm">{register.error.message}</p>
      ) : null}
      {verificationMessage ? (
        <p className="text-muted-foreground text-sm">{verificationMessage}</p>
      ) : null}
      <Button type="submit" className="w-full" disabled={register.isPending}>
        {register.isPending ? 'Creating account…' : 'Register'}
      </Button>
    </form>
  );
}
