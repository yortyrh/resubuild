'use client';

import type { ResumeAward } from '@resumind/types';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import { TextField } from '@/components/cv/form-fields';
import { IsoDateField } from '@/components/cv/iso-date-field';
import { ManagedArraySection } from '@/components/cv/managed-array-section';
import { MarkdownView } from '@/components/cv/markdown-view';
import { useSectionMount } from '@/components/cv/use-section-mount';
import { cvAwardApi } from '@/lib/cv-item-api';

export function AwardsSection() {
  useSectionMount('awards');
  const { cvId, resume, version, setResume, setVersion } = useCvEditor();

  return (
    <ManagedArraySection<ResumeAward>
      cvId={cvId}
      version={version}
      onVersionChange={setVersion}
      items={resume.awards ?? []}
      onItemsChange={(awards) => setResume({ ...resume, awards })}
      entityLabel="Award"
      addLabel="Add award"
      createEmpty={() => ({})}
      toPayload={(item) => item as Record<string, unknown>}
      api={cvAwardApi}
      renderView={(item) => ({
        title: <span>{item.title || 'Award'}</span>,
        subtitle: item.awarder || undefined,
        meta: item.date ? <div>{item.date}</div> : undefined,
        body: <MarkdownView value={item.summary} variant="block" />,
      })}
      renderForm={(item, onChange) => (
        <>
          <TextField
            label="Title"
            value={item.title}
            onChange={(title) => onChange({ ...item, title })}
          />
          <IsoDateField
            label="Date"
            value={item.date}
            onChange={(date) => onChange({ ...item, date })}
          />
          <TextField
            label="Awarder"
            value={item.awarder}
            onChange={(awarder) => onChange({ ...item, awarder })}
          />
          <TextField
            label="Summary"
            markdown="block"
            multiline
            value={item.summary}
            onChange={(summary) => onChange({ ...item, summary })}
          />
        </>
      )}
    />
  );
}
