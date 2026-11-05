'use client';

import type { ResumeInterest } from '@resubuild/types';
import { EntryComposer } from '@/components/cv/composer/entry-composer';
import { InlineField } from '@/components/cv/composer/inline-field';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import { SortableManagedArraySection } from '@/components/cv/sortable-managed-array-section';
import { TagsInput } from '@/components/cv/tags-input';
import { TagsList } from '@/components/cv/tags-list';
import { useSectionMount } from '@/components/cv/use-section-mount';
import { cvInterestApi } from '@/lib/cv-item-api';
import type { SectionItem } from '@/lib/cv-section-refetch';

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
        <EntryComposer>
          <InlineField
            label="Interest"
            tone="title"
            placeholder="Interest, e.g. Climbing"
            value={item.name}
            onChange={(name) => onChange({ ...item, name })}
          />
          <TagsInput
            variant="inline"
            label="Keywords"
            placeholder="Details, e.g. Bouldering, Alpine routes"
            values={item.keywords ?? []}
            onChange={(keywords) => onChange({ ...item, keywords })}
          />
        </EntryComposer>
      )}
    />
  );
}
