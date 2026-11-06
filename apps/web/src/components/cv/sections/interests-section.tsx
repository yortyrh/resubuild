'use client';

import type { ResumeInterest } from '@resubuild/types';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import { FormGroup, TextField } from '@/components/cv/form-fields';
import { SortableManagedArraySection } from '@/components/cv/sortable-managed-array-section';
import { TagsInput } from '@/components/cv/tags-input';
import { TagsList } from '@/components/cv/tags-list';
import { useSectionMount } from '@/components/cv/use-section-mount';
import { cvInterestApi } from '@/lib/cv-item-api';
import type { SectionItem } from '@/lib/cv-section-refetch';

type InterestItem = SectionItem<ResumeInterest>;

export function InterestsSection() {
  useSectionMount('interests');
  const { cvId } = useCvEditor();

  return (
    <SortableManagedArraySection<InterestItem>
      cvId={cvId}
      sectionKey="interests"
      reorderSection="interests"
      reorderSectionLabel="interest"
      entityLabel="Interest"
      addLabel="Add interest"
      emptyText="Topics outside work that say something about you."
      createEmpty={() => ({ keywords: [] })}
      toPayload={(item) => item as Record<string, unknown>}
      api={cvInterestApi}
      renderView={(item) => ({
        title: <span>{item.name || 'Interest'}</span>,
        body: <TagsList label="Keywords" values={item.keywords ?? []} />,
      })}
      renderForm={(item, onChange) => (
        <FormGroup title="Interest">
          <TextField
            label="Name"
            value={item.name}
            onChange={(name) => onChange({ ...item, name })}
          />
          <TagsInput
            label="Keywords"
            description="Enter or a comma adds each keyword."
            values={item.keywords ?? []}
            onChange={(keywords) => onChange({ ...item, keywords })}
          />
        </FormGroup>
      )}
    />
  );
}
