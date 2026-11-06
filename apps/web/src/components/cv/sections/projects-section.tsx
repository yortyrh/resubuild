'use client';

import type { ResumeProject } from '@resubuild/types';
import { BulletListField } from '@/components/cv/bullet-list-field';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import {
  formatDateRange,
  highlightBody,
  trimStringList,
  validateRequiredStartDate,
} from '@/components/cv/cv-section-helpers';
import { linkedEntityLabel } from '@/components/cv/external-link';
import { FieldRow, FormGroup, TextField } from '@/components/cv/form-fields';
import { IsoDateField } from '@/components/cv/iso-date-field';
import { ManagedArraySection } from '@/components/cv/managed-array-section';
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
  const { cvId } = useCvEditor();

  return (
    <ManagedArraySection<ProjectItem>
      cvId={cvId}
      sectionKey="projects"
      entityLabel="Project"
      addLabel="Add project"
      emptyText="Side projects, open source and notable work outside a single job."
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
          dates: formatDateRange(item.startDate, item.endDate),
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
        <>
          <FormGroup title="Project">
            <FieldRow>
              <TextField
                label="Name"
                value={item.name}
                onChange={(name) => onChange({ ...item, name })}
              />
              <TextField
                label="URL"
                type="url"
                placeholder="https://"
                value={item.url}
                onChange={(url) => onChange({ ...item, url })}
              />
              <TextField
                label="Entity"
                description="Company or organization behind it."
                value={item.entity}
                onChange={(entity) => onChange({ ...item, entity })}
              />
              <TextField
                label="Type"
                description="e.g. Application, Talk, Library."
                value={item.type}
                onChange={(type) => onChange({ ...item, type })}
              />
            </FieldRow>
          </FormGroup>
          <FormGroup title="Dates">
            <FieldRow>
              <IsoDateField
                label="Start date"
                required
                value={item.startDate}
                error={context?.fieldErrors.startDate}
                onChange={(startDate) => onChange({ ...item, startDate })}
              />
              <IsoDateField
                label="End date"
                value={item.endDate}
                onChange={(endDate) => onChange({ ...item, endDate })}
              />
            </FieldRow>
            <p className="text-muted-foreground -mt-2 text-xs">
              Leave the end date empty if it is ongoing.
            </p>
          </FormGroup>
          <FormGroup title="Details">
            <TextField
              label="Description"
              markdown
              value={item.description}
              onChange={(description) => onChange({ ...item, description })}
            />
            <FieldRow>
              <TagsInput
                label="Roles"
                values={item.roles ?? []}
                onChange={(roles) => onChange({ ...item, roles })}
              />
              <TagsInput
                label="Keywords"
                values={item.keywords ?? []}
                onChange={(keywords) => onChange({ ...item, keywords })}
              />
            </FieldRow>
            <BulletListField
              label="Highlights"
              itemLabel="Highlight"
              description="One achievement per line. Enter starts a new one."
              values={item.highlights ?? []}
              onChange={(highlights) => onChange({ ...item, highlights })}
            />
          </FormGroup>
        </>
      )}
    />
  );
}
