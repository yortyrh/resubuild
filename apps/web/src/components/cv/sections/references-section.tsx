'use client';

import type { ResumeReference } from '@resubuild/types';
import { ComposerBlock, EntryComposer } from '@/components/cv/composer/entry-composer';
import { InlineField } from '@/components/cv/composer/inline-field';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import { MarkdownEditor } from '@/components/cv/markdown-editor';
import { MarkdownView } from '@/components/cv/markdown-view';
import { SortableManagedArraySection } from '@/components/cv/sortable-managed-array-section';
import { useSectionMount } from '@/components/cv/use-section-mount';
import { cvReferenceApi } from '@/lib/cv-item-api';
import type { SectionItem } from '@/lib/cv-section-refetch';

type ReferenceItem = SectionItem<ResumeReference>;

export function ReferencesSection() {
  useSectionMount('references');
  const { cvId, resume, setResume } = useCvEditor();

  return (
    <SortableManagedArraySection<ReferenceItem>
      cvId={cvId}
      sectionKey="references"
      reorderSection="references"
      reorderSectionLabel="reference"
      items={resume.references ?? []}
      onItemsChange={(references) => setResume((prev) => ({ ...prev, references }))}
      entityLabel="Reference"
      addLabel="Add reference"
      createEmpty={() => ({})}
      toPayload={(item) => item as Record<string, unknown>}
      api={cvReferenceApi}
      renderView={(item) => ({
        title: <span>{item.name || 'Reference'}</span>,
        body: <MarkdownView value={item.reference} variant="block" />,
      })}
      renderForm={(item, onChange) => (
        <EntryComposer>
          <InlineField
            label="Name"
            tone="title"
            placeholder="Full name of the reference"
            value={item.name}
            onChange={(name) => onChange({ ...item, name })}
          />
          <ComposerBlock label="Reference">
            <MarkdownEditor
              deferUntilFocus
              ariaLabel="Reference"
              placeholder="What they said about working with you."
              value={item.reference ?? ''}
              onChange={(reference) => onChange({ ...item, reference })}
            />
          </ComposerBlock>
        </EntryComposer>
      )}
    />
  );
}
