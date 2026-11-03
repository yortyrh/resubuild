import { Suspense } from 'react';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import OAuthCallbackClient from './callback-client';

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<AuthPageShell title="Signing you in…" description="Loading…" />}>
      <OAuthCallbackClient />
    </Suspense>
  );
}
