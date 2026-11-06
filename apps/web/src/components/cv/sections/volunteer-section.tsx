'use client';

import type { ResumeVolunteer } from '@resubuild/types';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import {
  formatDateRange,
  highlightBody,
  positionEntityView,
  trimStringList,
  validateRequiredStartDate,
} from '@/components/cv/cv-section-helpers';
import { StringListField, TextField } from '@/components/cv/form-fields';
import { IsoDateField } from '@/components/cv/iso-date-field';
import { ManagedArraySection } from '@/components/cv/managed-array-section';
import { MarkdownView } from '@/components/cv/markdown-view';
import { useSectionMount } from '@/components/cv/use-section-mount';
import { cvVolunteerApi } from '@/lib/cv-item-api';
import { removeItemById, sortDateRangeSectionItems } from '@/lib/cv-section-order';
import type { SectionItem } from '@/lib/cv-section-refetch';
import { moveWorkVolunteerEntry } from '@/lib/move-work-volunteer-entry';
import type { VolunteerMoveSource } from '@/lib/work-volunteer-move';

type VolunteerItem = SectionItem<ResumeVolunteer>;

export function VolunteerSection() {
  useSectionMount('volunteer');
  const { cvId, resume, setResume } = useCvEditor();
  const queryClient = useQueryClient();
  const volunteerItems = (resume.volunteer ?? []) as VolunteerItem[];

  const handleMoveToWork = useCallback(
    async (item: VolunteerItem) => {
      if (!item.id) {
        throw new Error('Cannot move an unsaved volunteer entry');
      }
      await moveWorkVolunteerEntry(
        queryClient,
        cvId,
        'volunteer-to-work',
        item as VolunteerMoveSource,
        item.id,
      );
      setResume((prev) => ({
        ...prev,
        volunteer: removeItemById(volunteerItems, item.id!),
      }));
    },
    [cvId, queryClient, setResume, volunteerItems],
  );

  return (
    <ManagedArraySection<VolunteerItem>
      cvId={cvId}
      sectionKey="volunteer"
      items={volunteerItems}
      onItemsChange={(volunteer) => setResume((prev) => ({ ...prev, volunteer }))}
      entityLabel="Volunteer entry"
      addLabel="Add volunteer experience"
      createEmpty={() => ({ highlights: [] })}
      toPayload={(item) => ({
        ...(item as Record<string, unknown>),
        highlights: trimStringList(item.highlights),
      })}
      api={cvVolunteerApi}
      validateBeforeSave={validateRequiredStartDate}
      sortItems={sortDateRangeSectionItems}
      crossSectionMove={{
        buttonLabel: 'Move to Work',
        dialogTitle: 'Move to Work?',
        dialogDescription:
          'This entry will be moved to the Work section. It will be removed from Volunteer after the transfer succeeds.',
        confirmLabel: 'Move to Work',
        successMessage: 'Moved to Work',
        onMove: handleMoveToWork,
      }}
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
      renderForm={(item, onChange, context) => (
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
