'use client';

import type { ResumeInterest } from '@resumind/types';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import { TextField } from '@/components/cv/form-fields';
import { ManagedArraySection } from '@/components/cv/managed-array-section';
import { TagsInput } from '@/components/cv/tags-input';
import { TagsList } from '@/components/cv/tags-list';
import { useSectionMount } from '@/components/cv/use-section-mount';
import { getCvInterests } from '@/lib/api';
import { cvInterestApi } from '@/lib/cv-item-api';
import { createSectionRefetch, type SectionItem } from '@/lib/cv-section-refetch';

type InterestItem = SectionItem<ResumeInterest>;

export function InterestsSection() {
  useSectionMount('interests');
  const { cvId, resume, version, setResume, setVersion } = useCvEditor();

  return (
    <ManagedArraySection<InterestItem>
      cvId={cvId}
      version={version}
      onVersionChange={setVersion}
      items={resume.interests ?? []}
      onItemsChange={(interests) => setResume({ ...resume, interests })}
      refetchItems={createSectionRefetch<InterestItem>(getCvInterests, cvId)}
      entityLabel="Interest"
      addLabel="Add interest"
      createEmpty={() => ({ keywords: [] })}
      toPayload={(item) => item as Record<string, unknown>}
      api={cvInterestApi}
      renderView={(item) => ({
        title: <span>{item.name || 'Interest'}</span>,
        body: <TagsList label="Keywords" values={item.keywords ?? []} />,
      })}
      renderForm={(item, onChange) => (
        <>
          <TextField
            label="Name"
            value={item.name}
            onChange={(name) => onChange({ ...item, name })}
          />
          <TagsInput
            label="Keywords"
            values={item.keywords ?? []}
            onChange={(keywords) => onChange({ ...item, keywords })}
          />
        </>
      )}
    />
  );
}
