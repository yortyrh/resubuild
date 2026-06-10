import { Suspense } from 'react';
import { AuthCrossLink } from '@/components/auth/auth-cross-link';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import { LoginForm } from '@/components/auth/login-form';

function LoginFormFallback() {
  return null;
}

export default function LoginPage() {
  return (
    <AuthPageShell
      title="Sign in"
      description="Access your Resubuild dashboard"
      footer={<AuthCrossLink variant="login" />}
    >
      {/* `LoginForm` reads `?error=` from the URL to surface auth callback
          failures. `useSearchParams` requires a Suspense boundary in the
          App Router so the page can statically prerender. */}
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>
    </AuthPageShell>
  );
}
