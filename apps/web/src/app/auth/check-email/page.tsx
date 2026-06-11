import { Suspense } from 'react';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import CheckEmailClient from './check-email-client';

function CheckEmailFallback() {
  return <AuthPageShell title="Check your email" description="Loading…" />;
}

export default function CheckEmailPage() {
  // `CheckEmailClient` reads `?token=` from the URL via `useSearchParams`.
  // `useSearchParams` requires a Suspense boundary in the App Router so
  // the page can statically prerender — see apps/web/src/app/login/page.tsx
  // for the same pattern.
  return (
    <Suspense fallback={<CheckEmailFallback />}>
      <CheckEmailClient />
    </Suspense>
  );
}
