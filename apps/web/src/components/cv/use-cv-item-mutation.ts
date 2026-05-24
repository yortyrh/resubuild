'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { CvItemMutationResponse } from '@/lib/cv-item-api';

interface UseCvItemMutationOptions {
  version: string | undefined;
  onVersionChange: (version: string) => void;
}

export function useCvItemMutation({ version, onVersionChange }: UseCvItemMutationOptions) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async <T>(
      action: (currentVersion?: string) => Promise<CvItemMutationResponse>,
      onSuccess?: (result: CvItemMutationResponse) => T,
      successMessage?: string,
    ): Promise<T | undefined> => {
      setSaving(true);
      setError(null);
      try {
        const result = await action(version);
        onVersionChange(result.version);
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
    [onVersionChange, version],
  );

  return { saving, error, setError, run };
}
