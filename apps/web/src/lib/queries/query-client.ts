import { QueryClient } from '@tanstack/react-query';

export const DEFAULT_STALE_TIME_MS = 30_000;
export const DEFAULT_GC_TIME_MS = 5 * 60_000;
export const AI_MODELS_STALE_TIME_MS = 5 * 60_000;

function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) {
    return false;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('401') || message.includes('403') || message.includes('unauthorized')) {
      return false;
    }
  }

  return true;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: DEFAULT_STALE_TIME_MS,
        gcTime: DEFAULT_GC_TIME_MS,
        retry: shouldRetryQuery,
      },
    },
  });
}
