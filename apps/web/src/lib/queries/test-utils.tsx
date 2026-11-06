import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type RenderHookOptions, render, renderHook } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { createQueryClient } from '@/lib/queries/query-client';

export function createTestQueryClient() {
  return createQueryClient();
}

/** App defaults, but failed queries settle at once instead of retrying. */
export function createNoRetryTestQueryClient() {
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({
    ...queryClient.getDefaultOptions(),
    queries: { ...queryClient.getDefaultOptions().queries, retry: false },
  });
  return queryClient;
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

export function renderWithQueryClient(ui: ReactElement, options?: { queryClient?: QueryClient }) {
  const queryClient = options?.queryClient ?? createNoRetryTestQueryClient();
  return { queryClient, ...render(ui, { wrapper: createQueryWrapper(queryClient) }) };
}
