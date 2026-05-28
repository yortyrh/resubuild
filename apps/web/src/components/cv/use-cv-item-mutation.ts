'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { CvItemMutationResponse } from '@/lib/cv-item-api';

/** Standalone mutation runner for sections without a query cache (e.g. basics). */
export function useCvItemMutation() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async <T>(
      action: () => Promise<CvItemMutationResponse>,
      onSuccess?: (result: CvItemMutationResponse) => T,
      successMessage?: string,
    ): Promise<T | undefined> => {
      setSaving(true);
      setError(null);
      try {
        const result = await action();
        if (successMessage) {
          toast.success(successMessage);
        }
        return onSuccess?.(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Save failed';
        setError(message);
        toast.error(message);
        return undefined;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  return { saving, error, setError, run };
}
