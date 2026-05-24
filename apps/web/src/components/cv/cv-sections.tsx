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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TextField } from '@/components/cv/form-fields';
import { IsoDateField } from '@/components/cv/iso-date-field';
import { TagsInput } from '@/components/cv/tags-input';
import { ManagedArraySection } from '@/components/cv/managed-array-section';
import { ManagedBasicsSection } from '@/components/cv/managed-basics-section';
import { ManagedNestedStrings } from '@/components/cv/managed-nested-strings';
import {
  createCvProfile,
  cvAwardApi,
  cvCertificateApi,
  cvEducationApi,
  cvEducationCourseApi,
  cvInterestApi,
  cvLanguageApi,
  cvProjectApi,
  cvProjectHighlightApi,
  cvPublicationApi,
  cvReferenceApi,
  cvSkillApi,
  cvVolunteerApi,
  cvVolunteerHighlightApi,
  cvWorkApi,
  cvWorkHighlightApi,
  deleteCvProfile,
  updateCvProfile,
} from '@/lib/cv-item-api';

interface CvSectionsProps {
  cvId: string;
  version: string | undefined;
  onVersionChange: (version: string) => void;
  resume: Resume;
  onResumeChange: (resume: Resume) => void;
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

function highlightBody(values?: string[]) {
  if (!values?.length) {
    return null;
  }
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm font-normal">
      {values.map((value, index) => (
        <li key={`${value}-${index}`}>{value}</li>
      ))}
    </ul>
  );
}

export function CvSections({
  cvId,
  version,
  onVersionChange,
  resume,
  onResumeChange,
}: CvSectionsProps) {
  const profileApi = {
    create: createCvProfile,
    update: updateCvProfile,
    delete: deleteCvProfile,
  };

  return (
    <Tabs defaultValue="basics" className="w-full">
      <TabsList className="h-auto max-w-full flex-wrap justify-start gap-1">
        <TabsTrigger value="basics">Basics</TabsTrigger>
        <TabsTrigger value="profiles">Social profiles</TabsTrigger>
        <TabsTrigger value="work">Work</TabsTrigger>
        <TabsTrigger value="volunteer">Volunteer</TabsTrigger>
        <TabsTrigger value="education">Education</TabsTrigger>
        <TabsTrigger value="skills">Skills</TabsTrigger>
        <TabsTrigger value="projects">Projects</TabsTrigger>
        <TabsTrigger value="awards">Awards</TabsTrigger>
        <TabsTrigger value="certificates">Certificates</TabsTrigger>
        <TabsTrigger value="publications">Publications</TabsTrigger>
        <TabsTrigger value="languages">Languages</TabsTrigger>
        <TabsTrigger value="interests">Interests</TabsTrigger>
        <TabsTrigger value="references">References</TabsTrigger>
      </TabsList>

      <TabsContent value="basics" className="space-y-4">
        <ManagedBasicsSection
          cvId={cvId}
          version={version}
          onVersionChange={onVersionChange}
          basics={resume.basics ?? {}}
          onBasicsChange={(basics) => onResumeChange({ ...resume, basics })}
        />
      </TabsContent>

      <TabsContent value="profiles" className="space-y-4">
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
            body: item.url ? <p className="text-sm font-normal">{item.url}</p> : null,
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
      </TabsContent>

      <TabsContent value="work">
        <ManagedArraySection<ResumeWork>
          cvId={cvId}
          version={version}
          onVersionChange={onVersionChange}
          items={resume.work ?? []}
          onItemsChange={(work) => onResumeChange({ ...resume, work })}
          entityLabel="Work entry"
          addLabel="Add work experience"
          createEmpty={() => ({ highlights: [] })}
          toPayload={(item) => item as Record<string, unknown>}
          api={cvWorkApi}
          renderView={(item) => ({
            title: (
              <span>{[item.position, item.name].filter(Boolean).join(', ') || 'Work entry'}</span>
            ),
            meta: (
              <div>
                <div>{formatDateRange(item.startDate, item.endDate)}</div>
                {item.location ? <div>{item.location}</div> : null}
              </div>
            ),
            body: (
              <>
                {item.summary ? <p className="text-sm font-normal">{item.summary}</p> : null}
                {highlightBody(item.highlights)}
              </>
            ),
          })}
          renderAfterView={(item, index, onItemChange) => (
            <ManagedNestedStrings
              cvId={cvId}
              version={version}
              onVersionChange={onVersionChange}
              parentIndex={index}
              values={item.highlights ?? []}
              onValuesChange={(highlights) => onItemChange({ ...item, highlights })}
              label="Highlight"
              addLabel="Add highlight"
              api={cvWorkHighlightApi}
              markdown
            />
          )}
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
            </>
          )}
        />
      </TabsContent>

      <TabsContent value="volunteer">
        <ManagedArraySection<ResumeVolunteer>
          cvId={cvId}
          version={version}
          onVersionChange={onVersionChange}
          items={resume.volunteer ?? []}
          onItemsChange={(volunteer) => onResumeChange({ ...resume, volunteer })}
          entityLabel="Volunteer entry"
          addLabel="Add volunteer experience"
          createEmpty={() => ({ highlights: [] })}
          toPayload={(item) => item as Record<string, unknown>}
          api={cvVolunteerApi}
          renderView={(item) => ({
            title: (
              <span>
                {[item.position, item.organization].filter(Boolean).join(', ') || 'Volunteer entry'}
              </span>
            ),
            meta: <div>{formatDateRange(item.startDate, item.endDate)}</div>,
            body: (
              <>
                {item.summary ? <p className="text-sm font-normal">{item.summary}</p> : null}
                {highlightBody(item.highlights)}
              </>
            ),
          })}
          renderAfterView={(item, index, onItemChange) => (
            <ManagedNestedStrings
              cvId={cvId}
              version={version}
              onVersionChange={onVersionChange}
              parentIndex={index}
              values={item.highlights ?? []}
              onValuesChange={(highlights) => onItemChange({ ...item, highlights })}
              label="Highlight"
              addLabel="Add highlight"
              api={cvVolunteerHighlightApi}
              markdown
            />
          )}
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
            </>
          )}
        />
      </TabsContent>

      <TabsContent value="education">
        <ManagedArraySection<ResumeEducation>
          cvId={cvId}
          version={version}
          onVersionChange={onVersionChange}
          items={resume.education ?? []}
          onItemsChange={(education) => onResumeChange({ ...resume, education })}
          entityLabel="Education entry"
          addLabel="Add education"
          createEmpty={() => ({ courses: [] })}
          toPayload={(item) => item as Record<string, unknown>}
          api={cvEducationApi}
          renderView={(item) => ({
            title: <span>{item.institution || 'Education entry'}</span>,
            meta: (
              <div>
                <div>{formatDateRange(item.startDate, item.endDate)}</div>
                {[item.studyType, item.area].filter(Boolean).join(' — ') ? (
                  <div>{[item.studyType, item.area].filter(Boolean).join(' — ')}</div>
                ) : null}
              </div>
            ),
            body: highlightBody(item.courses),
          })}
          renderAfterView={(item, index, onItemChange) => (
            <ManagedNestedStrings
              cvId={cvId}
              version={version}
              onVersionChange={onVersionChange}
              parentIndex={index}
              values={item.courses ?? []}
              onValuesChange={(courses) => onItemChange({ ...item, courses })}
              label="Course"
              addLabel="Add course"
              api={cvEducationCourseApi}
            />
          )}
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
            </>
          )}
        />
      </TabsContent>

      <TabsContent value="skills">
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
            title: (
              <span>
                {item.name || 'Skill'}
                {item.level ? `: ${item.level}` : ''}
              </span>
            ),
            body: item.keywords?.length ? (
              <p className="text-sm font-normal">{item.keywords.join(', ')}</p>
            ) : null,
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
      </TabsContent>

      <TabsContent value="projects">
        <ManagedArraySection<ResumeProject>
          cvId={cvId}
          version={version}
          onVersionChange={onVersionChange}
          items={resume.projects ?? []}
          onItemsChange={(projects) => onResumeChange({ ...resume, projects })}
          entityLabel="Project"
          addLabel="Add project"
          createEmpty={() => ({ highlights: [], keywords: [], roles: [] })}
          toPayload={(item) => item as Record<string, unknown>}
          api={cvProjectApi}
          renderView={(item) => ({
            title: <span>{item.name || 'Project'}</span>,
            meta: <div>{formatDateRange(item.startDate, item.endDate)}</div>,
            body: (
              <>
                {item.description ? (
                  <p className="text-sm font-normal">{item.description}</p>
                ) : null}
                {item.roles?.length ? (
                  <p className="text-sm font-normal">Roles: {item.roles.join(', ')}</p>
                ) : null}
                {item.keywords?.length ? (
                  <p className="text-sm font-normal">Keywords: {item.keywords.join(', ')}</p>
                ) : null}
                {highlightBody(item.highlights)}
              </>
            ),
          })}
          renderAfterView={(item, index, onItemChange) => (
            <ManagedNestedStrings
              cvId={cvId}
              version={version}
              onVersionChange={onVersionChange}
              parentIndex={index}
              values={item.highlights ?? []}
              onValuesChange={(highlights) => onItemChange({ ...item, highlights })}
              label="Highlight"
              addLabel="Add highlight"
              api={cvProjectHighlightApi}
              markdown
            />
          )}
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
            </>
          )}
        />
      </TabsContent>

      <TabsContent value="awards">
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
            meta: item.date ? <div>{item.date}</div> : undefined,
            body: item.summary ? <p className="text-sm font-normal">{item.summary}</p> : null,
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
      </TabsContent>

      <TabsContent value="certificates">
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
          renderView={(item) => ({
            title: <span>{item.name || 'Certificate'}</span>,
            meta: item.date ? <div>{item.date}</div> : undefined,
            body: item.issuer ? <p className="text-sm font-normal">{item.issuer}</p> : null,
          })}
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
      </TabsContent>

      <TabsContent value="publications">
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
          renderView={(item) => ({
            title: <span>{item.name || 'Publication'}</span>,
            meta: item.releaseDate ? <div>{item.releaseDate}</div> : undefined,
            body: item.publisher ? <p className="text-sm font-normal">{item.publisher}</p> : null,
          })}
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
      </TabsContent>

      <TabsContent value="languages">
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
            meta: item.fluency ? <div>{item.fluency}</div> : undefined,
          })}
          renderForm={(item, onChange) => (
            <>
              <TextField
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
      </TabsContent>

      <TabsContent value="interests">
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
            body: item.keywords?.length ? (
              <p className="text-sm font-normal">{item.keywords.join(', ')}</p>
            ) : null,
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
      </TabsContent>

      <TabsContent value="references">
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
            body: item.reference ? (
              <p className="whitespace-pre-wrap text-sm font-normal">{item.reference}</p>
            ) : null,
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
      </TabsContent>
    </Tabs>
  );
}
