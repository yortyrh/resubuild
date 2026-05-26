'use client';

import type { Resume } from '@resumind/types';
import { useEffect, useState } from 'react';
import { CvEditor } from '@/components/cv/cv-editor';
import { CvEditorSkeleton } from '@/components/cv/cv-editor-skeleton';
import { type CvSectionSlug, resolveSectionFromSlug } from '@/components/cv/cv-section-nav';
import { getCv } from '@/lib/api';

export function EditCvPageClient({ cvId, section }: { cvId: string; section?: CvSectionSlug }) {
  const [resume, setResume] = useState<Resume>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCv(cvId)
      .then((cv) => {
        setResume(cv.data as Resume);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load CV'));
  }, [cvId]);

  if (error) {
    return <p className="text-destructive">{error}</p>;
  }

  if (!resume) {
    return <CvEditorSkeleton section={resolveSectionFromSlug(section)} />;
  }

  return <CvEditor cvId={cvId} initialResume={resume} section={section} />;
}
