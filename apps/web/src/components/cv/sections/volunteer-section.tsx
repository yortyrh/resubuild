'use client';

import type { ResumeVolunteer } from '@resumind/types';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import {
  formatDateRange,
  highlightBody,
  positionEntityView,
  trimStringList,
} from '@/components/cv/cv-section-helpers';
import { StringListField, TextField } from '@/components/cv/form-fields';
import { IsoDateField } from '@/components/cv/iso-date-field';
import { ManagedArraySection } from '@/components/cv/managed-array-section';
import { MarkdownView } from '@/components/cv/markdown-view';
import { useSectionMount } from '@/components/cv/use-section-mount';
import { cvVolunteerApi } from '@/lib/cv-item-api';

export function VolunteerSection() {
  useSectionMount('volunteer');
  const { cvId, resume, version, setResume, setVersion } = useCvEditor();

  return (
    <ManagedArraySection<ResumeVolunteer>
      cvId={cvId}
      version={version}
      onVersionChange={setVersion}
      items={resume.volunteer ?? []}
      onItemsChange={(volunteer) => setResume({ ...resume, volunteer })}
      entityLabel="Volunteer entry"
      addLabel="Add volunteer experience"
      createEmpty={() => ({ highlights: [] })}
      toPayload={(item) => ({
        ...(item as Record<string, unknown>),
        highlights: trimStringList(item.highlights),
      })}
      api={cvVolunteerApi}
      renderView={(item) => {
        const { title, subtitle } = positionEntityView(
          item.position,
          item.organization,
          item.url,
          'Volunteer entry',
        );
        return {
          title,
          subtitle,
          meta: <div>{formatDateRange(item.startDate, item.endDate)}</div>,
          body: (
            <>
              <MarkdownView value={item.summary} variant="block" />
              {highlightBody(item.highlights, { markdown: true })}
            </>
          ),
        };
      }}
      renderForm={(item, onChange) => (
        <>
          <TextField
            label="Organization"
            value={item.organization}
            onChange={(organization) => onChange({ ...item, organization })}
          />
          <TextField
            label="Position"
            value={item.position}
            onChange={(position) => onChange({ ...item, position })}
          />
          <TextField
            label="URL"
            type="url"
            value={item.url}
            onChange={(url) => onChange({ ...item, url })}
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
          <TextField
            label="Summary"
            markdown="block"
            multiline
            value={item.summary}
            onChange={(summary) => onChange({ ...item, summary })}
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
