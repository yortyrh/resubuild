'use client';

import type { ResumePublication } from '@resubuild/types';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import {
  formatIsoDate,
  validateRequiredReleaseDateOnCreate,
} from '@/components/cv/cv-section-helpers';
import { linkedEntityLabel } from '@/components/cv/external-link';
import { FieldRow, FormGroup, TextField } from '@/components/cv/form-fields';
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
      emptyText="Articles, papers, books and talks."
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
          dates: formatIsoDate(item.releaseDate),
          body: <MarkdownView value={item.summary} variant="block" />,
        };
      }}
      renderForm={(item, onChange, context) => (
        <>
          <FormGroup title="Publication">
            <FieldRow>
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
                placeholder="https://"
                value={item.url}
                onChange={(url) => onChange({ ...item, url })}
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
