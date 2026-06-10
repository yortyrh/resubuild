'use client';

import { Button } from '@/components/ui/button';
import { useLogout } from '@/lib/queries/auth-mutations';

export function SignOutButton() {
  const logout = useLogout();

  return (
    <Button variant="outline" onClick={() => logout.mutate()} disabled={logout.isPending}>
      Sign out
    </Button>
  );
}
