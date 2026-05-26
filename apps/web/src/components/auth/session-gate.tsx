'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, startTransition, useEffect, useState } from 'react';
import { DashboardShellSkeleton } from '@/components/dashboard/dashboard-shell-skeleton';
import { hasSession } from '@/lib/auth-session';

export function SessionGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [allow, setAllow] = useState(false);

  useEffect(() => {
    if (!hasSession()) {
      router.replace('/login');
      return;
    }

    startTransition(() => {
      setAllow(true);
    });
  }, [router]);

  if (!allow) {
    return <DashboardShellSkeleton />;
  }

  return <>{children}</>;
}
