'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useEffect, type ReactNode, useState } from 'react';
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
    return (
      <div className="text-muted-foreground flex min-h-[40vh] items-center justify-center text-sm">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
