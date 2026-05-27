'use client';

import type { ResumeAward } from '@resumind/types';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import { TextField } from '@/components/cv/form-fields';
import { IsoDateField } from '@/components/cv/iso-date-field';
import { ManagedArraySection } from '@/components/cv/managed-array-section';
import { MarkdownView } from '@/components/cv/markdown-view';
import { useSectionMount } from '@/components/cv/use-section-mount';
import { getCvAwards } from '@/lib/api';
import { cvAwardApi } from '@/lib/cv-item-api';
import { createSectionRefetch, type SectionItem } from '@/lib/cv-section-refetch';

type AwardItem = SectionItem<ResumeAward>;

export function AwardsSection() {
  useSectionMount('awards');
  const { cvId, resume, setResume } = useCvEditor();

  return (
    <ManagedArraySection<AwardItem>
      cvId={cvId}
      items={resume.awards ?? []}
      onItemsChange={(awards) => setResume((prev) => ({ ...prev, awards }))}
      refetchItems={createSectionRefetch<AwardItem>(getCvAwards, cvId)}
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
