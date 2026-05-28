'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAiAgentAccount,
  deleteAiAgentAccount,
  getAiAgentAccounts,
  getAiAgentActive,
  getAiAgentModels,
  getAiAgentProviders,
  getPdfImportJob,
  type PdfImportJobStatus,
  setAiAgentActive,
  updateAiAgentAccount,
} from '@/lib/api';
import { aiAgentKeys, importKeys } from '@/lib/queries/keys';
import { AI_MODELS_STALE_TIME_MS } from '@/lib/queries/query-client';

function invalidateAiAgentLists(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: aiAgentKeys.accounts() });
  void queryClient.invalidateQueries({ queryKey: aiAgentKeys.active() });
}

export function useAiAgentProviders() {
  return useQuery({
    queryKey: aiAgentKeys.providers(),
    queryFn: getAiAgentProviders,
  });
}

export function useAiAgentModels(providerId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: aiAgentKeys.models(providerId),
    queryFn: () => getAiAgentModels(providerId),
    enabled: Boolean(providerId) && (options?.enabled ?? true),
    staleTime: AI_MODELS_STALE_TIME_MS,
  });
}

export function useAiAgentAccounts() {
  return useQuery({
    queryKey: aiAgentKeys.accounts(),
    queryFn: getAiAgentAccounts,
  });
}

export function useAiAgentActive() {
  return useQuery({
    queryKey: aiAgentKeys.active(),
    queryFn: getAiAgentActive,
  });
}

export function useCreateAiAgentAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAiAgentAccount,
    onSuccess: () => invalidateAiAgentLists(queryClient),
  });
}

export function useUpdateAiAgentAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof updateAiAgentAccount>[1];
    }) => updateAiAgentAccount(id, payload),
    onSuccess: () => invalidateAiAgentLists(queryClient),
  });
}

export function useDeleteAiAgentAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAiAgentAccount,
    onSuccess: () => invalidateAiAgentLists(queryClient),
  });
}

export function useSetAiAgentActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setAiAgentActive,
    onSuccess: () => invalidateAiAgentLists(queryClient),
  });
}

function isPdfJobPolling(status: PdfImportJobStatus['status'] | undefined): boolean {
  return status === 'queued' || status === 'running';
}

export function usePdfImportJob(jobId: string | null, pollIntervalMs = 2000) {
  return useQuery({
    queryKey: importKeys.pdfJob(jobId ?? ''),
    queryFn: () => getPdfImportJob(jobId!),
    enabled: Boolean(jobId),
    refetchInterval: (query) =>
      isPdfJobPolling(query.state.data?.status) ? Math.max(pollIntervalMs, 1) : false,
  });
}
