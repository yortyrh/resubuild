'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { type ReactNode, useState } from 'react';
import { createQueryClient } from '@/lib/queries/query-client';

const ReactQueryDevtools =
  process.env.NODE_ENV === 'development' && process.env.VITEST !== 'true'
    ? dynamic(
        () =>
          import('@tanstack/react-query-devtools').then((module) => module.ReactQueryDevtools),
        { ssr: false },
      )
    : () => null;

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
