'use client';

import type { Resume } from '@resumind/types';
import { createEmptyResume, stripResumeMetaFromEditor } from '@resumind/types';
import { useState } from 'react';
import type { CvSectionSlug } from '@/components/cv/cv-section-nav';
import { CvSections } from '@/components/cv/cv-sections';
import { EditableCvTitle } from '@/components/cv/editable-cv-title';

interface CvEditorProps {
  cvId: string;
  initialTitle?: string;
  initialResume?: Resume;
  section?: CvSectionSlug;
}

export function CvEditor({
  cvId,
  initialTitle = 'Untitled CV',
  initialResume,
  section,
}: CvEditorProps) {
  const [resume, setResume] = useState<Resume>(() =>
    initialResume ? stripResumeMetaFromEditor(initialResume) : createEmptyResume(),
  );
  const [version, setVersion] = useState(initialResume?.meta?.version);

  return (
    <div className="space-y-6">
      <EditableCvTitle cvId={cvId} initialTitle={initialTitle} />
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
