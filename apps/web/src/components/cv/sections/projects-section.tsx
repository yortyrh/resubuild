'use client';

import type { ResumeProject } from '@resumind/types';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import { formatDateRange, highlightBody, trimStringList } from '@/components/cv/cv-section-helpers';
import { linkedEntityLabel } from '@/components/cv/external-link';
import { StringListField, TextField } from '@/components/cv/form-fields';
import { IsoDateField } from '@/components/cv/iso-date-field';
import { ManagedArraySection } from '@/components/cv/managed-array-section';
import { MarkdownView } from '@/components/cv/markdown-view';
import { MetadataFieldGroup, MetadataTextField } from '@/components/cv/metadata-field';
import { TagsInput } from '@/components/cv/tags-input';
import { TagsList } from '@/components/cv/tags-list';
import { useSectionMount } from '@/components/cv/use-section-mount';
import { getCvProjects } from '@/lib/api';
import { cvProjectApi } from '@/lib/cv-item-api';
import { createSectionRefetch, type SectionItem } from '@/lib/cv-section-refetch';

type ProjectItem = SectionItem<ResumeProject>;

export function ProjectsSection() {
  useSectionMount('projects');
  const { cvId, resume, setResume } = useCvEditor();

  return (
    <ManagedArraySection<ProjectItem>
      cvId={cvId}
      items={resume.projects ?? []}
      onItemsChange={(projects) => setResume((prev) => ({ ...prev, projects }))}
      refetchItems={createSectionRefetch<ProjectItem>(getCvProjects, cvId)}
      entityLabel="Project"
      addLabel="Add project"
      createEmpty={() => ({ highlights: [], keywords: [], roles: [] })}
      toPayload={(item) => ({
        ...(item as Record<string, unknown>),
        highlights: trimStringList(item.highlights),
      })}
      api={cvProjectApi}
      renderView={(item) => {
        const projectLabel = item.name || 'Project';
        return {
          title: <span>{linkedEntityLabel(projectLabel, item.url) ?? projectLabel}</span>,
          meta: <div>{formatDateRange(item.startDate, item.endDate)}</div>,
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
      renderForm={(item, onChange) => (
        <>
          <TextField
            label="Name"
            value={item.name}
            onChange={(name) => onChange({ ...item, name })}
          />
          <TextField
            label="Description"
            markdown="block"
            multiline
            value={item.description}
            onChange={(description) => onChange({ ...item, description })}
          />
          <TextField
            label="URL"
            type="url"
            value={item.url}
            onChange={(url) => onChange({ ...item, url })}
          />
          <TextField
            label="Entity"
            value={item.entity}
            onChange={(entity) => onChange({ ...item, entity })}
          />
          <TextField
            label="Type"
            value={item.type}
            onChange={(type) => onChange({ ...item, type })}
          />
          <IsoDateField
            label="Start date"
            value={item.startDate}
            onChange={(startDate) => onChange({ ...item, startDate })}
          />
          <IsoDateField
            label="End date"
            value={item.endDate}
            onChange={(endDate) => onChange({ ...item, endDate })}
          />
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
          <StringListField
            label="Highlights"
            description="Quantifiable achievement bullets saved with this entry on Save."
            markdown
            values={item.highlights ?? []}
            onChange={(highlights) => onChange({ ...item, highlights })}
          />
        </>
      )}
    />
  );
}
