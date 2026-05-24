'use client';

import { useRef, type ChangeEvent } from 'react';
import { toast } from 'sonner';
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CountryCodeField } from '@/components/cv/country-code-field';
import { TextField, StringListField } from '@/components/cv/form-fields';
import { IsoDateField } from '@/components/cv/iso-date-field';
import { ArraySection } from '@/components/cv/array-section';
import { uploadResumeMedia } from '@/lib/api';

interface CvSectionsProps {
  resume: Resume;
  onChange: (resume: Resume) => void;
}

export function CvSections({ resume, onChange }: CvSectionsProps) {
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);

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

  const handleProfilePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    try {
      const { url } = await uploadResumeMedia(file);
      updateBasics({ image: url });
      toast.success('Profile photo uploaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Photo upload failed');
    }
  };

  const profileFields = (
    <ArraySection
      title="Social profiles"
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
  );

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
        <TextField
          label="Name"
          value={resume.basics?.name}
          onChange={(name) => updateBasics({ name })}
        />
        <TextField
          label="Label"
          description='Your professional headline — e.g. "Senior Software Engineer" or "Marketing Specialist".'
          value={resume.basics?.label}
          onChange={(label) => updateBasics({ label })}
        />
        <TextField
          label="Summary"
          markdown="block"
          multiline
          value={resume.basics?.summary}
          onChange={(summary) => updateBasics({ summary })}
          placeholder="Who you are, what you excel at, and what you’re looking for — plain language is fine."
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
          <CountryCodeField
            value={resume.basics?.location?.countryCode}
            onChange={(countryCode) => updateLocation({ countryCode })}
          />
        </div>
        <TextField
          label="Address"
          description="Optional. Street number and street name (suite or unit if needed). Locality stays in City / Region / Postal code above."
          value={resume.basics?.location?.address}
          onChange={(address) => updateLocation({ address })}
        />

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="basics-image-url">Profile photo</Label>
            <div className="flex gap-2">
              <input
                ref={profilePhotoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleProfilePhoto}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => profilePhotoInputRef.current?.click()}
              >
                Upload
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground text-sm">
            Upload a portrait or paste an HTTPS URL. Many résumés only need basic contact info
            earlier—photo is optional.
          </p>
          <Input
            id="basics-image-url"
            type="url"
            value={resume.basics?.image ?? ''}
            placeholder="https://..."
            onChange={(e) => updateBasics({ image: e.target.value })}
          />
        </div>
      </TabsContent>

      <TabsContent value="profiles" className="space-y-4">
        {profileFields}
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
                label="Summary"
                description="Acts as your professional elevator pitch for the specific job. Use 2–3 concise sentences to summarize your overall impact, key projects, and the scope of your responsibilities."
                markdown="block"
                multiline
                value={item.summary}
                onChange={(summary) => update({ ...item, summary })}
              />
              <TextField
                label="Description"
                description="Provides a detailed paragraph diving into the day-to-day operations, leadership duties, and technologies used on the job."
                markdown="block"
                multiline
                value={item.description}
                onChange={(description) => update({ ...item, description })}
              />
              <StringListField
                label="Highlight"
                description="Best utilized as bullet points for your quantifiable achievements, metrics, and notable awards."
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
                description='Field or concentration — e.g. "Computer Science" or "Industrial Design".'
                value={item.area}
                onChange={(area) => update({ ...item, area })}
              />
              <TextField
                label="Study type"
                description='e.g. "Bachelor", "Master", "Certificate", "Associate".'
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
                description='Skill or tooling name — e.g. "PostgreSQL", "Spanish", "Photoshop".'
                value={item.name}
                onChange={(name) => update({ ...item, name })}
              />
              <TextField
                label="Level"
                description='Comfort or proficiency — free text scale (e.g. "Expert", "4/5").'
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
                description="Company, OSS org, foundation, or team that stewards this project."
                value={item.entity}
                onChange={(entity) => update({ ...item, entity })}
              />
              <TextField
                label="Type"
                description='e.g. "open source", "side project", "client work".'
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
                description='Your hats on the initiative — one per row (e.g. "Technical lead", "Solo founder").'
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
                description="Outcomes readers should notice — shipments, traction, migrations, KPIs."
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
                description="Official award headline — matched to trophies, honours, nominations."
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
                description="Organization granting the accolade."
                value={item.awarder}
                onChange={(awarder) => update({ ...item, awarder })}
              />
              <TextField
                label="Summary"
                markdown="block"
                multiline
                description="Short context explaining why this mattered."
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
                description="Credential title printed on certificate — keep vendor wording when possible."
                value={item.name}
                onChange={(name) => update({ ...item, name })}
              />
              <IsoDateField
                label="Date"
                description="Earned/issue date exactly as issuer records it."
                value={item.date}
                onChange={(date) => update({ ...item, date })}
              />
              <TextField
                label="Issuer"
                description="Vendor, awarding body, or learning platform issuing the credential."
                value={item.issuer}
                onChange={(issuer) => update({ ...item, issuer })}
              />
              <TextField
                label="URL"
                type="url"
                description="Public verification badge or Credly/cert link."
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
                description="Article/book/talk title precisely as cited."
                value={item.name}
                onChange={(name) => update({ ...item, name })}
              />
              <TextField
                label="Publisher"
                description="Publication channel, imprint, proceedings, venue, etc."
                value={item.publisher}
                onChange={(publisher) => update({ ...item, publisher })}
              />
              <IsoDateField
                label="Release date"
                description="Release or presentation date aligned with bibliography."
                value={item.releaseDate}
                onChange={(releaseDate) => update({ ...item, releaseDate })}
              />
              <TextField
                label="URL"
                type="url"
                description="Canonical HTTPS link."
                value={item.url}
                onChange={(url) => update({ ...item, url })}
              />
              <TextField
                label="Summary"
                markdown="block"
                multiline
                description="Elevator synopsis or impact statement about the publication."
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
                description="Theme grouping — music, philanthropy, mentorship, athletics, reading, etc."
                value={item.name}
                onChange={(name) => update({ ...item, name })}
              />
              <StringListField
                label="Keyword"
                description="Specific topics you want hiring teams to resonate with."
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
                description="Reference full name."
                value={item.name}
                onChange={(name) => update({ ...item, name })}
              />
              <TextField
                label="Reference"
                markdown="block"
                multiline
                description="Recommendation text, quoting relationship + contact guidance where appropriate."
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
