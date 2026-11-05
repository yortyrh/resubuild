'use client';

import type { ResumeAward } from '@resubuild/types';
import { ComposerBlock, ComposerRow, EntryComposer } from '@/components/cv/composer/entry-composer';
import { InlineDateField } from '@/components/cv/composer/inline-date-field';
import { InlineField } from '@/components/cv/composer/inline-field';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import { validateRequiredDateOnCreate } from '@/components/cv/cv-section-helpers';
import { ManagedArraySection } from '@/components/cv/managed-array-section';
import { MarkdownEditor } from '@/components/cv/markdown-editor';
import { MarkdownView } from '@/components/cv/markdown-view';
import { useSectionMount } from '@/components/cv/use-section-mount';
import { cvAwardApi } from '@/lib/cv-item-api';
import { sortDatedSectionItems } from '@/lib/cv-section-order';
import type { SectionItem } from '@/lib/cv-section-refetch';

type AwardItem = SectionItem<ResumeAward>;

export function AwardsSection() {
  useSectionMount('awards');
  const { cvId, resume, setResume } = useCvEditor();

  return (
    <ManagedArraySection<AwardItem>
      cvId={cvId}
      sectionKey="awards"
      items={resume.awards ?? []}
      onItemsChange={(awards) => setResume((prev) => ({ ...prev, awards }))}
      entityLabel="Award"
      addLabel="Add award"
      createEmpty={() => ({})}
      toPayload={(item) => item as Record<string, unknown>}
      api={cvAwardApi}
      validateBeforeSave={validateRequiredDateOnCreate}
      sortItems={sortDatedSectionItems}
      renderView={(item) => ({
        title: <span>{item.title || 'Award'}</span>,
        subtitle: item.awarder || undefined,
        meta: item.date ? <div>{item.date}</div> : undefined,
        body: <MarkdownView value={item.summary} variant="block" />,
      })}
      renderForm={(item, onChange, context) => (
        <EntryComposer>
          <ComposerRow
            left={
              <InlineField
                label="Award title"
                tone="title"
                value={item.title}
                onChange={(title) => onChange({ ...item, title })}
              />
            }
            right={
              <InlineDateField
                label="Date"
                required={context?.mode === 'create'}
                value={item.date}
                error={context?.fieldErrors.date}
                onChange={(date) => onChange({ ...item, date })}
              />
            }
          />
          <InlineField
            label="Awarder"
            tone="meta"
            placeholder="Awarded by"
            value={item.awarder}
            onChange={(awarder) => onChange({ ...item, awarder })}
          />
          <ComposerBlock label="Summary">
            <MarkdownEditor
              deferUntilFocus
              ariaLabel="Summary"
              placeholder="Why you received it."
              value={item.summary ?? ''}
              onChange={(summary) => onChange({ ...item, summary })}
            />
          </ComposerBlock>
        </EntryComposer>
      )}
    />
  );
}
