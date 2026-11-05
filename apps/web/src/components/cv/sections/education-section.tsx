'use client';

import type { ResumeEducation } from '@resubuild/types';
import { BulletListField } from '@/components/cv/composer/bullet-list-field';
import {
  ComposerBlock,
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
  trimStringList,
  validateRequiredStartDate,
} from '@/components/cv/cv-section-helpers';
import { linkedEntityLabel } from '@/components/cv/external-link';
import { ManagedArraySection } from '@/components/cv/managed-array-section';
import { useSectionMount } from '@/components/cv/use-section-mount';
import { cvEducationApi } from '@/lib/cv-item-api';
import { sortDateRangeSectionItems } from '@/lib/cv-section-order';
import type { SectionItem } from '@/lib/cv-section-refetch';

type EducationItem = SectionItem<ResumeEducation>;

export function EducationSection() {
  useSectionMount('education');
  const { cvId, resume, setResume } = useCvEditor();

  return (
    <ManagedArraySection<EducationItem>
      cvId={cvId}
      sectionKey="education"
      items={resume.education ?? []}
      onItemsChange={(education) => setResume((prev) => ({ ...prev, education }))}
      entityLabel="Education entry"
      addLabel="Add education"
      createEmpty={() => ({ courses: [] })}
      toPayload={(item) => ({
        ...(item as Record<string, unknown>),
        courses: trimStringList(item.courses),
      })}
      api={cvEducationApi}
      validateBeforeSave={validateRequiredStartDate}
      sortItems={sortDateRangeSectionItems}
      renderView={(item) => {
        const institutionLabel = item.institution || 'Education entry';
        const subtitle = [item.studyType, item.area].filter(Boolean).join(', ');
        return {
          title: <span>{linkedEntityLabel(institutionLabel, item.url) ?? institutionLabel}</span>,
          subtitle: subtitle ? (
            <span className="font-bold not-italic">
              {subtitle}
              {item.score ? <span className="font-normal">, {item.score}</span> : null}
            </span>
          ) : undefined,
          meta: formatDateRange(item.startDate, item.endDate),
          body: highlightBody(item.courses, { title: 'Courses' }),
        };
      }}
      renderForm={(item, onChange, context) => (
        <EntryComposer>
          <ComposerRow
            left={
              <InlineField
                label="Institution"
                tone="title"
                value={item.institution}
                onChange={(institution) => onChange({ ...item, institution })}
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
              <>
                <InlineField
                  label="Study type"
                  tone="title"
                  placeholder="Degree, e.g. Bachelor of Science"
                  value={item.studyType}
                  onChange={(studyType) => onChange({ ...item, studyType })}
                  fit
                />
                <ComposerSeparator show={Boolean(item.studyType && item.area)} />
                <InlineField
                  label="Area"
                  tone="title"
                  placeholder="Area, e.g. Computer Science"
                  value={item.area}
                  onChange={(area) => onChange({ ...item, area })}
                  fit
                />
              </>
            }
            right={
              <InlineField
                label="Score"
                tone="meta"
                align="right"
                placeholder="Score, e.g. 3.8 GPA"
                value={item.score}
                onChange={(score) => onChange({ ...item, score })}
                className="w-40"
              />
            }
          />
          <InlineField
            label="Institution website"
            type="url"
            tone="meta"
            value={item.url}
            onChange={(url) => onChange({ ...item, url })}
          />
          <ComposerBlock label="Courses" hint="One course per bullet.">
            <BulletListField
              label="Courses"
              itemLabel="Course"
              placeholder="Distributed Systems"
              values={item.courses ?? []}
              onChange={(courses) => onChange({ ...item, courses })}
            />
          </ComposerBlock>
        </EntryComposer>
      )}
    />
  );
}
