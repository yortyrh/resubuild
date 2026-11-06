'use client';

import type { ResumeEducation } from '@resubuild/types';
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
import { useSectionMount } from '@/components/cv/use-section-mount';
import { cvEducationApi } from '@/lib/cv-item-api';
import { sortDateRangeSectionItems } from '@/lib/cv-section-order';
import type { SectionItem } from '@/lib/cv-section-refetch';

type EducationItem = SectionItem<ResumeEducation>;

export function EducationSection() {
  useSectionMount('education');
  const { cvId } = useCvEditor();

  return (
    <ManagedArraySection<EducationItem>
      cvId={cvId}
      sectionKey="education"
      entityLabel="Education entry"
      addLabel="Add education"
      emptyText="Degrees, diplomas and programs, newest first."
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
          subtitle: subtitle || undefined,
          dates: formatDateRange(item.startDate, item.endDate),
          meta: item.score ? `Score: ${item.score}` : undefined,
          body: highlightBody(item.courses, { title: 'Courses', markdown: true }),
        };
      }}
      renderForm={(item, onChange, context) => (
        <>
          <FormGroup title="Program">
            <TextField
              label="Institution"
              value={item.institution}
              onChange={(institution) => onChange({ ...item, institution })}
            />
            <FieldRow>
              <TextField
                label="Study type"
                placeholder="Bachelor"
                value={item.studyType}
                onChange={(studyType) => onChange({ ...item, studyType })}
              />
              <TextField
                label="Area"
                placeholder="Computer Science"
                value={item.area}
                onChange={(area) => onChange({ ...item, area })}
              />
              <TextField
                label="Score"
                placeholder="3.9 GPA"
                value={item.score}
                onChange={(score) => onChange({ ...item, score })}
              />
              <TextField
                label="URL"
                type="url"
                placeholder="https://"
                value={item.url}
                onChange={(url) => onChange({ ...item, url })}
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
              Leave the end date empty if you are still enrolled.
            </p>
          </FormGroup>
          <FormGroup title="Courses">
            <BulletListField
              label="Courses"
              itemLabel="Course"
              description="Notable courses, one per line."
              values={item.courses ?? []}
              onChange={(courses) => onChange({ ...item, courses })}
            />
          </FormGroup>
        </>
      )}
    />
  );
}
