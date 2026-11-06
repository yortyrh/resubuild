'use client';

import type { Resume } from '@resubuild/types';
import { useQueryClient } from '@tanstack/react-query';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import { CvSectionSkeleton } from '@/components/cv/cv-editor-skeleton';
import { ManagedBasicsSection } from '@/components/cv/managed-basics-section';
import { useSectionMount } from '@/components/cv/use-section-mount';
import type { CvRecord } from '@/lib/api';
import { useCv } from '@/lib/queries/cv-queries';
import { cvKeys } from '@/lib/queries/keys';

type Basics = NonNullable<Resume['basics']>;

export function BasicsSection() {
  useSectionMount('basics');
  const { cvId } = useCvEditor();
  const queryClient = useQueryClient();
  const { data: cv } = useCv(cvId);

  if (!cv) {
    return (
      <div role="status" aria-busy="true" aria-label="Loading basics">
        <CvSectionSkeleton section="basics" />
      </div>
    );
  }

  const basics = ((cv.data as Resume).basics ?? {}) as Basics;

  return (
    <ManagedBasicsSection
      cvId={cvId}
      basics={basics}
      onBasicsChange={(next) =>
        queryClient.setQueryData<CvRecord>(cvKeys.detail(cvId), (current) =>
          current ? { ...current, data: { ...current.data, basics: next } } : current,
        )
      }
    />
  );
}
