'use client';

import type { ResumeReference } from '@resubuild/types';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import { TextField } from '@/components/cv/form-fields';
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
        <>
          <TextField
            label="Name"
            description="Reference full name."
            value={item.name}
            onChange={(name) => onChange({ ...item, name })}
          />
          <TextField
            label="Reference"
            markdown="block"
            multiline
            description="Recommendation text."
            value={item.reference}
            onChange={(reference) => onChange({ ...item, reference })}
          />
        </>
      )}
    />
  );
}
