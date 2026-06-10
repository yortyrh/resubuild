'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { hasSession } from '@/lib/auth-session';
import { useAuthFeatures, useAuthSession } from '@/lib/queries/auth-queries';

function authenticatedDestination(
  session: { email: string | null; emailVerified: boolean },
  emailVerificationEnabled: boolean,
): '/dashboard' | '/auth/check-email' {
  const needsVerification =
    emailVerificationEnabled && session.email != null && !session.emailVerified;
  return needsVerification ? '/auth/check-email' : '/dashboard';
}

/**
 * Redirects signed-in users away from login/register entry pages.
 * Shows a dashboard link as a fallback when the client redirect does not run.
 */
export function useAuthenticatedEntryRedirect() {
  const router = useRouter();
  const { data: session, isPending } = useAuthSession();
  const { data: features } = useAuthFeatures();

  const signedIn = Boolean(session?.exists);
  const pendingSignedIn = isPending && hasSession();

  useEffect(() => {
    if (!session?.exists) return;

    router.replace(authenticatedDestination(session, features?.email_verification ?? false));
  }, [session, features?.email_verification, router]);

  return {
    signedIn,
    showSignedInUi: signedIn || pendingSignedIn,
  };
}

export function SignedInAuthFallback() {
  return (
    <div className="space-y-4 text-center">
      <p className="text-muted-foreground text-sm">You&apos;re already signed in.</p>
      <Button asChild className="w-full">
        <Link href="/dashboard">Go to dashboard</Link>
      </Button>
    </div>
  );
}
