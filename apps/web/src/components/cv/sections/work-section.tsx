'use client';

import type { ResumeWork } from '@resubuild/types';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { BulletListField } from '@/components/cv/composer/bullet-list-field';
import {
  ComposerBlock,
  ComposerExtra,
  ComposerRow,
  ComposerSeparator,
  EntryComposer,
} from '@/components/cv/composer/entry-composer';
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
        const { title, subtitle } = printedEntryView(
          item.name,
          item.url,
          item.location,
          item.position,
          'Work entry',
        );
        return {
          title,
          subtitle,
          meta: formatDateRange(item.startDate, item.endDate),
          body: (
            <>
              <MarkdownView value={item.summary} variant="block" />
              {highlightBody(item.highlights, { markdown: true })}
              {item.description?.trim() ? (
                <div className="border-page-rule text-page-ink-muted mt-2 border-l-2 pl-3">
                  <p className="font-sans text-xs font-medium">Description, not printed</p>
                  <MarkdownView value={item.description} variant="block" />
                </div>
              ) : null}
            </>
          ),
        };
      }}
      renderForm={(item, onChange, context) => (
        <EntryComposer>
          <ComposerRow
            left={
              <>
                <InlineField
                  label="Company"
                  tone="title"
                  value={item.name}
                  onChange={(name) => onChange({ ...item, name })}
                  fit
                />
                <ComposerSeparator show={Boolean(item.name && item.location)} />
                <InlineField
                  label="Location"
                  value={item.location}
                  onChange={(location) => onChange({ ...item, location })}
                  fit
                />
              </>
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
                label="Company website"
                type="url"
                tone="meta"
                align="right"
                value={item.url}
                onChange={(url) => onChange({ ...item, url })}
                className="w-56"
              />
            }
          />
          <ComposerBlock label="Summary" hint="Two or three sentences about the role.">
            <MarkdownEditor
              deferUntilFocus
              ariaLabel="Summary"
              placeholder="What the role was and what you owned."
              value={item.summary ?? ''}
              onChange={(summary) => onChange({ ...item, summary })}
            />
          </ComposerBlock>
          <ComposerBlock label="Highlights" hint="One achievement per bullet.">
            <BulletListField
              label="Highlights"
              itemLabel="Highlight"
              placeholder="Cut checkout latency by 40% by moving pricing to the edge"
              values={item.highlights ?? []}
              onChange={(highlights) => onChange({ ...item, highlights })}
            />
          </ComposerBlock>
          <ComposerExtra
            label="Description"
            hint="Kept with the entry, not printed by the template."
            defaultOpen={Boolean(item.description?.trim())}
          >
            <MarkdownEditor
              deferUntilFocus
              ariaLabel="Description"
              placeholder="Context about the company or team."
              value={item.description ?? ''}
              onChange={(description) => onChange({ ...item, description })}
            />
          </ComposerExtra>
        </EntryComposer>
      )}
    />
  );
}
