'use client';

import type { ResumeEducation } from '@resumind/types';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import { formatDateRange, highlightBody, trimStringList } from '@/components/cv/cv-section-helpers';
import { linkedEntityLabel } from '@/components/cv/external-link';
import { StringListField, TextField } from '@/components/cv/form-fields';
import { IsoDateField } from '@/components/cv/iso-date-field';
import { ManagedArraySection } from '@/components/cv/managed-array-section';
import { useSectionMount } from '@/components/cv/use-section-mount';
import { cvEducationApi } from '@/lib/cv-item-api';

export function EducationSection() {
  useSectionMount('education');
  const { cvId, resume, version, setResume, setVersion } = useCvEditor();

  return (
    <ManagedArraySection<ResumeEducation>
      cvId={cvId}
      version={version}
      onVersionChange={setVersion}
      items={resume.education ?? []}
      onItemsChange={(education) => setResume({ ...resume, education })}
      entityLabel="Education entry"
      addLabel="Add education"
      createEmpty={() => ({ courses: [] })}
      toPayload={(item) => ({
        ...(item as Record<string, unknown>),
        courses: trimStringList(item.courses),
      })}
      api={cvEducationApi}
      renderView={(item) => {
        const institutionLabel = item.institution || 'Education entry';
        const subtitle = [item.studyType, item.area].filter(Boolean).join(' — ');
        return {
          title: <span>{linkedEntityLabel(institutionLabel, item.url) ?? institutionLabel}</span>,
          subtitle: subtitle || undefined,
          meta: (
            <div>
              <div>{formatDateRange(item.startDate, item.endDate)}</div>
              {item.score ? <div>Score: {item.score}</div> : null}
            </div>
          ),
          body: highlightBody(item.courses, { title: 'Courses' }),
        };
      }}
      renderForm={(item, onChange) => (
        <>
          <TextField
            label="Institution"
            value={item.institution}
            onChange={(institution) => onChange({ ...item, institution })}
          />
          <TextField
            label="Area"
            description='e.g. "Computer Science".'
            value={item.area}
            onChange={(area) => onChange({ ...item, area })}
          />
          <TextField
            label="Study type"
            description='e.g. "Bachelor".'
            value={item.studyType}
            onChange={(studyType) => onChange({ ...item, studyType })}
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
            label="Score"
            value={item.score}
            onChange={(score) => onChange({ ...item, score })}
          />
          <StringListField
            label="Courses"
            description="Notable courses saved with this entry on Save."
            values={item.courses ?? []}
            onChange={(courses) => onChange({ ...item, courses })}
          />
        </>
      )}
    />
  );
}
