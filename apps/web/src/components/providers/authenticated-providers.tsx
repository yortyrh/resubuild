'use client';

import type { ReactNode } from 'react';
import { SupabaseListener } from '@/components/auth/supabase-listener';
import { QueryProvider } from '@/components/providers/query-provider';

/** React Query + Supabase session sync for authenticated app routes only. */
export function AuthenticatedProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <SupabaseListener />
      {children}
    </QueryProvider>
  );
}
