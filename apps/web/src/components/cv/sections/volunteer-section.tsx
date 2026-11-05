'use client';

import type { ResumeVolunteer } from '@resubuild/types';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { BulletListField } from '@/components/cv/composer/bullet-list-field';
import { ComposerBlock, ComposerRow, EntryComposer } from '@/components/cv/composer/entry-composer';
import { InlineDateField } from '@/components/cv/composer/inline-date-field';
import { InlineField } from '@/components/cv/composer/inline-field';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import {
  formatDateRange,
  highlightBody,
  printedEntryView,
  trimStringList,
  validateRequiredStartDate,
} from '@/components/cv/cv-section-helpers';
import { ManagedArraySection } from '@/components/cv/managed-array-section';
import { MarkdownEditor } from '@/components/cv/markdown-editor';
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
        const { title, subtitle } = printedEntryView(
          item.organization,
          item.url,
          undefined,
          item.position,
          'Volunteer entry',
        );
        return {
          title,
          subtitle,
          meta: formatDateRange(item.startDate, item.endDate),
          body: (
            <>
              <MarkdownView value={item.summary} variant="block" />
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
                label="Organization"
                tone="title"
                value={item.organization}
                onChange={(organization) => onChange({ ...item, organization })}
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
            left={
              <InlineField
                label="Position"
                tone="subtitle"
                value={item.position}
                onChange={(position) => onChange({ ...item, position })}
              />
            }
            right={
              <InlineField
                label="Organization website"
                type="url"
                tone="meta"
                align="right"
                value={item.url}
                onChange={(url) => onChange({ ...item, url })}
                className="w-56"
              />
            }
          />
          <ComposerBlock label="Summary">
            <MarkdownEditor
              deferUntilFocus
              ariaLabel="Summary"
              placeholder="What the organization does and what you did there."
              value={item.summary ?? ''}
              onChange={(summary) => onChange({ ...item, summary })}
            />
          </ComposerBlock>
          <ComposerBlock label="Highlights" hint="One contribution per bullet.">
            <BulletListField
              label="Highlights"
              itemLabel="Highlight"
              placeholder="Taught 30 students weekly Python lessons"
              values={item.highlights ?? []}
              onChange={(highlights) => onChange({ ...item, highlights })}
            />
          </ComposerBlock>
        </EntryComposer>
      )}
    />
  );
}
