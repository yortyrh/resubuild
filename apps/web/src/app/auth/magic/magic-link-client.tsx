'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import { Button } from '@/components/ui/button';
import { useVerifyMagicLink } from '@/lib/queries/auth-mutations';

/** Target of the emailed magic link (`/auth/magic?token=…`). */
export default function MagicLinkClient() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const verify = useVerifyMagicLink();
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    verify.mutate(token, { onSuccess: () => router.replace('/dashboard') });
  }, [token, verify, router]);

  if (!token || verify.isError) {
    return (
      <AuthPageShell
        title="Link expired"
        description="This sign-in link is invalid or has expired. Request a new one."
        footer={
          <p className="text-muted-foreground text-sm">
            <Link href="/login" className="text-primary underline-offset-4 hover:underline">
              Back to sign in
            </Link>
          </p>
        }
      >
        <Button type="button" className="w-full" onClick={() => router.push('/login')}>
          Go to sign in
        </Button>
      </AuthPageShell>
    );
  }

  return <AuthPageShell title="Signing you in…" description="Please wait a moment." />;
}
