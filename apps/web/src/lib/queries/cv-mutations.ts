'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { createCv, deleteCv } from '@/lib/api';
import type { CvItemMutationResponse } from '@/lib/cv-item-api';
import type { CvArraySectionKey } from '@/lib/queries/cv-queries';
import { fetchCvSection } from '@/lib/queries/cv-queries';
import { cvKeys } from '@/lib/queries/keys';

export function useDeleteCv() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCv,
    onSuccess: () => {
      toast.success('CV deleted');
      void queryClient.invalidateQueries({ queryKey: cvKeys.list() });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete CV');
    },
  });
}

export function useCreateCv() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { title?: string; data: Record<string, unknown> }) => createCv(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cvKeys.list() });
    },
  });
}

export function mergeSectionItemInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  cvId: string,
  sectionKey: CvArraySectionKey,
  item: Record<string, unknown>,
): void {
  const sectionQueryKey = cvKeys.section(cvId, sectionKey);
  const itemId = item.id;

  if (typeof itemId !== 'string') {
    return;
  }

  queryClient.setQueryData<Record<string, unknown>[]>(sectionQueryKey, (current) => {
    if (!current) {
      return current;
    }

    return current.map((entry) => (entry.id === itemId ? { ...entry, ...item } : entry));
  });
}

export function invalidateCvSection(
  queryClient: ReturnType<typeof useQueryClient>,
  cvId: string,
  sectionKey: CvArraySectionKey,
): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: cvKeys.section(cvId, sectionKey) });
}

export function useSectionItemMutations(cvId: string, sectionKey: CvArraySectionKey) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async <T>(
      action: () => Promise<CvItemMutationResponse>,
      onSuccess?: (result: CvItemMutationResponse) => T | Promise<T>,
      successMessage?: string,
      options?: { invalidateSection?: boolean; mergeItem?: boolean },
    ): Promise<T | undefined> => {
      setSaving(true);
      setError(null);

      try {
        const result = await action();

        if (options?.mergeItem && result.item) {
          mergeSectionItemInCache(
            queryClient,
            cvId,
            sectionKey,
            result.item as Record<string, unknown>,
          );
        }

        if (options?.invalidateSection) {
          await invalidateCvSection(queryClient, cvId, sectionKey);
        }

        if (successMessage) {
          toast.success(successMessage);
        }

        return await onSuccess?.(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Save failed';
        setError(message);
        toast.error(message);
        return undefined;
      } finally {
        setSaving(false);
      }
    },
    [cvId, queryClient, sectionKey],
  );

  const refetchSectionItems = useCallback(async <T>() => {
    const data = await queryClient.fetchQuery({
      queryKey: cvKeys.section(cvId, sectionKey),
      queryFn: () => fetchCvSection<T>(cvId, sectionKey),
    });
    return data;
  }, [cvId, queryClient, sectionKey]);

  return { saving, error, setError, run, refetchSectionItems };
}
