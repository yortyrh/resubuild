'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';
import { DashboardShellSkeleton } from '@/components/dashboard/dashboard-shell-skeleton';
import { useAuthSession } from '@/lib/queries/auth-queries';

export function SessionGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  // Read auth state from the Supabase client (cookie-backed) — NOT from the
  // sessionStorage mirror in `hasSession()`. After an OAuth callback the
  // server sets the `sb-*` auth cookies in the same response that
  // navigates to /dashboard, so the Supabase client knows the user is
  // authenticated synchronously. The sessionStorage mirror is hydrated
  // asynchronously by SupabaseListener, so reading it on first paint
  // caused a false "not signed in" → /login → /dashboard bounce.
  const { data: session, isPending } = useAuthSession();

  useEffect(() => {
    if (isPending) return;
    if (!session?.exists) {
      router.replace('/login');
      return;
    }
  }, [isPending, session?.exists, router]);

  // Stay on the skeleton while the Supabase client resolves the session —
  // avoids flashing a signed-in or signed-out UI before the cookies are
  // read. The skeleton matches the dashboard chrome so the transition
  // back to /login is invisible to the user.
  if (isPending || !session?.exists) {
    return <DashboardShellSkeleton />;
  }

  return <>{children}</>;
}
