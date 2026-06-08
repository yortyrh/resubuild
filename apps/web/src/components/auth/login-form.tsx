'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type AuthTokenPayload, clearSession, hasSession, saveSession } from '@/lib/auth-session';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);

  useEffect(() => {
    if (hasSession()) {
      router.replace('/dashboard');
    }
  }, [router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/auth/login`, {
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
            : 'Invalid credentials';
        setError(msg);
        clearSession();
        return;
      }

      saveSession(body as AuthTokenPayload);
      router.push('/dashboard');
      router.refresh();
    } catch {
      setLoading(false);
      setError('Sign in failed. Try again.');
      clearSession();
    }
  };

  const handleGithubSignIn = async () => {
    setGithubLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/auth/github`);
      if (!response.ok) {
        throw new Error('Failed to initiate GitHub sign-in');
      }
      const { url } = (await response.json()) as { url: string };
      window.location.href = url;
    } catch {
      setGithubLoading(false);
      setError('GitHub sign-in failed. Try again.');
    }
  };

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGithubSignIn}
        disabled={githubLoading}
      >
        {githubLoading ? 'Redirecting…' : 'Continue with GitHub'}
      </Button>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background text-muted-foreground px-2">Or continue with</span>
        </div>
      </div>
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
            autoComplete="current-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </div>
  );
}
