'use client';

import type { ResumePublication } from '@resumind/types';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import { linkedEntityLabel } from '@/components/cv/external-link';
import { TextField } from '@/components/cv/form-fields';
import { IsoDateField } from '@/components/cv/iso-date-field';
import { ManagedArraySection } from '@/components/cv/managed-array-section';
import { MarkdownView } from '@/components/cv/markdown-view';
import { useSectionMount } from '@/components/cv/use-section-mount';
import { type SectionItem } from '@/lib/cv-section-refetch';
import { cvPublicationApi } from '@/lib/cv-item-api';

type PublicationItem = SectionItem<ResumePublication>;

export function PublicationsSection() {
  useSectionMount('publications');
  const { cvId, resume, setResume } = useCvEditor();

  return (
    <ManagedArraySection<PublicationItem>
      cvId={cvId}
      sectionKey="publications"
      items={resume.publications ?? []}
      onItemsChange={(publications) => setResume((prev) => ({ ...prev, publications }))}
      entityLabel="Publication"
      addLabel="Add publication"
      createEmpty={() => ({})}
      toPayload={(item) => item as Record<string, unknown>}
      api={cvPublicationApi}
      renderView={(item) => {
        const publicationLabel = item.name || 'Publication';
        return {
          title: <span>{linkedEntityLabel(publicationLabel, item.url) ?? publicationLabel}</span>,
          subtitle: item.publisher || undefined,
          meta: item.releaseDate ? <div>{item.releaseDate}</div> : undefined,
          body: <MarkdownView value={item.summary} variant="block" />,
        };
      }}
      renderForm={(item, onChange) => (
        <>
          <TextField
            label="Name"
            value={item.name}
            onChange={(name) => onChange({ ...item, name })}
          />
          <TextField
            label="Publisher"
            value={item.publisher}
            onChange={(publisher) => onChange({ ...item, publisher })}
          />
          <IsoDateField
            label="Release date"
            value={item.releaseDate}
            onChange={(releaseDate) => onChange({ ...item, releaseDate })}
          />
          <TextField
            label="URL"
            type="url"
            value={item.url}
            onChange={(url) => onChange({ ...item, url })}
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
