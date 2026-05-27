'use client';

import { useCvEditor } from '@/components/cv/cv-editor-provider';
import { ManagedBasicsSection } from '@/components/cv/managed-basics-section';
import { useSectionMount } from '@/components/cv/use-section-mount';

export function BasicsSection() {
  useSectionMount('basics');
  const { cvId, resume, setResume } = useCvEditor();

  return (
    <ManagedBasicsSection
      cvId={cvId}
      basics={resume.basics ?? {}}
      onBasicsChange={(basics) => setResume({ ...resume, basics })}
    />
  );
}
