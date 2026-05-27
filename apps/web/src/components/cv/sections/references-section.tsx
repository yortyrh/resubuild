'use client';

import type { ResumeReference } from '@resumind/types';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import { TextField } from '@/components/cv/form-fields';
import { ManagedArraySection } from '@/components/cv/managed-array-section';
import { MarkdownView } from '@/components/cv/markdown-view';
import { useSectionMount } from '@/components/cv/use-section-mount';
import { cvReferenceApi } from '@/lib/cv-item-api';

export function ReferencesSection() {
  useSectionMount('references');
  const { cvId, resume, version, setResume, setVersion } = useCvEditor();

  return (
    <ManagedArraySection<ResumeReference>
      cvId={cvId}
      version={version}
      onVersionChange={setVersion}
      items={resume.references ?? []}
      onItemsChange={(references) => setResume({ ...resume, references })}
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
