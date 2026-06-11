'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import {
  SignedInAuthFallback,
  useAuthenticatedEntryRedirect,
} from '@/components/auth/authenticated-entry';
import { ContinueWithGitHubButton } from '@/components/auth/continue-with-github-button';
import { ContinueWithGoogleButton } from '@/components/auth/continue-with-google-button';
import { ContinueWithLinkedInButton } from '@/components/auth/continue-with-linkedin-button';
import { DevMailpitHint } from '@/components/auth/dev-mailpit-hint';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { oauthCallbackErrorMessage } from '@/lib/auth/oauth-callback-error';
import {
  useLogin,
  useRequestOtp,
  useSendMagicLink,
  useVerifyOtp,
} from '@/lib/queries/auth-mutations';
import { useAuthFeatures } from '@/lib/queries/auth-queries';

export function LoginForm() {
  const { showSignedInUi } = useAuthenticatedEntryRedirect();
  const { data: features } = useAuthFeatures();
  const searchParams = useSearchParams();

  const login = useLogin();
  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();
  const sendMagicLink = useSendMagicLink();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  if (showSignedInUi) {
    return <SignedInAuthFallback />;
  }

  const passwordless = features?.passwordless ?? false;
  const forgotPassword = features?.forgot_password ?? false;
  const githubOauth = features?.github_oauth ?? false;
  const googleOauth = features?.google_oauth ?? false;
  const linkedinOauth = features?.linkedin_oauth ?? false;

  const callbackError = (() => {
    const errorCode = searchParams.get('error_code');
    const errorDescription = searchParams.get('error_description');
    const error = searchParams.get('error');
    if (!errorCode && !errorDescription && !error) return null;
    return oauthCallbackErrorMessage(errorCode, errorDescription);
  })();

  const formError =
    callbackError ??
    login.error?.message ??
    requestOtp.error?.message ??
    verifyOtp.error?.message ??
    sendMagicLink.error?.message ??
    null;

  const handlePasswordSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    login.mutate({ email, password });
  };

  const handleRequestOtp = (event: React.FormEvent) => {
    event.preventDefault();
    requestOtp.mutate(email, {
      onSuccess: () => setOtpSent(true),
    });
  };

  const handleVerifyOtp = (event: React.FormEvent) => {
    event.preventDefault();
    verifyOtp.mutate({ email, token: otpCode });
  };

  const handleSendMagicLink = (event: React.FormEvent) => {
    event.preventDefault();
    sendMagicLink.mutate(email, {
      onSuccess: () => setMagicLinkSent(true),
    });
  };

  const passwordForm = (
    <form onSubmit={handlePasswordSubmit} className="space-y-4">
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
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          {forgotPassword ? (
            <Link href="/forgot-password" className="text-primary text-sm hover:underline">
              Forgot your password?
            </Link>
          ) : null}
        </div>
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
      <Button type="submit" className="w-full" disabled={login.isPending}>
        {login.isPending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );

  const otpForm = (
    <div className="space-y-4">
      <DevMailpitHint emailKind="sign-in code" />
      {!otpSent ? (
        <form onSubmit={handleRequestOtp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp-email">Email</Label>
            <Input
              id="otp-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={requestOtp.isPending}>
            {requestOtp.isPending ? 'Sending…' : 'Send code'}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Enter the 6-digit code sent to <strong>{email}</strong>.
          </p>
          <div className="space-y-2">
            <Label htmlFor="otp-code">Code</Label>
            <Input
              id="otp-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              minLength={6}
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={verifyOtp.isPending}>
            {verifyOtp.isPending ? 'Verifying…' : 'Verify code'}
          </Button>
        </form>
      )}
    </div>
  );

  const magicLinkForm = (
    <div className="space-y-4">
      <DevMailpitHint emailKind="sign-in link" />
      {magicLinkSent ? (
        <p className="text-muted-foreground text-sm">
          Check your inbox for a sign-in link sent to <strong>{email}</strong>.
        </p>
      ) : (
        <form onSubmit={handleSendMagicLink} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="link-email">Email</Label>
            <Input
              id="link-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={sendMagicLink.isPending}>
            {sendMagicLink.isPending ? 'Sending…' : 'Send sign-in link'}
          </Button>
        </form>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {formError ? <p className="text-destructive text-sm">{formError}</p> : null}

      {githubOauth || googleOauth || linkedinOauth ? (
        <div className="space-y-4">
          {githubOauth ? <ContinueWithGitHubButton /> : null}
          {googleOauth ? <ContinueWithGoogleButton /> : null}
          {linkedinOauth ? <ContinueWithLinkedInButton /> : null}
          <div className="relative">
            <Separator />
            <span className="bg-card text-muted-foreground absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-2 text-xs uppercase">
              or
            </span>
          </div>
        </div>
      ) : null}

      {passwordless ? (
        <Tabs defaultValue="password">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="password">Password</TabsTrigger>
            <TabsTrigger value="otp">Email code</TabsTrigger>
            <TabsTrigger value="link">Email link</TabsTrigger>
          </TabsList>
          <TabsContent value="password" className="mt-4">
            {passwordForm}
          </TabsContent>
          <TabsContent value="otp" className="mt-4">
            {otpForm}
          </TabsContent>
          <TabsContent value="link" className="mt-4">
            {magicLinkForm}
          </TabsContent>
        </Tabs>
      ) : (
        passwordForm
      )}
    </div>
  );
}
