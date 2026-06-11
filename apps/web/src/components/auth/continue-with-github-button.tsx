'use client';

import { useState } from 'react';
import { SiGithub } from 'react-icons/si';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { GITHUB_OAUTH_ERROR_MESSAGE, signInWithGitHub } from '@/lib/auth/oauth';

/**
 * Renders the "Continue with GitHub" OAuth button + visual divider that
 * separates the social-login row from the email/password form below.
 *
 * The button is disabled while the OAuth call is in flight. On failure
 * it surfaces a non-blocking Sonner toast (per the `auth-github-oauth`
 * spec) and the user is NOT navigated away from the current page.
 */
export function ContinueWithGitHubButton() {
  const [isPending, setIsPending] = useState(false);

  const handleClick = async () => {
    if (isPending) return;
    setIsPending(true);
    try {
      await signInWithGitHub();
    } catch (error) {
      setIsPending(false);
      const message =
        error instanceof Error && error.message ? error.message : GITHUB_OAUTH_ERROR_MESSAGE;
      toast.error(message);
    }
  };

  return (
    <div className="space-y-4" data-testid="continue-with-github">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleClick}
        disabled={isPending}
        aria-label="Continue with GitHub"
      >
        <SiGithub className="size-4" aria-hidden="true" />
        {isPending ? 'Redirecting to GitHub…' : 'Continue with GitHub'}
      </Button>
      <div className="relative">
        <Separator />
        <span className="bg-card text-muted-foreground absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-2 text-xs uppercase">
          or
        </span>
      </div>
    </div>
  );
}
