'use client';

import { useEffect, useState } from 'react';
import { checkImportableMediaUrl } from '@/lib/import-cv-media';
import {
  gravatarOptionForImageStatus,
  type ImportImagePreviewStatus,
  type ImportSourcePreview,
  parseImportJsonSource,
  probeExternalImageUrl,
} from '@/lib/import-cv-preview';

export function useImportJsonPreview(jsonText: string) {
  const [preview, setPreview] = useState<ImportSourcePreview | null>(null);
  const [useGravatar, setUseGravatar] = useState(false);

  useEffect(() => {
    if (!jsonText.trim()) {
      setPreview(null);
      setUseGravatar(false);
      return;
    }

    const initial = parseImportJsonSource(jsonText);
    setPreview(initial);
    setUseGravatar(false);

    if (!initial.valid || initial.imageStatus !== 'checking' || !initial.basicsImage) {
      return;
    }

    let cancelled = false;
    const imageUrl = initial.basicsImage;

    void (async () => {
      const browserReachable = await probeExternalImageUrl(imageUrl);
      if (cancelled) {
        return;
      }

      let imageStatus: ImportImagePreviewStatus = browserReachable ? 'reachable' : 'unreachable';
      if (browserReachable) {
        const serverImportable = await checkImportableMediaUrl(imageUrl);
        if (cancelled) {
          return;
        }
        if (!serverImportable) {
          imageStatus = 'host_not_allowed';
        }
      }

      setPreview((current) => {
        if (!current?.valid || current.basicsImage !== imageUrl) {
          return current;
        }
        return {
          ...current,
          imageStatus,
          showGravatarOption: gravatarOptionForImageStatus(current.basicsEmail, imageStatus),
        };
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [jsonText]);

  return { preview, useGravatar, setUseGravatar, setPreview };
}
