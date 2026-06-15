'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { hasSession } from '@/lib/auth-session';

// Mounted as a sibling on the marketing landing page so signed-in visitors
// are sent straight to /dashboard. Anonymous visitors stay on the landing
// page; this component renders nothing for them and has no effect on the
// visible marketing surface.
export function HomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (hasSession()) {
      router.replace('/dashboard');
    }
  }, [router]);

  return null;
}
