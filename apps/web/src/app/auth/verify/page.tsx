import { Suspense } from 'react';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import CheckEmailClient from '../check-email/check-email-client';

/** Target of the emailed verification link (`/auth/verify?token=…`). */
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<AuthPageShell title="Checking verification…" description="Loading…" />}>
      <CheckEmailClient />
    </Suspense>
  );
}
