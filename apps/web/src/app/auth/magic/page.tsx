import { Suspense } from 'react';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import MagicLinkClient from './magic-link-client';

export default function MagicLinkPage() {
  return (
    <Suspense fallback={<AuthPageShell title="Signing you in…" description="Loading…" />}>
      <MagicLinkClient />
    </Suspense>
  );
}
