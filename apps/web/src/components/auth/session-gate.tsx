'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';
import { DashboardShellSkeleton } from '@/components/dashboard/dashboard-shell-skeleton';
import { useAuthSession } from '@/lib/queries/auth-queries';

export function SessionGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  // Resolve the stored bearer token against the API before rendering the
  // dashboard; an unknown or revoked token sends the user to /login.
  const { data: session, isPending } = useAuthSession();

  useEffect(() => {
    if (isPending) return;
    if (!session?.exists) {
      router.replace('/login');
      return;
    }
  }, [isPending, session?.exists, router]);

  // Stay on the skeleton while the session resolves — avoids flashing a
  // signed-in or signed-out UI. The skeleton matches the dashboard chrome so the transition
  // back to /login is invisible to the user.
  if (isPending || !session?.exists) {
    return <DashboardShellSkeleton />;
  }

  return <>{children}</>;
}
