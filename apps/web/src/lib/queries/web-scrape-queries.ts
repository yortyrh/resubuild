'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  clearWebScrapeConfig,
  getWebScrapeConfig,
  saveWebScrapeConfig,
  type WebScrapeProvider,
} from '@/lib/api';
import { webScrapeKeys } from '@/lib/queries/keys';

export function useWebScrapeConfig() {
  return useQuery({
    queryKey: webScrapeKeys.config(),
    queryFn: getWebScrapeConfig,
  });
}

export function useSaveWebScrapeConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { provider: WebScrapeProvider; apiKey: string }) =>
      saveWebScrapeConfig(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: webScrapeKeys.config() });
    },
  });
}

export function useClearWebScrapeConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clearWebScrapeConfig,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: webScrapeKeys.config() });
    },
  });
}
