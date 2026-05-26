'use client';

import type { Resume } from '@resumind/types';
import { createEmptyResume, stripResumeMetaFromEditor } from '@resumind/types';
import { useState } from 'react';
import { type CvSectionSlug, resolveSectionFromSlug } from '@/components/cv/cv-section-nav';
import { CvSections } from '@/components/cv/cv-sections';

interface CvEditorProps {
  cvId: string;
  initialResume?: Resume;
  section?: CvSectionSlug;
}

export function CvEditor({ cvId, initialResume, section }: CvEditorProps) {
  const [resume, setResume] = useState<Resume>(() =>
    initialResume ? stripResumeMetaFromEditor(initialResume) : createEmptyResume(),
  );
  const [version, setVersion] = useState(initialResume?.meta?.version);
  const activeSection = resolveSectionFromSlug(section);

  return (
    <CvSections
      cvId={cvId}
      version={version}
      onVersionChange={setVersion}
      resume={resume}
      onResumeChange={setResume}
      activeSection={activeSection}
    />
  );
}
