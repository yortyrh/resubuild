'use client';

import type { ResumeVolunteer } from '@resubuild/types';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { BulletListField } from '@/components/cv/bullet-list-field';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import {
  formatDateRange,
  highlightBody,
  positionEntityView,
  trimStringList,
  validateRequiredStartDate,
} from '@/components/cv/cv-section-helpers';
import { FieldRow, FormGroup, TextField } from '@/components/cv/form-fields';
import { IsoDateField } from '@/components/cv/iso-date-field';
import { ManagedArraySection } from '@/components/cv/managed-array-section';
import { MarkdownView } from '@/components/cv/markdown-view';
import { useSectionMount } from '@/components/cv/use-section-mount';
import { cvVolunteerApi } from '@/lib/cv-item-api';
import { sortDateRangeSectionItems } from '@/lib/cv-section-order';
import type { SectionItem } from '@/lib/cv-section-refetch';
import { moveWorkVolunteerEntry } from '@/lib/move-work-volunteer-entry';
import type { VolunteerMoveSource } from '@/lib/work-volunteer-move';

type VolunteerItem = SectionItem<ResumeVolunteer>;

export function VolunteerSection() {
  useSectionMount('volunteer');
  const { cvId } = useCvEditor();
  const queryClient = useQueryClient();

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
    },
    [cvId, queryClient],
  );

  return (
    <ManagedArraySection<VolunteerItem>
      cvId={cvId}
      sectionKey="volunteer"
      entityLabel="Volunteer entry"
      addLabel="Add volunteer experience"
      emptyText="Unpaid roles, community work and open-source stewardship."
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
          dates: formatDateRange(item.startDate, item.endDate),
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
          <FormGroup title="Role">
            <FieldRow>
              <TextField
                label="Position"
                value={item.position}
                onChange={(position) => onChange({ ...item, position })}
              />
              <TextField
                label="Organization"
                value={item.organization}
                onChange={(organization) => onChange({ ...item, organization })}
              />
            </FieldRow>
            <TextField
              label="URL"
              type="url"
              placeholder="https://"
              value={item.url}
              onChange={(url) => onChange({ ...item, url })}
            />
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
              label="Summary"
              markdown
              value={item.summary}
              onChange={(summary) => onChange({ ...item, summary })}
            />
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
