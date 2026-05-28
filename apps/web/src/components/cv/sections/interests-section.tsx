'use client';

import type { ResumeInterest } from '@resumind/types';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import { TextField } from '@/components/cv/form-fields';
import { SortableManagedArraySection } from '@/components/cv/sortable-managed-array-section';
import { TagsInput } from '@/components/cv/tags-input';
import { TagsList } from '@/components/cv/tags-list';
import { useSectionMount } from '@/components/cv/use-section-mount';
import { type SectionItem } from '@/lib/cv-section-refetch';
import { cvInterestApi } from '@/lib/cv-item-api';

type InterestItem = SectionItem<ResumeInterest>;

export function InterestsSection() {
  useSectionMount('interests');
  const { cvId, resume, setResume } = useCvEditor();

  return (
    <SortableManagedArraySection<InterestItem>
      cvId={cvId}
      sectionKey="interests"
      reorderSection="interests"
      reorderSectionLabel="interest"
      items={resume.interests ?? []}
      onItemsChange={(interests) => setResume((prev) => ({ ...prev, interests }))}
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
