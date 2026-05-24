'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { hasSession } from '@/lib/auth-session';

export function HomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (hasSession()) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return null;
}
