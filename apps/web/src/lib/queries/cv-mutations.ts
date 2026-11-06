'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { createCv, deleteCv } from '@/lib/api';
import type { CvItemMutationResponse } from '@/lib/cv-item-api';
import type { CvArraySectionKey } from '@/lib/queries/cv-queries';
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

type QueryClientLike = ReturnType<typeof useQueryClient>;
type SectionEntry = Record<string, unknown>;

/**
 * Writes a saved entry into its own key and into its place in the cached section
 * list (other entries and the order stay as they are). Entries without a string id
 * are ignored; a list that is not cached is not created.
 */
export function writeSectionItem(
  queryClient: QueryClientLike,
  cvId: string,
  section: CvArraySectionKey,
  item: SectionEntry,
): void {
  const itemId = item.id;
  if (typeof itemId !== 'string') {
    return;
  }

  queryClient.setQueryData<SectionEntry>(cvKeys.sectionItem(cvId, section, itemId), (current) => ({
    ...current,
    ...item,
  }));
  queryClient.setQueryData<SectionEntry[]>(cvKeys.sectionList(cvId, section), (current) =>
    current?.map((entry) => (entry.id === itemId ? { ...entry, ...item } : entry)),
  );
}

/** Replaces the cached section list and seeds each entry's own key. */
export function writeSectionList(
  queryClient: QueryClientLike,
  cvId: string,
  section: CvArraySectionKey,
  items: SectionEntry[],
): void {
  queryClient.setQueryData(cvKeys.sectionList(cvId, section), items);
  for (const item of items) {
    if (typeof item.id === 'string') {
      queryClient.setQueryData(cvKeys.sectionItem(cvId, section, item.id), item);
    }
  }
}

/** Drops a deleted entry from the cached list and removes its own query. */
export function removeSectionItem(
  queryClient: QueryClientLike,
  cvId: string,
  section: CvArraySectionKey,
  itemId: string,
): void {
  queryClient.setQueryData<SectionEntry[]>(cvKeys.sectionList(cvId, section), (current) =>
    current?.filter((entry) => entry.id !== itemId),
  );
  queryClient.removeQueries({ queryKey: cvKeys.sectionItem(cvId, section, itemId), exact: true });
}

/** Marks the section list stale and refetches it if it is shown; entry keys are re-seeded by the refetch. */
export function invalidateCvSection(
  queryClient: QueryClientLike,
  cvId: string,
  section: CvArraySectionKey,
): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: cvKeys.sectionList(cvId, section) });
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
          writeSectionItem(queryClient, cvId, sectionKey, result.item as SectionEntry);
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

  return { saving, error, setError, run };
}
