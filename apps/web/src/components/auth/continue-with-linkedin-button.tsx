'use client';

import { useState } from 'react';
import { FaLinkedin } from 'react-icons/fa6';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { LINKEDIN_OAUTH_ERROR_MESSAGE, signInWithLinkedIn } from '@/lib/auth/oauth';

export function ContinueWithLinkedInButton() {
  const [isPending, setIsPending] = useState(false);

  const handleClick = async () => {
    if (isPending) return;
    setIsPending(true);
    try {
      await signInWithLinkedIn();
    } catch (error) {
      setIsPending(false);
      const message =
        error instanceof Error && error.message ? error.message : LINKEDIN_OAUTH_ERROR_MESSAGE;
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
      aria-label="Continue with LinkedIn"
      data-testid="continue-with-linkedin"
    >
      <FaLinkedin className="size-4" aria-hidden="true" />
      {isPending ? 'Redirecting to LinkedIn…' : 'Continue with LinkedIn'}
    </Button>
  );
}
