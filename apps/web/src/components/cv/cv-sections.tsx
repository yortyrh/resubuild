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
import { TextField, StringListField } from '@/components/cv/form-fields';
import { IsoDateField } from '@/components/cv/iso-date-field';
import { ArraySection } from '@/components/cv/array-section';

interface CvSectionsProps {
  resume: Resume;
  onChange: (resume: Resume) => void;
}

export function CvSections({ resume, onChange }: CvSectionsProps) {
  const updateBasics = (patch: Partial<NonNullable<Resume['basics']>>) => {
    onChange({ ...resume, basics: { ...resume.basics, ...patch } });
  };

  const updateLocation = (patch: Partial<NonNullable<Resume['basics']>['location']>) => {
    onChange({
      ...resume,
      basics: {
        ...resume.basics,
        location: { ...resume.basics?.location, ...patch },
      },
    });
  };

  return (
    <Tabs defaultValue="basics" className="w-full">
      <TabsList className="h-auto flex-wrap">
        <TabsTrigger value="basics">Basics</TabsTrigger>
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
        <TextField
          label="Name"
          value={resume.basics?.name}
          onChange={(name) => updateBasics({ name })}
        />
        <TextField
          label="Label"
          value={resume.basics?.label}
          onChange={(label) => updateBasics({ label })}
        />
        <TextField
          label="Email"
          type="email"
          value={resume.basics?.email}
          onChange={(email) => updateBasics({ email })}
        />
        <TextField
          label="Phone"
          value={resume.basics?.phone}
          onChange={(phone) => updateBasics({ phone })}
        />
        <TextField
          label="Website"
          type="url"
          value={resume.basics?.url}
          onChange={(url) => updateBasics({ url })}
        />
        <TextField
          label="Image URL"
          type="url"
          value={resume.basics?.image}
          onChange={(image) => updateBasics({ image })}
        />
        <TextField
          label="Summary"
          markdown="block"
          multiline
          value={resume.basics?.summary}
          onChange={(summary) => updateBasics({ summary })}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="City"
            value={resume.basics?.location?.city}
            onChange={(city) => updateLocation({ city })}
          />
          <TextField
            label="Region"
            value={resume.basics?.location?.region}
            onChange={(region) => updateLocation({ region })}
          />
          <TextField
            label="Postal code"
            value={resume.basics?.location?.postalCode}
            onChange={(postalCode) => updateLocation({ postalCode })}
          />
          <TextField
            label="Country code"
            value={resume.basics?.location?.countryCode}
            onChange={(countryCode) => updateLocation({ countryCode })}
          />
        </div>
        <TextField
          label="Address"
          multiline
          value={resume.basics?.location?.address}
          onChange={(address) => updateLocation({ address })}
        />

        <ArraySection
          title="Profiles"
          items={resume.basics?.profiles ?? []}
          onChange={(profiles) => updateBasics({ profiles })}
          createItem={(): ResumeProfile => ({})}
          renderItem={(item, _index, update) => (
            <>
              <TextField
                label="Network"
                value={item.network}
                onChange={(network) => update({ ...item, network })}
              />
              <TextField
                label="Username"
                value={item.username}
                onChange={(username) => update({ ...item, username })}
              />
              <TextField
                label="URL"
                type="url"
                value={item.url}
                onChange={(url) => update({ ...item, url })}
              />
            </>
          )}
        />
      </TabsContent>

      <TabsContent value="work">
        <ArraySection
          title="Work experience"
          items={resume.work ?? []}
          onChange={(work) => onChange({ ...resume, work })}
          createItem={(): ResumeWork => ({ highlights: [] })}
          renderItem={(item, _index, update) => (
            <>
              <TextField
                label="Company"
                value={item.name}
                onChange={(name) => update({ ...item, name })}
              />
              <TextField
                label="Position"
                value={item.position}
                onChange={(position) => update({ ...item, position })}
              />
              <TextField
                label="Location"
                value={item.location}
                onChange={(location) => update({ ...item, location })}
              />
              <TextField
                label="URL"
                type="url"
                value={item.url}
                onChange={(url) => update({ ...item, url })}
              />
              <IsoDateField
                label="Start date"
                value={item.startDate}
                onChange={(startDate) => update({ ...item, startDate })}
              />
              <IsoDateField
                label="End date"
                value={item.endDate}
                onChange={(endDate) => update({ ...item, endDate })}
              />
              <TextField
                label="Description"
                markdown="inline"
                value={item.description}
                onChange={(description) => update({ ...item, description })}
              />
              <TextField
                label="Summary"
                markdown="block"
                multiline
                value={item.summary}
                onChange={(summary) => update({ ...item, summary })}
              />
              <StringListField
                label="Highlight"
                markdown
                values={item.highlights}
                onChange={(highlights) => update({ ...item, highlights })}
              />
            </>
          )}
        />
      </TabsContent>

      <TabsContent value="volunteer">
        <ArraySection
          title="Volunteer"
          items={resume.volunteer ?? []}
          onChange={(volunteer) => onChange({ ...resume, volunteer })}
          createItem={(): ResumeVolunteer => ({ highlights: [] })}
          renderItem={(item, _index, update) => (
            <>
              <TextField
                label="Organization"
                value={item.organization}
                onChange={(organization) => update({ ...item, organization })}
              />
              <TextField
                label="Position"
                value={item.position}
                onChange={(position) => update({ ...item, position })}
              />
              <TextField
                label="URL"
                type="url"
                value={item.url}
                onChange={(url) => update({ ...item, url })}
              />
              <IsoDateField
                label="Start date"
                value={item.startDate}
                onChange={(startDate) => update({ ...item, startDate })}
              />
              <IsoDateField
                label="End date"
                value={item.endDate}
                onChange={(endDate) => update({ ...item, endDate })}
              />
              <TextField
                label="Summary"
                markdown="block"
                multiline
                value={item.summary}
                onChange={(summary) => update({ ...item, summary })}
              />
              <StringListField
                label="Highlight"
                markdown
                values={item.highlights}
                onChange={(highlights) => update({ ...item, highlights })}
              />
            </>
          )}
        />
      </TabsContent>

      <TabsContent value="education">
        <ArraySection
          title="Education"
          items={resume.education ?? []}
          onChange={(education) => onChange({ ...resume, education })}
          createItem={(): ResumeEducation => ({ courses: [] })}
          renderItem={(item, _index, update) => (
            <>
              <TextField
                label="Institution"
                value={item.institution}
                onChange={(institution) => update({ ...item, institution })}
              />
              <TextField
                label="Area"
                value={item.area}
                onChange={(area) => update({ ...item, area })}
              />
              <TextField
                label="Study type"
                value={item.studyType}
                onChange={(studyType) => update({ ...item, studyType })}
              />
              <TextField
                label="URL"
                type="url"
                value={item.url}
                onChange={(url) => update({ ...item, url })}
              />
              <IsoDateField
                label="Start date"
                value={item.startDate}
                onChange={(startDate) => update({ ...item, startDate })}
              />
              <IsoDateField
                label="End date"
                value={item.endDate}
                onChange={(endDate) => update({ ...item, endDate })}
              />
              <TextField
                label="Score"
                value={item.score}
                onChange={(score) => update({ ...item, score })}
              />
              <StringListField
                label="Course"
                values={item.courses}
                onChange={(courses) => update({ ...item, courses })}
              />
            </>
          )}
        />
      </TabsContent>

      <TabsContent value="skills">
        <ArraySection
          title="Skills"
          items={resume.skills ?? []}
          onChange={(skills) => onChange({ ...resume, skills })}
          createItem={(): ResumeSkill => ({ keywords: [] })}
          renderItem={(item, _index, update) => (
            <>
              <TextField
                label="Name"
                value={item.name}
                onChange={(name) => update({ ...item, name })}
              />
              <TextField
                label="Level"
                value={item.level}
                onChange={(level) => update({ ...item, level })}
              />
              <StringListField
                label="Keyword"
                values={item.keywords}
                onChange={(keywords) => update({ ...item, keywords })}
              />
            </>
          )}
        />
      </TabsContent>

      <TabsContent value="projects">
        <ArraySection
          title="Projects"
          items={resume.projects ?? []}
          onChange={(projects) => onChange({ ...resume, projects })}
          createItem={(): ResumeProject => ({ highlights: [], keywords: [], roles: [] })}
          renderItem={(item, _index, update) => (
            <>
              <TextField
                label="Name"
                value={item.name}
                onChange={(name) => update({ ...item, name })}
              />
              <TextField
                label="Description"
                markdown="block"
                multiline
                value={item.description}
                onChange={(description) => update({ ...item, description })}
              />
              <TextField
                label="URL"
                type="url"
                value={item.url}
                onChange={(url) => update({ ...item, url })}
              />
              <TextField
                label="Entity"
                value={item.entity}
                onChange={(entity) => update({ ...item, entity })}
              />
              <TextField
                label="Type"
                value={item.type}
                onChange={(type) => update({ ...item, type })}
              />
              <IsoDateField
                label="Start date"
                value={item.startDate}
                onChange={(startDate) => update({ ...item, startDate })}
              />
              <IsoDateField
                label="End date"
                value={item.endDate}
                onChange={(endDate) => update({ ...item, endDate })}
              />
              <StringListField
                label="Role"
                values={item.roles}
                onChange={(roles) => update({ ...item, roles })}
              />
              <StringListField
                label="Keyword"
                values={item.keywords}
                onChange={(keywords) => update({ ...item, keywords })}
              />
              <StringListField
                label="Highlight"
                markdown
                values={item.highlights}
                onChange={(highlights) => update({ ...item, highlights })}
              />
            </>
          )}
        />
      </TabsContent>

      <TabsContent value="awards">
        <ArraySection
          title="Awards"
          items={resume.awards ?? []}
          onChange={(awards) => onChange({ ...resume, awards })}
          createItem={(): ResumeAward => ({})}
          renderItem={(item, _index, update) => (
            <>
              <TextField
                label="Title"
                value={item.title}
                onChange={(title) => update({ ...item, title })}
              />
              <IsoDateField
                label="Date"
                value={item.date}
                onChange={(date) => update({ ...item, date })}
              />
              <TextField
                label="Awarder"
                value={item.awarder}
                onChange={(awarder) => update({ ...item, awarder })}
              />
              <TextField
                label="Summary"
                markdown="block"
                multiline
                value={item.summary}
                onChange={(summary) => update({ ...item, summary })}
              />
            </>
          )}
        />
      </TabsContent>

      <TabsContent value="certificates">
        <ArraySection
          title="Certificates"
          items={resume.certificates ?? []}
          onChange={(certificates) => onChange({ ...resume, certificates })}
          createItem={(): ResumeCertificate => ({})}
          renderItem={(item, _index, update) => (
            <>
              <TextField
                label="Name"
                value={item.name}
                onChange={(name) => update({ ...item, name })}
              />
              <IsoDateField
                label="Date"
                value={item.date}
                onChange={(date) => update({ ...item, date })}
              />
              <TextField
                label="Issuer"
                value={item.issuer}
                onChange={(issuer) => update({ ...item, issuer })}
              />
              <TextField
                label="URL"
                type="url"
                value={item.url}
                onChange={(url) => update({ ...item, url })}
              />
            </>
          )}
        />
      </TabsContent>

      <TabsContent value="publications">
        <ArraySection
          title="Publications"
          items={resume.publications ?? []}
          onChange={(publications) => onChange({ ...resume, publications })}
          createItem={(): ResumePublication => ({})}
          renderItem={(item, _index, update) => (
            <>
              <TextField
                label="Name"
                value={item.name}
                onChange={(name) => update({ ...item, name })}
              />
              <TextField
                label="Publisher"
                value={item.publisher}
                onChange={(publisher) => update({ ...item, publisher })}
              />
              <IsoDateField
                label="Release date"
                value={item.releaseDate}
                onChange={(releaseDate) => update({ ...item, releaseDate })}
              />
              <TextField
                label="URL"
                type="url"
                value={item.url}
                onChange={(url) => update({ ...item, url })}
              />
              <TextField
                label="Summary"
                markdown="block"
                multiline
                value={item.summary}
                onChange={(summary) => update({ ...item, summary })}
              />
            </>
          )}
        />
      </TabsContent>

      <TabsContent value="languages">
        <ArraySection
          title="Languages"
          items={resume.languages ?? []}
          onChange={(languages) => onChange({ ...resume, languages })}
          createItem={(): ResumeLanguage => ({})}
          renderItem={(item, _index, update) => (
            <>
              <TextField
                label="Language"
                value={item.language}
                onChange={(language) => update({ ...item, language })}
              />
              <TextField
                label="Fluency"
                value={item.fluency}
                onChange={(fluency) => update({ ...item, fluency })}
              />
            </>
          )}
        />
      </TabsContent>

      <TabsContent value="interests">
        <ArraySection
          title="Interests"
          items={resume.interests ?? []}
          onChange={(interests) => onChange({ ...resume, interests })}
          createItem={(): ResumeInterest => ({ keywords: [] })}
          renderItem={(item, _index, update) => (
            <>
              <TextField
                label="Name"
                value={item.name}
                onChange={(name) => update({ ...item, name })}
              />
              <StringListField
                label="Keyword"
                values={item.keywords}
                onChange={(keywords) => update({ ...item, keywords })}
              />
            </>
          )}
        />
      </TabsContent>

      <TabsContent value="references">
        <ArraySection
          title="References"
          items={resume.references ?? []}
          onChange={(references) => onChange({ ...resume, references })}
          createItem={(): ResumeReference => ({})}
          renderItem={(item, _index, update) => (
            <>
              <TextField
                label="Name"
                value={item.name}
                onChange={(name) => update({ ...item, name })}
              />
              <TextField
                label="Reference"
                markdown="block"
                multiline
                value={item.reference}
                onChange={(reference) => update({ ...item, reference })}
              />
            </>
          )}
        />
      </TabsContent>
    </Tabs>
  );
}
