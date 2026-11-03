'use client';

import type { ReactNode } from 'react';
import { QueryProvider } from '@/components/providers/query-provider';

/** React Query for authenticated app routes only. */
export function AuthenticatedProviders({ children }: { children: ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>;
}
