'use client';

import { useState } from 'react';
import { SiGoogle } from 'react-icons/si';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { GOOGLE_OAUTH_ERROR_MESSAGE, signInWithGoogle } from '@/lib/auth/oauth';

/**
 * Renders the "Continue with Google" OAuth button.
 *
 * The button is disabled while the OAuth call is in flight. On failure
 * it surfaces a non-blocking Sonner toast (per the `auth-google-oauth`
 * spec) and the user is NOT navigated away from the current page.
 *
 * The visual divider ("or") that separates this row from the
 * email/password form below is owned by the parent `LoginForm` /
 * `RegisterForm`, not by this component, so that a single divider
 * appears regardless of whether one or two OAuth providers are shown.
 */
export function ContinueWithGoogleButton() {
  const [isPending, setIsPending] = useState(false);

  const handleClick = async () => {
    if (isPending) return;
    setIsPending(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      setIsPending(false);
      const message =
        error instanceof Error && error.message ? error.message : GOOGLE_OAUTH_ERROR_MESSAGE;
      toast.error(message);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={handleClick}
      disabled={isPending}
      aria-label="Continue with Google"
      data-testid="continue-with-google"
    >
      <SiGoogle className="size-4" aria-hidden="true" />
      {isPending ? 'Redirecting to Google…' : 'Continue with Google'}
    </Button>
  );
}
