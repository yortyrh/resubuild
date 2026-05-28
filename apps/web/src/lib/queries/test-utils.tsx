import { QueryClientProvider } from '@tanstack/react-query';
import { type RenderHookOptions, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createQueryClient } from '@/lib/queries/query-client';

export function createTestQueryClient() {
  return createQueryClient();
}

export function createQueryWrapper(queryClient = createTestQueryClient()) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

export function renderHookWithQueryClient<Result, Props>(
  hook: (props: Props) => Result,
  options?: Omit<RenderHookOptions<Props>, 'wrapper'> & {
    queryClient?: ReturnType<typeof createTestQueryClient>;
  },
) {
  const queryClient = options?.queryClient ?? createTestQueryClient();
  return renderHook(hook, {
    ...options,
    wrapper: createQueryWrapper(queryClient),
  });
}
