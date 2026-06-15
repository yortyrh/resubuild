'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { ImportSourcePreview } from '@/lib/import-cv-preview';
import { imageStatusLabel } from '@/lib/import-cv-preview';
import type { ImportValidationSource } from '@/lib/import-validation-source';

export interface UseImportPreviewToastsOptions {
  resetKey: string;
  preview: ImportSourcePreview | null;
  validationSource: ImportValidationSource;
  discoveredProfilesCount?: number;
}

function agentReadyMessage(discoveredProfilesCount?: number): string {
  if (discoveredProfilesCount && discoveredProfilesCount > 0) {
    const label = discoveredProfilesCount === 1 ? 'profile' : 'profiles';
    return `Résumé is ready to import. We found ${discoveredProfilesCount} social ${label}—review them in Preview or Edit before Save.`;
  }
  return 'Résumé is ready to import.';
}

export function useImportPreviewToasts({
  resetKey,
  preview,
  validationSource,
  discoveredProfilesCount,
}: UseImportPreviewToastsOptions): void {
  const readySourceRef = useRef<ImportValidationSource | null>(null);
  const imageStatusRef = useRef<string | null>(null);

  useEffect(() => {
    void resetKey;
    readySourceRef.current = null;
    imageStatusRef.current = null;
  }, [resetKey]);

  useEffect(() => {
    if (!preview?.valid) {
      return;
    }

    if (validationSource === 'agent' && readySourceRef.current !== 'agent') {
      toast.success(agentReadyMessage(discoveredProfilesCount));
      readySourceRef.current = 'agent';
      return;
    }

    if (
      (validationSource === 'direct' || validationSource === 'edited') &&
      readySourceRef.current !== validationSource
    ) {
      toast.success('JSON Resume data is valid.');
      readySourceRef.current = validationSource;
    }
  }, [preview?.valid, validationSource, discoveredProfilesCount]);

  useEffect(() => {
    if (!preview?.valid) {
      return;
    }

    const status = preview.imageStatus;
    if (status === 'checking' || status === 'owned') {
      return;
    }

    if (imageStatusRef.current === status) {
      return;
    }

    imageStatusRef.current = status;
    const label = imageStatusLabel(status);
    if (!label) {
      return;
    }

    if (status === 'reachable') {
      toast.success(label);
      return;
    }

    toast.info(label);
  }, [preview]);
}
