'use client';

import type { ReactNode } from 'react';
import { SupabaseListener } from '@/components/auth/supabase-listener';
import { QueryProvider } from '@/components/providers/query-provider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <SupabaseListener />
      {children}
    </QueryProvider>
  );
}
