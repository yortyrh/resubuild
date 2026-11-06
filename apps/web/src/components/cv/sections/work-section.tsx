'use client';

import type { ResumeWork } from '@resubuild/types';
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
import { cvWorkApi } from '@/lib/cv-item-api';
import { removeItemById, sortDateRangeSectionItems } from '@/lib/cv-section-order';
import type { SectionItem } from '@/lib/cv-section-refetch';
import { moveWorkVolunteerEntry } from '@/lib/move-work-volunteer-entry';

type WorkItem = SectionItem<ResumeWork>;

export function WorkSection() {
  useSectionMount('work');
  const { cvId, resume, setResume } = useCvEditor();
  const queryClient = useQueryClient();
  const workItems = (resume.work ?? []) as WorkItem[];

  const handleMoveToVolunteer = useCallback(
    async (item: WorkItem) => {
      if (!item.id) {
        throw new Error('Cannot move an unsaved work entry');
      }
      await moveWorkVolunteerEntry(queryClient, cvId, 'work-to-volunteer', item, item.id);
      setResume((prev) => ({
        ...prev,
        work: removeItemById(workItems, item.id!),
      }));
    },
    [cvId, queryClient, setResume, workItems],
  );

  return (
    <ManagedArraySection<WorkItem>
      cvId={cvId}
      sectionKey="work"
      items={workItems}
      onItemsChange={(work) => setResume((prev) => ({ ...prev, work }))}
      entityLabel="Work entry"
      addLabel="Add work experience"
      createEmpty={() => ({ highlights: [] })}
      toPayload={(item) => ({
        ...(item as Record<string, unknown>),
        highlights: trimStringList(item.highlights),
      })}
      api={cvWorkApi}
      validateBeforeSave={validateRequiredStartDate}
      sortItems={sortDateRangeSectionItems}
      crossSectionMove={{
        buttonLabel: 'Move to Volunteer',
        dialogTitle: 'Move to Volunteer?',
        dialogDescription:
          'This entry will be moved to the Volunteer section. It will be removed from Work after the transfer succeeds.',
        confirmLabel: 'Move to Volunteer',
        successMessage: 'Moved to Volunteer',
        onMove: handleMoveToVolunteer,
      }}
      renderView={(item) => {
        const { title, subtitle } = positionEntityView(
          item.position,
          item.name,
          item.url,
          'Work entry',
        );
        return {
          title,
          subtitle,
          meta: (
            <div>
              <div>{formatDateRange(item.startDate, item.endDate)}</div>
              {item.location ? <div>{item.location}</div> : null}
            </div>
          ),
          body: (
            <>
              <div className="space-y-3">
                <MarkdownView value={item.summary} variant="block" />
                <MarkdownView value={item.description} variant="block" />
              </div>
              {highlightBody(item.highlights, { markdown: true })}
            </>
          ),
        };
      }}
      renderForm={(item, onChange, context) => (
        <>
          <TextField
            label="Company"
            value={item.name}
            onChange={(name) => onChange({ ...item, name })}
          />
          <TextField
            label="Position"
            value={item.position}
            onChange={(position) => onChange({ ...item, position })}
          />
          <TextField
            label="Location"
            value={item.location}
            onChange={(location) => onChange({ ...item, location })}
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
            description="2–3 sentence elevator pitch for this role."
            markdown="block"
            multiline
            value={item.summary}
            onChange={(summary) => onChange({ ...item, summary })}
          />
          <TextField
            label="Description"
            markdown="block"
            multiline
            value={item.description}
            onChange={(description) => onChange({ ...item, description })}
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
