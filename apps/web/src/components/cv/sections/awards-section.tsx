'use client';

import type { ResumeAward } from '@resubuild/types';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import { formatIsoDate, validateRequiredDateOnCreate } from '@/components/cv/cv-section-helpers';
import { FieldRow, FormGroup, TextField } from '@/components/cv/form-fields';
import { IsoDateField } from '@/components/cv/iso-date-field';
import { ManagedArraySection } from '@/components/cv/managed-array-section';
import { MarkdownView } from '@/components/cv/markdown-view';
import { useSectionMount } from '@/components/cv/use-section-mount';
import { cvAwardApi } from '@/lib/cv-item-api';
import { sortDatedSectionItems } from '@/lib/cv-section-order';
import type { SectionItem } from '@/lib/cv-section-refetch';

type AwardItem = SectionItem<ResumeAward>;

export function AwardsSection() {
  useSectionMount('awards');
  const { cvId } = useCvEditor();

  return (
    <ManagedArraySection<AwardItem>
      cvId={cvId}
      sectionKey="awards"
      entityLabel="Award"
      addLabel="Add award"
      emptyText="Prizes, scholarships and recognitions."
      createEmpty={() => ({})}
      toPayload={(item) => item as Record<string, unknown>}
      api={cvAwardApi}
      validateBeforeSave={validateRequiredDateOnCreate}
      sortItems={sortDatedSectionItems}
      renderView={(item) => ({
        title: <span>{item.title || 'Award'}</span>,
        subtitle: item.awarder || undefined,
        dates: formatIsoDate(item.date),
        body: <MarkdownView value={item.summary} variant="block" />,
      })}
      renderForm={(item, onChange, context) => (
        <>
          <FormGroup title="Award">
            <FieldRow>
              <TextField
                label="Title"
                value={item.title}
                onChange={(title) => onChange({ ...item, title })}
              />
              <TextField
                label="Awarder"
                value={item.awarder}
                onChange={(awarder) => onChange({ ...item, awarder })}
              />
              <IsoDateField
                label="Date"
                required={context?.mode === 'create'}
                value={item.date}
                error={context?.fieldErrors.date}
                onChange={(date) => onChange({ ...item, date })}
              />
            </FieldRow>
          </FormGroup>
          <FormGroup title="Details">
            <TextField
              label="Summary"
              markdown
              value={item.summary}
              onChange={(summary) => onChange({ ...item, summary })}
            />
          </FormGroup>
        </>
      )}
    />
  );
}
