'use client';

import type {
  Resume,
  ResumeAward,
  ResumeCertificate,
  ResumeEducation,
  ResumeInterest,
  ResumeLanguage,
  ResumeProfile,
  ResumeProject,
  ResumePublication,
  ResumeReference,
  ResumeSkill,
  ResumeVolunteer,
  ResumeWork,
} from '@resumind/types';
import type { ReactNode } from 'react';
import { CvEditorBreadcrumb } from '@/components/cv/cv-editor-breadcrumb';
import {
  ExternalLink,
  linkedEntityLabel,
  linkedEntitySubtitle,
} from '@/components/cv/external-link';
import { StringListField, TextField } from '@/components/cv/form-fields';
import { IsoDateField } from '@/components/cv/iso-date-field';
import { LanguageField } from '@/components/cv/language-field';
import { ManagedArraySection } from '@/components/cv/managed-array-section';
import { ManagedBasicsSection } from '@/components/cv/managed-basics-section';
import { MarkdownView } from '@/components/cv/markdown-view';
import {
  MetadataFieldGroup,
  MetadataLabel,
  MetadataTextField,
} from '@/components/cv/metadata-field';
import { TagsInput } from '@/components/cv/tags-input';
import { TagsList } from '@/components/cv/tags-list';
import {
  createCvProfile,
  cvAwardApi,
  cvCertificateApi,
  cvEducationApi,
  cvInterestApi,
  cvLanguageApi,
  cvProjectApi,
  cvPublicationApi,
  cvReferenceApi,
  cvSkillApi,
  cvVolunteerApi,
  cvWorkApi,
  deleteCvProfile,
  updateCvProfile,
} from '@/lib/cv-item-api';
import { CvSectionLayout } from './cv-section-layout';
import type { CvSectionSlug } from './cv-section-nav';

interface CvSectionsProps {
  cvId: string;
  version: string | undefined;
  onVersionChange: (version: string) => void;
  resume: Resume;
  onResumeChange: (resume: Resume) => void;
  activeSection: CvSectionSlug;
}

function formatDateRange(start?: string, end?: string): string {
  if (!start && !end) {
    return '';
  }
  if (!end) {
    return start ?? '';
  }
  return `${start ?? ''} – ${end}`;
}

function trimStringList(values?: string[]): string[] {
  return (values ?? []).map((value) => value.trim()).filter(Boolean);
}

export function highlightBody(values?: string[], options?: { markdown?: boolean; title?: string }) {
  if (!values?.length) {
    return null;
  }
  const useMarkdown = options?.markdown ?? false;
  const title = options?.title ?? 'Highlights';
  return (
    <div className="mt-3 space-y-2">
      <MetadataLabel>{title}</MetadataLabel>
      <ul className="list-disc space-y-1 pl-5 text-sm font-normal">
        {values.map((value, index) => (
          <li key={`${value}-${index}`}>
            {useMarkdown ? <MarkdownView value={value} variant="inline" /> : value}
          </li>
        ))}
      </ul>
    </div>
  );
}

function positionEntityView(
  position: string | undefined,
  entity: string | undefined,
  url: string | undefined,
  fallback: string,
): { title: ReactNode; subtitle?: ReactNode } {
  const linkedEntitySubtitleNode = entity ? linkedEntitySubtitle(entity, url) : null;
  const linkedEntityTitleNode = entity ? linkedEntityLabel(entity, url) : null;

  if (position) {
    return {
      title: <span>{position}</span>,
      subtitle: linkedEntitySubtitleNode ?? (entity ? <span>{entity}</span> : undefined),
    };
  }
  if (linkedEntityTitleNode) {
    return { title: <span>{linkedEntityTitleNode}</span> };
  }
  if (entity) {
    return { title: <span>{entity}</span> };
  }
  return { title: <span>{fallback}</span> };
}

export function CvSections({
  cvId,
  version,
  onVersionChange,
  resume,
  onResumeChange,
  activeSection,
}: CvSectionsProps) {
  const profileApi = {
    create: createCvProfile,
    update: updateCvProfile,
    delete: deleteCvProfile,
  };

  return (
    <CvSectionLayout cvId={cvId}>
      <div className="space-y-6">
        <CvEditorBreadcrumb cvId={cvId} basics={resume.basics} activeSection={activeSection} />
        <SectionContent
          activeSection={activeSection}
          cvId={cvId}
          version={version}
          onVersionChange={onVersionChange}
          resume={resume}
          onResumeChange={onResumeChange}
          profileApi={profileApi}
        />
      </div>
    </CvSectionLayout>
  );
}

interface SectionContentProps {
  activeSection: CvSectionSlug;
  cvId: string;
  version: string | undefined;
  onVersionChange: (version: string) => void;
  resume: Resume;
  onResumeChange: (resume: Resume) => void;
  profileApi: {
    create: typeof createCvProfile;
    update: typeof updateCvProfile;
    delete: typeof deleteCvProfile;
  };
}

function SectionContent({
  activeSection,
  cvId,
  version,
  onVersionChange,
  resume,
  onResumeChange,
  profileApi,
}: SectionContentProps) {
  switch (activeSection) {
    case 'basics':
      return (
        <div className="space-y-4">
          <ManagedBasicsSection
            cvId={cvId}
            version={version}
            onVersionChange={onVersionChange}
            basics={resume.basics ?? {}}
            onBasicsChange={(basics) => onResumeChange({ ...resume, basics })}
          />
        </div>
      );

    case 'profiles':
      return (
        <div className="space-y-4">
          <ManagedArraySection<ResumeProfile>
            cvId={cvId}
            version={version}
            onVersionChange={onVersionChange}
            items={resume.basics?.profiles ?? []}
            onItemsChange={(profiles) =>
              onResumeChange({ ...resume, basics: { ...resume.basics, profiles } })
            }
            entityLabel="Profile"
            addLabel="Add social profile"
            createEmpty={() => ({})}
            toPayload={(item) => item as Record<string, unknown>}
            api={profileApi}
            renderView={(item) => ({
              title: (
                <span>
                  {item.network || 'Network'}
                  {item.username ? ` — ${item.username}` : ''}
                </span>
              ),
              body: item.url ? (
                <p className="text-sm font-normal">
                  <ExternalLink href={item.url} />
                </p>
              ) : null,
            })}
            renderForm={(item, onChange) => (
              <>
                <TextField
                  label="Network"
                  value={item.network}
                  onChange={(network) => onChange({ ...item, network })}
                />
                <TextField
                  label="Username"
                  value={item.username}
                  onChange={(username) => onChange({ ...item, username })}
                />
                <TextField
                  label="URL"
                  type="url"
                  value={item.url}
                  onChange={(url) => onChange({ ...item, url })}
                />
              </>
            )}
          />
        </div>
      );

    case 'work':
      return (
        <ManagedArraySection<ResumeWork>
          cvId={cvId}
          version={version}
          onVersionChange={onVersionChange}
          items={resume.work ?? []}
          onItemsChange={(work) => onResumeChange({ ...resume, work })}
          entityLabel="Work entry"
          addLabel="Add work experience"
          createEmpty={() => ({ highlights: [] })}
          toPayload={(item) => ({
            ...(item as Record<string, unknown>),
            highlights: trimStringList(item.highlights),
          })}
          api={cvWorkApi}
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
          renderForm={(item, onChange) => (
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

    case 'volunteer':
      return (
        <ManagedArraySection<ResumeVolunteer>
          cvId={cvId}
          version={version}
          onVersionChange={onVersionChange}
          items={resume.volunteer ?? []}
          onItemsChange={(volunteer) => onResumeChange({ ...resume, volunteer })}
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

    case 'education':
      return (
        <ManagedArraySection<ResumeEducation>
          cvId={cvId}
          version={version}
          onVersionChange={onVersionChange}
          items={resume.education ?? []}
          onItemsChange={(education) => onResumeChange({ ...resume, education })}
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
              title: (
                <span>{linkedEntityLabel(institutionLabel, item.url) ?? institutionLabel}</span>
              ),
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

    case 'skills':
      return (
        <ManagedArraySection<ResumeSkill>
          cvId={cvId}
          version={version}
          onVersionChange={onVersionChange}
          items={resume.skills ?? []}
          onItemsChange={(skills) => onResumeChange({ ...resume, skills })}
          entityLabel="Skill"
          addLabel="Add skill"
          createEmpty={() => ({ keywords: [] })}
          toPayload={(item) => item as Record<string, unknown>}
          api={cvSkillApi}
          renderView={(item) => ({
            title: <span>{item.name || 'Skill'}</span>,
            subtitle: item.level || undefined,
            body: <TagsList values={item.keywords ?? []} />,
          })}
          renderForm={(item, onChange) => (
            <>
              <TextField
                label="Name"
                value={item.name}
                onChange={(name) => onChange({ ...item, name })}
              />
              <TextField
                label="Level"
                value={item.level}
                onChange={(level) => onChange({ ...item, level })}
              />
              <TagsInput
                label="Keywords"
                description="Press Enter to add each keyword tag."
                values={item.keywords ?? []}
                onChange={(keywords) => onChange({ ...item, keywords })}
              />
            </>
          )}
        />
      );

    case 'projects':
      return (
        <ManagedArraySection<ResumeProject>
          cvId={cvId}
          version={version}
          onVersionChange={onVersionChange}
          items={resume.projects ?? []}
          onItemsChange={(projects) => onResumeChange({ ...resume, projects })}
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

    case 'awards':
      return (
        <ManagedArraySection<ResumeAward>
          cvId={cvId}
          version={version}
          onVersionChange={onVersionChange}
          items={resume.awards ?? []}
          onItemsChange={(awards) => onResumeChange({ ...resume, awards })}
          entityLabel="Award"
          addLabel="Add award"
          createEmpty={() => ({})}
          toPayload={(item) => item as Record<string, unknown>}
          api={cvAwardApi}
          renderView={(item) => ({
            title: <span>{item.title || 'Award'}</span>,
            subtitle: item.awarder || undefined,
            meta: item.date ? <div>{item.date}</div> : undefined,
            body: <MarkdownView value={item.summary} variant="block" />,
          })}
          renderForm={(item, onChange) => (
            <>
              <TextField
                label="Title"
                value={item.title}
                onChange={(title) => onChange({ ...item, title })}
              />
              <IsoDateField
                label="Date"
                value={item.date}
                onChange={(date) => onChange({ ...item, date })}
              />
              <TextField
                label="Awarder"
                value={item.awarder}
                onChange={(awarder) => onChange({ ...item, awarder })}
              />
              <TextField
                label="Summary"
                markdown="block"
                multiline
                value={item.summary}
                onChange={(summary) => onChange({ ...item, summary })}
              />
            </>
          )}
        />
      );

    case 'certificates':
      return (
        <ManagedArraySection<ResumeCertificate>
          cvId={cvId}
          version={version}
          onVersionChange={onVersionChange}
          items={resume.certificates ?? []}
          onItemsChange={(certificates) => onResumeChange({ ...resume, certificates })}
          entityLabel="Certificate"
          addLabel="Add certificate"
          createEmpty={() => ({})}
          toPayload={(item) => item as Record<string, unknown>}
          api={cvCertificateApi}
          renderView={(item) => {
            const certificateLabel = item.name || 'Certificate';
            return {
              title: (
                <span>{linkedEntityLabel(certificateLabel, item.url) ?? certificateLabel}</span>
              ),
              meta: item.date ? <div>{item.date}</div> : undefined,
              body: item.issuer ? <p className="text-sm font-normal">{item.issuer}</p> : null,
            };
          }}
          renderForm={(item, onChange) => (
            <>
              <TextField
                label="Name"
                value={item.name}
                onChange={(name) => onChange({ ...item, name })}
              />
              <IsoDateField
                label="Date"
                value={item.date}
                onChange={(date) => onChange({ ...item, date })}
              />
              <TextField
                label="Issuer"
                value={item.issuer}
                onChange={(issuer) => onChange({ ...item, issuer })}
              />
              <TextField
                label="URL"
                type="url"
                value={item.url}
                onChange={(url) => onChange({ ...item, url })}
              />
            </>
          )}
        />
      );

    case 'publications':
      return (
        <ManagedArraySection<ResumePublication>
          cvId={cvId}
          version={version}
          onVersionChange={onVersionChange}
          items={resume.publications ?? []}
          onItemsChange={(publications) => onResumeChange({ ...resume, publications })}
          entityLabel="Publication"
          addLabel="Add publication"
          createEmpty={() => ({})}
          toPayload={(item) => item as Record<string, unknown>}
          api={cvPublicationApi}
          renderView={(item) => {
            const publicationLabel = item.name || 'Publication';
            return {
              title: (
                <span>{linkedEntityLabel(publicationLabel, item.url) ?? publicationLabel}</span>
              ),
              subtitle: item.publisher || undefined,
              meta: item.releaseDate ? <div>{item.releaseDate}</div> : undefined,
              body: <MarkdownView value={item.summary} variant="block" />,
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
                label="Publisher"
                value={item.publisher}
                onChange={(publisher) => onChange({ ...item, publisher })}
              />
              <IsoDateField
                label="Release date"
                value={item.releaseDate}
                onChange={(releaseDate) => onChange({ ...item, releaseDate })}
              />
              <TextField
                label="URL"
                type="url"
                value={item.url}
                onChange={(url) => onChange({ ...item, url })}
              />
              <TextField
                label="Summary"
                markdown="block"
                multiline
                value={item.summary}
                onChange={(summary) => onChange({ ...item, summary })}
              />
            </>
          )}
        />
      );

    case 'languages':
      return (
        <ManagedArraySection<ResumeLanguage>
          cvId={cvId}
          version={version}
          onVersionChange={onVersionChange}
          items={resume.languages ?? []}
          onItemsChange={(languages) => onResumeChange({ ...resume, languages })}
          entityLabel="Language"
          addLabel="Add language"
          createEmpty={() => ({})}
          toPayload={(item) => item as Record<string, unknown>}
          api={cvLanguageApi}
          renderView={(item) => ({
            title: <span>{item.language || 'Language'}</span>,
            subtitle: item.fluency || undefined,
          })}
          renderForm={(item, onChange) => (
            <>
              <LanguageField
                label="Language"
                value={item.language}
                onChange={(language) => onChange({ ...item, language })}
              />
              <TextField
                label="Fluency"
                value={item.fluency}
                onChange={(fluency) => onChange({ ...item, fluency })}
              />
            </>
          )}
        />
      );

    case 'interests':
      return (
        <ManagedArraySection<ResumeInterest>
          cvId={cvId}
          version={version}
          onVersionChange={onVersionChange}
          items={resume.interests ?? []}
          onItemsChange={(interests) => onResumeChange({ ...resume, interests })}
          entityLabel="Interest"
          addLabel="Add interest"
          createEmpty={() => ({ keywords: [] })}
          toPayload={(item) => item as Record<string, unknown>}
          api={cvInterestApi}
          renderView={(item) => ({
            title: <span>{item.name || 'Interest'}</span>,
            body: <TagsList label="Keywords" values={item.keywords ?? []} />,
          })}
          renderForm={(item, onChange) => (
            <>
              <TextField
                label="Name"
                value={item.name}
                onChange={(name) => onChange({ ...item, name })}
              />
              <TagsInput
                label="Keywords"
                values={item.keywords ?? []}
                onChange={(keywords) => onChange({ ...item, keywords })}
              />
            </>
          )}
        />
      );

    case 'references':
      return (
        <ManagedArraySection<ResumeReference>
          cvId={cvId}
          version={version}
          onVersionChange={onVersionChange}
          items={resume.references ?? []}
          onItemsChange={(references) => onResumeChange({ ...resume, references })}
          entityLabel="Reference"
          addLabel="Add reference"
          createEmpty={() => ({})}
          toPayload={(item) => item as Record<string, unknown>}
          api={cvReferenceApi}
          renderView={(item) => ({
            title: <span>{item.name || 'Reference'}</span>,
            body: <MarkdownView value={item.reference} variant="block" />,
          })}
          renderForm={(item, onChange) => (
            <>
              <TextField
                label="Name"
                description="Reference full name."
                value={item.name}
                onChange={(name) => onChange({ ...item, name })}
              />
              <TextField
                label="Reference"
                markdown="block"
                multiline
                description="Recommendation text."
                value={item.reference}
                onChange={(reference) => onChange({ ...item, reference })}
              />
            </>
          )}
        />
      );

    default: {
      const _exhaustive: never = activeSection;
      return null;
    }
  }
}
