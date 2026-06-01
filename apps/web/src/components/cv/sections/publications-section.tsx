'use client';

import type { ResumePublication } from '@resumind/types';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import { validateRequiredReleaseDateOnCreate } from '@/components/cv/cv-section-helpers';
import { linkedEntityLabel } from '@/components/cv/external-link';
import { TextField } from '@/components/cv/form-fields';
import { IsoDateField } from '@/components/cv/iso-date-field';
import { ManagedArraySection } from '@/components/cv/managed-array-section';
import { MarkdownView } from '@/components/cv/markdown-view';
import { useSectionMount } from '@/components/cv/use-section-mount';
import { cvPublicationApi } from '@/lib/cv-item-api';
import { sortPublicationSectionItems } from '@/lib/cv-section-order';
import type { SectionItem } from '@/lib/cv-section-refetch';

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
      validateBeforeSave={validateRequiredReleaseDateOnCreate}
      sortItems={sortPublicationSectionItems}
      renderView={(item) => {
        const publicationLabel = item.name || 'Publication';
        return {
          title: <span>{linkedEntityLabel(publicationLabel, item.url) ?? publicationLabel}</span>,
          subtitle: item.publisher || undefined,
          meta: item.releaseDate ? <div>{item.releaseDate}</div> : undefined,
          body: <MarkdownView value={item.summary} variant="block" />,
        };
      }}
      renderForm={(item, onChange, context) => (
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
            required={context?.mode === 'create'}
            value={item.releaseDate}
            error={context?.fieldErrors.releaseDate}
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
