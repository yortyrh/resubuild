'use client';

import type { ResumeProject } from '@resubuild/types';
import { BulletListField } from '@/components/cv/composer/bullet-list-field';
import { ComposerBlock, ComposerRow, EntryComposer } from '@/components/cv/composer/entry-composer';
import { InlineDateField } from '@/components/cv/composer/inline-date-field';
import { InlineField } from '@/components/cv/composer/inline-field';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import {
  formatDateRange,
  highlightBody,
  trimStringList,
  validateRequiredStartDate,
} from '@/components/cv/cv-section-helpers';
import { linkedEntityLabel } from '@/components/cv/external-link';
import { ManagedArraySection } from '@/components/cv/managed-array-section';
import { MarkdownEditor } from '@/components/cv/markdown-editor';
import { MarkdownView } from '@/components/cv/markdown-view';
import { MetadataFieldGroup, MetadataTextField } from '@/components/cv/metadata-field';
import { TagsInput } from '@/components/cv/tags-input';
import { TagsList } from '@/components/cv/tags-list';
import { useSectionMount } from '@/components/cv/use-section-mount';
import { cvProjectApi } from '@/lib/cv-item-api';
import { sortDateRangeSectionItems } from '@/lib/cv-section-order';
import type { SectionItem } from '@/lib/cv-section-refetch';

type ProjectItem = SectionItem<ResumeProject>;

export function ProjectsSection() {
  useSectionMount('projects');
  const { cvId, resume, setResume } = useCvEditor();

  return (
    <ManagedArraySection<ProjectItem>
      cvId={cvId}
      sectionKey="projects"
      items={resume.projects ?? []}
      onItemsChange={(projects) => setResume((prev) => ({ ...prev, projects }))}
      entityLabel="Project"
      addLabel="Add project"
      createEmpty={() => ({ highlights: [], keywords: [], roles: [] })}
      toPayload={(item) => ({
        ...(item as Record<string, unknown>),
        highlights: trimStringList(item.highlights),
      })}
      api={cvProjectApi}
      validateBeforeSave={validateRequiredStartDate}
      sortItems={sortDateRangeSectionItems}
      renderView={(item) => {
        const projectLabel = item.name || 'Project';
        return {
          title: <span>{linkedEntityLabel(projectLabel, item.url) ?? projectLabel}</span>,
          meta: formatDateRange(item.startDate, item.endDate),
          body: (
            <>
              <MarkdownView value={item.description} variant="block" />
              <MetadataFieldGroup>
                <MetadataTextField label="Entity" value={item.entity} />
                <MetadataTextField label="Type" value={item.type} />
                <TagsList label="Roles" variant="roles" values={item.roles ?? []} />
                <TagsList label="Keywords" values={item.keywords ?? []} />
              </MetadataFieldGroup>
              {highlightBody(item.highlights, { markdown: true })}
            </>
          ),
        };
      }}
      renderForm={(item, onChange, context) => (
        <EntryComposer>
          <ComposerRow
            left={
              <InlineField
                label="Project name"
                tone="title"
                value={item.name}
                onChange={(name) => onChange({ ...item, name })}
              />
            }
            right={
              <>
                <InlineDateField
                  label="Start date"
                  required
                  value={item.startDate}
                  error={context?.fieldErrors.startDate}
                  onChange={(startDate) => onChange({ ...item, startDate })}
                />
                <span aria-hidden className="text-page-ink-muted">
                  –
                </span>
                <InlineDateField
                  label="End date"
                  emptyHint="Present"
                  value={item.endDate}
                  onChange={(endDate) => onChange({ ...item, endDate })}
                />
              </>
            }
          />
          <ComposerRow
            className="text-[0.875rem]"
            left={
              <>
                <InlineField
                  label="Entity"
                  placeholder="Company or client"
                  value={item.entity}
                  onChange={(entity) => onChange({ ...item, entity })}
                  className="flex-[1_1_9rem]"
                />
                <InlineField
                  label="Type"
                  placeholder="Type, e.g. Open source"
                  value={item.type}
                  onChange={(type) => onChange({ ...item, type })}
                  className="flex-[1_1_9rem]"
                />
              </>
            }
            right={
              <InlineField
                label="Project URL"
                type="url"
                tone="meta"
                align="right"
                value={item.url}
                onChange={(url) => onChange({ ...item, url })}
                className="w-56"
              />
            }
          />
          <ComposerBlock label="Description">
            <MarkdownEditor
              deferUntilFocus
              ariaLabel="Description"
              placeholder="What the project is and why it mattered."
              value={item.description ?? ''}
              onChange={(description) => onChange({ ...item, description })}
            />
          </ComposerBlock>
          <ComposerBlock label="Roles">
            <TagsInput
              variant="inline"
              label="Roles"
              placeholder="Lead developer, Designer"
              values={item.roles ?? []}
              onChange={(roles) => onChange({ ...item, roles })}
            />
          </ComposerBlock>
          <ComposerBlock label="Keywords">
            <TagsInput
              variant="inline"
              label="Keywords"
              placeholder="TypeScript, Postgres"
              values={item.keywords ?? []}
              onChange={(keywords) => onChange({ ...item, keywords })}
            />
          </ComposerBlock>
          <ComposerBlock label="Highlights" hint="One result per bullet.">
            <BulletListField
              label="Highlights"
              itemLabel="Highlight"
              placeholder="Reached 2,000 GitHub stars in the first year"
              values={item.highlights ?? []}
              onChange={(highlights) => onChange({ ...item, highlights })}
            />
          </ComposerBlock>
        </EntryComposer>
      )}
    />
  );
}
