'use client';

import type { Resume } from '@resumind/types';
import {
  createEmptyResume,
  deriveCvTitleFromBasics,
  stripResumeMetaFromEditor,
} from '@resumind/types';
import { useState } from 'react';
import type { CvSectionSlug } from '@/components/cv/cv-section-nav';
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
  const displayTitle = deriveCvTitleFromBasics(resume.basics);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight">
        {displayTitle === 'Untitled CV' ? (
          <span className="text-muted-foreground">{displayTitle}</span>
        ) : (
          displayTitle
        )}
      </h2>
      <CvSections
        cvId={cvId}
        version={version}
        onVersionChange={setVersion}
        resume={resume}
        onResumeChange={setResume}
        activeSection={section ?? 'basics'}
      />
    </div>
  );
}
