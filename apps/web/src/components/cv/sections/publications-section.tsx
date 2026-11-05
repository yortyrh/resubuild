'use client';

import type { ResumePublication } from '@resubuild/types';
import { ComposerBlock, ComposerRow, EntryComposer } from '@/components/cv/composer/entry-composer';
import { InlineDateField } from '@/components/cv/composer/inline-date-field';
import { InlineField } from '@/components/cv/composer/inline-field';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import { validateRequiredReleaseDateOnCreate } from '@/components/cv/cv-section-helpers';
import { linkedEntityLabel } from '@/components/cv/external-link';
import { ManagedArraySection } from '@/components/cv/managed-array-section';
import { MarkdownEditor } from '@/components/cv/markdown-editor';
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
        <EntryComposer>
          <ComposerRow
            left={
              <InlineField
                label="Publication title"
                tone="title"
                value={item.name}
                onChange={(name) => onChange({ ...item, name })}
              />
            }
            right={
              <InlineDateField
                label="Release date"
                required={context?.mode === 'create'}
                value={item.releaseDate}
                error={context?.fieldErrors.releaseDate}
                onChange={(releaseDate) => onChange({ ...item, releaseDate })}
              />
            }
          />
          <InlineField
            label="Publisher"
            tone="meta"
            placeholder="Published by"
            value={item.publisher}
            onChange={(publisher) => onChange({ ...item, publisher })}
          />
          <InlineField
            label="Link"
            type="url"
            tone="meta"
            value={item.url}
            onChange={(url) => onChange({ ...item, url })}
          />
          <ComposerBlock label="Summary">
            <MarkdownEditor
              deferUntilFocus
              ariaLabel="Summary"
              placeholder="What the publication covers."
              value={item.summary ?? ''}
              onChange={(summary) => onChange({ ...item, summary })}
            />
          </ComposerBlock>
        </EntryComposer>
      )}
    />
  );
}
