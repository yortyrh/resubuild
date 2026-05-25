'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { clearSession } from '@/lib/auth-session';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    void fetch(`${apiUrl}/auth/logout`, { method: 'POST' }).catch(() => {});
    clearSession();
    router.push('/login');
    router.refresh();
  };

  return (
    <Button variant="outline" onClick={handleSignOut}>
      Sign out
    </Button>
  );
}
