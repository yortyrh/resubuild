'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type AuthTokenPayload, clearSession, hasSession, saveSession } from '@/lib/auth-session';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hasSession()) {
      router.replace('/dashboard');
    }
  }, [router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        message?: string | string[];
        access_token?: string;
      };

      setLoading(false);

      if (!response.ok) {
        const msg = Array.isArray(body.message)
          ? body.message.join(', ')
          : typeof body.message === 'string'
            ? body.message
            : 'Registration failed';
        setError(msg);
        clearSession();
        return;
      }

      if ('access_token' in body && 'refresh_token' in body && body.access_token) {
        saveSession(body as AuthTokenPayload);
        router.push('/dashboard');
        router.refresh();
        return;
      }

      setMessage(
        typeof body.message === 'string'
          ? body.message
          : 'Check your email to confirm your account.',
      );
    } catch {
      setLoading(false);
      setError('Registration failed. Try again.');
      clearSession();
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>Start managing your Resumind CVs</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          {message ? <p className="text-muted-foreground text-sm">{message}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account…' : 'Register'}
          </Button>
        </form>
        <p className="text-muted-foreground mt-4 text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
