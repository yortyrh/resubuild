'use client';

import type { Resume } from '@resumind/types';
import { useEffect, useState } from 'react';
import { CvEditor } from '@/components/cv/cv-editor';
import type { CvSectionSlug } from '@/components/cv/cv-section-nav';
import { getCv } from '@/lib/api';

export function EditCvPageClient({ cvId, section }: { cvId: string; section?: CvSectionSlug }) {
  const [title, setTitle] = useState<string>();
  const [resume, setResume] = useState<Resume>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCv(cvId)
      .then((cv) => {
        setTitle(cv.title);
        setResume(cv.data as Resume);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load CV'));
  }, [cvId]);

  if (error) {
    return <p className="text-destructive">{error}</p>;
  }

  if (!title || !resume) {
    return <p className="text-muted-foreground">Loading CV…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit CV</h1>
        <p className="text-muted-foreground">Update your CV.</p>
      </div>
      <CvEditor cvId={cvId} initialTitle={title} initialResume={resume} section={section} />
    </div>
  );
}
