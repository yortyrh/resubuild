import type {
  Resume,
  ResumeAward,
  ResumeBasics,
  ResumeCertificate,
  ResumeEducation,
  ResumeInterest,
  ResumeLanguage,
  ResumeLocation,
  ResumeProfile,
  ResumeProject,
  ResumePublication,
  ResumeReference,
  ResumeSkill,
  ResumeVolunteer,
  ResumeWork,
} from './resume';

/** CV header row (basics scalars + location + meta on `cv` table). */
export interface CvHeaderRow {
  id: string;
  user_id: string;
  name?: string | null;
  label?: string | null;
  image?: string | null;
  email?: string | null;
  phone?: string | null;
  url?: string | null;
  summary?: string | null;
  location?: ResumeLocation | null;
  meta_version?: string | null;
  meta_canonical?: string | null;
  meta_last_modified?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CvProfileRow {
  id: string;
  cv_id: string;
  sort: number;
  network?: string | null;
  username?: string | null;
  url?: string | null;
}

export interface CvWorkRow {
  id: string;
  cv_id: string;
  name?: string | null;
  location?: string | null;
  description?: string | null;
  position?: string | null;
  url?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  summary?: string | null;
  highlights?: string[] | null;
}

export interface CvVolunteerRow {
  id: string;
  cv_id: string;
  organization?: string | null;
  position?: string | null;
  url?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  summary?: string | null;
  highlights?: string[] | null;
}

export interface CvEducationRow {
  id: string;
  cv_id: string;
  institution?: string | null;
  url?: string | null;
  area?: string | null;
  study_type?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  score?: string | null;
  courses?: string[] | null;
}

export interface CvAwardRow {
  id: string;
  cv_id: string;
  title?: string | null;
  date?: string | null;
  awarder?: string | null;
  summary?: string | null;
}

export interface CvCertificateRow {
  id: string;
  cv_id: string;
  name?: string | null;
  date?: string | null;
  url?: string | null;
  issuer?: string | null;
}

export interface CvPublicationRow {
  id: string;
  cv_id: string;
  name?: string | null;
  publisher?: string | null;
  release_date?: string | null;
  url?: string | null;
  summary?: string | null;
}

export interface CvSkillRow {
  id: string;
  cv_id: string;
  sort: number;
  name?: string | null;
  level?: string | null;
  keywords?: string[] | null;
}

export interface CvLanguageRow {
  id: string;
  cv_id: string;
  sort: number;
  language?: string | null;
  fluency?: string | null;
}

export interface CvInterestRow {
  id: string;
  cv_id: string;
  sort: number;
  name?: string | null;
  keywords?: string[] | null;
}

export interface CvReferenceRow {
  id: string;
  cv_id: string;
  sort: number;
  name?: string | null;
  reference?: string | null;
}

export interface CvProjectRow {
  id: string;
  cv_id: string;
  name?: string | null;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  url?: string | null;
  entity?: string | null;
  type?: string | null;
  highlights?: string[] | null;
  keywords?: string[] | null;
  roles?: string[] | null;
}

export interface NormalizedCvSections {
  profiles: CvProfileRow[];
  work: CvWorkRow[];
  volunteer: CvVolunteerRow[];
  education: CvEducationRow[];
  awards: CvAwardRow[];
  certificates: CvCertificateRow[];
  publications: CvPublicationRow[];
  skills: CvSkillRow[];
  languages: CvLanguageRow[];
  interests: CvInterestRow[];
  references: CvReferenceRow[];
  projects: CvProjectRow[];
}

export interface NormalizedCvPayload {
  header: Omit<CvHeaderRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
  sections: NormalizedCvSections;
}

export type SortBackedSection = 'profiles' | 'skills' | 'languages' | 'interests' | 'references';

export type DateBackedSection =
  | 'work'
  | 'volunteer'
  | 'education'
  | 'awards'
  | 'certificates'
  | 'publications'
  | 'projects';

export type CvSectionKey = SortBackedSection | DateBackedSection;

function emptyStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string');
  }
  return [];
}

function emptyLocation(value: unknown): ResumeLocation {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as ResumeLocation;
  }
  return {};
}

function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== '') {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}

function profileToRow(
  profile: ResumeProfile,
  cvId: string,
  sort: number,
): Omit<CvProfileRow, 'id'> {
  return {
    cv_id: cvId,
    sort,
    network: profile.network ?? null,
    username: profile.username ?? null,
    url: profile.url ?? null,
  };
}

function workToRow(work: ResumeWork, cvId: string): Omit<CvWorkRow, 'id'> {
  return {
    cv_id: cvId,
    name: work.name ?? null,
    location: work.location ?? null,
    description: work.description ?? null,
    position: work.position ?? null,
    url: work.url ?? null,
    start_date: work.startDate ?? null,
    end_date: work.endDate ?? null,
    summary: work.summary ?? null,
    highlights: emptyStringArray(work.highlights),
  };
}

function volunteerToRow(volunteer: ResumeVolunteer, cvId: string): Omit<CvVolunteerRow, 'id'> {
  return {
    cv_id: cvId,
    organization: volunteer.organization ?? null,
    position: volunteer.position ?? null,
    url: volunteer.url ?? null,
    start_date: volunteer.startDate ?? null,
    end_date: volunteer.endDate ?? null,
    summary: volunteer.summary ?? null,
    highlights: emptyStringArray(volunteer.highlights),
  };
}

function educationToRow(education: ResumeEducation, cvId: string): Omit<CvEducationRow, 'id'> {
  return {
    cv_id: cvId,
    institution: education.institution ?? null,
    url: education.url ?? null,
    area: education.area ?? null,
    study_type: education.studyType ?? null,
    start_date: education.startDate ?? null,
    end_date: education.endDate ?? null,
    score: education.score ?? null,
    courses: emptyStringArray(education.courses),
  };
}

function awardToRow(award: ResumeAward, cvId: string): Omit<CvAwardRow, 'id'> {
  return {
    cv_id: cvId,
    title: award.title ?? null,
    date: award.date ?? null,
    awarder: award.awarder ?? null,
    summary: award.summary ?? null,
  };
}

function certificateToRow(
  certificate: ResumeCertificate,
  cvId: string,
): Omit<CvCertificateRow, 'id'> {
  return {
    cv_id: cvId,
    name: certificate.name ?? null,
    date: certificate.date ?? null,
    url: certificate.url ?? null,
    issuer: certificate.issuer ?? null,
  };
}

function publicationToRow(
  publication: ResumePublication,
  cvId: string,
): Omit<CvPublicationRow, 'id'> {
  return {
    cv_id: cvId,
    name: publication.name ?? null,
    publisher: publication.publisher ?? null,
    release_date: publication.releaseDate ?? null,
    url: publication.url ?? null,
    summary: publication.summary ?? null,
  };
}

function skillToRow(skill: ResumeSkill, cvId: string, sort: number): Omit<CvSkillRow, 'id'> {
  return {
    cv_id: cvId,
    sort,
    name: skill.name ?? null,
    level: skill.level ?? null,
    keywords: emptyStringArray(skill.keywords),
  };
}

function languageToRow(
  language: ResumeLanguage,
  cvId: string,
  sort: number,
): Omit<CvLanguageRow, 'id'> {
  return {
    cv_id: cvId,
    sort,
    language: language.language ?? null,
    fluency: language.fluency ?? null,
  };
}

function interestToRow(
  interest: ResumeInterest,
  cvId: string,
  sort: number,
): Omit<CvInterestRow, 'id'> {
  return {
    cv_id: cvId,
    sort,
    name: interest.name ?? null,
    keywords: emptyStringArray(interest.keywords),
  };
}

function referenceToRow(
  reference: ResumeReference,
  cvId: string,
  sort: number,
): Omit<CvReferenceRow, 'id'> {
  return {
    cv_id: cvId,
    sort,
    name: reference.name ?? null,
    reference: reference.reference ?? null,
  };
}

function projectToRow(project: ResumeProject, cvId: string): Omit<CvProjectRow, 'id'> {
  return {
    cv_id: cvId,
    name: project.name ?? null,
    description: project.description ?? null,
    start_date: project.startDate ?? null,
    end_date: project.endDate ?? null,
    url: project.url ?? null,
    entity: project.entity ?? null,
    type: project.type ?? null,
    highlights: emptyStringArray(project.highlights),
    keywords: emptyStringArray(project.keywords),
    roles: emptyStringArray(project.roles),
  };
}

export function disassembleResume(data: Resume, cvId = ''): NormalizedCvPayload {
  const basics = data.basics ?? {};

  const header: NormalizedCvPayload['header'] = {
    name: basics.name ?? null,
    label: basics.label ?? null,
    image: basics.image ?? null,
    email: basics.email ?? null,
    phone: basics.phone ?? null,
    url: basics.url ?? null,
    summary: basics.summary ?? null,
    location: emptyLocation(basics.location),
  };

  const profiles = (basics.profiles ?? []).map((p, i) => profileToRow(p, cvId, i));
  const work = (data.work ?? []).map((w) => workToRow(w, cvId));
  const volunteer = (data.volunteer ?? []).map((v) => volunteerToRow(v, cvId));
  const education = (data.education ?? []).map((e) => educationToRow(e, cvId));
  const awards = (data.awards ?? []).map((a) => awardToRow(a, cvId));
  const certificates = (data.certificates ?? []).map((c) => certificateToRow(c, cvId));
  const publications = (data.publications ?? []).map((p) => publicationToRow(p, cvId));
  const skills = (data.skills ?? []).map((s, i) => skillToRow(s, cvId, i));
  const languages = (data.languages ?? []).map((l, i) => languageToRow(l, cvId, i));
  const interests = (data.interests ?? []).map((item, i) => interestToRow(item, cvId, i));
  const references = (data.references ?? []).map((r, i) => referenceToRow(r, cvId, i));
  const projects = (data.projects ?? []).map((p) => projectToRow(p, cvId));

  return {
    header,
    sections: {
      profiles: profiles as CvProfileRow[],
      work: work as CvWorkRow[],
      volunteer: volunteer as CvVolunteerRow[],
      education: education as CvEducationRow[],
      awards: awards as CvAwardRow[],
      certificates: certificates as CvCertificateRow[],
      publications: publications as CvPublicationRow[],
      skills: skills as CvSkillRow[],
      languages: languages as CvLanguageRow[],
      interests: interests as CvInterestRow[],
      references: references as CvReferenceRow[],
      projects: projects as CvProjectRow[],
    },
  };
}

function withRowId<R extends { id: string }, T>(row: R, item: T): T & { id: string } {
  return { ...item, id: row.id };
}

function rowToProfile(row: CvProfileRow): ResumeProfile {
  return omitUndefined({
    network: row.network ?? undefined,
    username: row.username ?? undefined,
    url: row.url ?? undefined,
  }) as ResumeProfile;
}

function rowToWork(row: CvWorkRow): ResumeWork {
  const highlights = emptyStringArray(row.highlights);
  return omitUndefined({
    name: row.name ?? undefined,
    location: row.location ?? undefined,
    description: row.description ?? undefined,
    position: row.position ?? undefined,
    url: row.url ?? undefined,
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    summary: row.summary ?? undefined,
    highlights: highlights.length > 0 ? highlights : undefined,
  }) as ResumeWork;
}

function rowToVolunteer(row: CvVolunteerRow): ResumeVolunteer {
  const highlights = emptyStringArray(row.highlights);
  return omitUndefined({
    organization: row.organization ?? undefined,
    position: row.position ?? undefined,
    url: row.url ?? undefined,
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    summary: row.summary ?? undefined,
    highlights: highlights.length > 0 ? highlights : undefined,
  }) as ResumeVolunteer;
}

function rowToEducation(row: CvEducationRow): ResumeEducation {
  const courses = emptyStringArray(row.courses);
  return omitUndefined({
    institution: row.institution ?? undefined,
    url: row.url ?? undefined,
    area: row.area ?? undefined,
    studyType: row.study_type ?? undefined,
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    score: row.score ?? undefined,
    courses: courses.length > 0 ? courses : undefined,
  }) as ResumeEducation;
}

function rowToAward(row: CvAwardRow): ResumeAward {
  return omitUndefined({
    title: row.title ?? undefined,
    date: row.date ?? undefined,
    awarder: row.awarder ?? undefined,
    summary: row.summary ?? undefined,
  }) as ResumeAward;
}

function rowToCertificate(row: CvCertificateRow): ResumeCertificate {
  return omitUndefined({
    name: row.name ?? undefined,
    date: row.date ?? undefined,
    url: row.url ?? undefined,
    issuer: row.issuer ?? undefined,
  }) as ResumeCertificate;
}

function rowToPublication(row: CvPublicationRow): ResumePublication {
  return omitUndefined({
    name: row.name ?? undefined,
    publisher: row.publisher ?? undefined,
    releaseDate: row.release_date ?? undefined,
    url: row.url ?? undefined,
    summary: row.summary ?? undefined,
  }) as ResumePublication;
}

function rowToSkill(row: CvSkillRow): ResumeSkill {
  const keywords = emptyStringArray(row.keywords);
  return omitUndefined({
    name: row.name ?? undefined,
    level: row.level ?? undefined,
    keywords: keywords.length > 0 ? keywords : undefined,
  }) as ResumeSkill;
}

function rowToLanguage(row: CvLanguageRow): ResumeLanguage {
  return omitUndefined({
    language: row.language ?? undefined,
    fluency: row.fluency ?? undefined,
  }) as ResumeLanguage;
}

function rowToInterest(row: CvInterestRow): ResumeInterest {
  const keywords = emptyStringArray(row.keywords);
  return omitUndefined({
    name: row.name ?? undefined,
    keywords: keywords.length > 0 ? keywords : undefined,
  }) as ResumeInterest;
}

function rowToReference(row: CvReferenceRow): ResumeReference {
  return omitUndefined({
    name: row.name ?? undefined,
    reference: row.reference ?? undefined,
  }) as ResumeReference;
}

function rowToProject(row: CvProjectRow): ResumeProject {
  const highlights = emptyStringArray(row.highlights);
  const keywords = emptyStringArray(row.keywords);
  const roles = emptyStringArray(row.roles);
  return omitUndefined({
    name: row.name ?? undefined,
    description: row.description ?? undefined,
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    url: row.url ?? undefined,
    entity: row.entity ?? undefined,
    type: row.type ?? undefined,
    highlights: highlights.length > 0 ? highlights : undefined,
    keywords: keywords.length > 0 ? keywords : undefined,
    roles: roles.length > 0 ? roles : undefined,
  }) as ResumeProject;
}

function compareDateDesc(a: string | null | undefined, b: string | null | undefined): number {
  const aVal = a ?? '';
  const bVal = b ?? '';
  return bVal.localeCompare(aVal);
}

export function sortWorkRows(rows: CvWorkRow[]): CvWorkRow[] {
  return [...rows].sort((a, b) => {
    const byStart = compareDateDesc(a.start_date, b.start_date);
    if (byStart !== 0) return byStart;
    const byEnd = compareDateDesc(a.end_date, b.end_date);
    if (byEnd !== 0) return byEnd;
    return a.id.localeCompare(b.id);
  });
}

export function sortVolunteerRows(rows: CvVolunteerRow[]): CvVolunteerRow[] {
  return sortWorkRows(rows as CvWorkRow[]) as CvVolunteerRow[];
}

export function sortEducationRows(rows: CvEducationRow[]): CvEducationRow[] {
  return sortWorkRows(rows as CvWorkRow[]) as CvEducationRow[];
}

export function sortProjectRows(rows: CvProjectRow[]): CvProjectRow[] {
  return sortWorkRows(rows as CvWorkRow[]) as CvProjectRow[];
}

export function sortAwardRows(rows: CvAwardRow[]): CvAwardRow[] {
  return [...rows].sort((a, b) => {
    const byDate = compareDateDesc(a.date, b.date);
    if (byDate !== 0) return byDate;
    return a.id.localeCompare(b.id);
  });
}

export function sortCertificateRows(rows: CvCertificateRow[]): CvCertificateRow[] {
  return sortAwardRows(rows as CvAwardRow[]) as CvCertificateRow[];
}

export function sortPublicationRows(rows: CvPublicationRow[]): CvPublicationRow[] {
  return [...rows].sort((a, b) => {
    const byDate = compareDateDesc(a.release_date, b.release_date);
    if (byDate !== 0) return byDate;
    return a.id.localeCompare(b.id);
  });
}

export function sortProfileRows(rows: CvProfileRow[]): CvProfileRow[] {
  return [...rows].sort((a, b) => {
    const bySort = a.sort - b.sort;
    if (bySort !== 0) return bySort;
    return a.id.localeCompare(b.id);
  });
}

export function sortSkillRows(rows: CvSkillRow[]): CvSkillRow[] {
  return sortProfileRows(rows as CvProfileRow[]) as CvSkillRow[];
}

export function sortLanguageRows(rows: CvLanguageRow[]): CvLanguageRow[] {
  return sortProfileRows(rows as CvProfileRow[]) as CvLanguageRow[];
}

export function sortInterestRows(rows: CvInterestRow[]): CvInterestRow[] {
  return sortProfileRows(rows as CvProfileRow[]) as CvInterestRow[];
}

export function sortReferenceRows(rows: CvReferenceRow[]): CvReferenceRow[] {
  return sortProfileRows(rows as CvProfileRow[]) as CvReferenceRow[];
}

/** Slim CV envelope for list/detail reads: basics from `cv` header only (no section tables). */
export function headerToSlimCvData(header: CvHeaderRow): Record<string, unknown> {
  const basics = omitUndefined({
    name: header.name ?? undefined,
    label: header.label ?? undefined,
    image: header.image ?? undefined,
    email: header.email ?? undefined,
    phone: header.phone ?? undefined,
    url: header.url ?? undefined,
    summary: header.summary ?? undefined,
    location: emptyLocation(header.location),
  });

  const data: Record<string, unknown> = {};
  if (Object.keys(basics).length > 0) {
    data.basics = basics;
  }
  return data;
}

export function assembleResume(header: CvHeaderRow, sections: NormalizedCvSections): Resume {
  const profiles = sortProfileRows(sections.profiles).map((row) =>
    withRowId(row, rowToProfile(row)),
  );
  const basics: ResumeBasics = omitUndefined({
    name: header.name ?? undefined,
    label: header.label ?? undefined,
    image: header.image ?? undefined,
    email: header.email ?? undefined,
    phone: header.phone ?? undefined,
    url: header.url ?? undefined,
    summary: header.summary ?? undefined,
    location: emptyLocation(header.location),
    profiles: profiles.length > 0 ? profiles : undefined,
  }) as ResumeBasics;

  const work = sortWorkRows(sections.work).map((row) => withRowId(row, rowToWork(row)));
  const volunteer = sortVolunteerRows(sections.volunteer).map((row) =>
    withRowId(row, rowToVolunteer(row)),
  );
  const education = sortEducationRows(sections.education).map((row) =>
    withRowId(row, rowToEducation(row)),
  );
  const awards = sortAwardRows(sections.awards).map((row) => withRowId(row, rowToAward(row)));
  const certificates = sortCertificateRows(sections.certificates).map((row) =>
    withRowId(row, rowToCertificate(row)),
  );
  const publications = sortPublicationRows(sections.publications).map((row) =>
    withRowId(row, rowToPublication(row)),
  );
  const skills = sortSkillRows(sections.skills).map((row) => withRowId(row, rowToSkill(row)));
  const languages = sortLanguageRows(sections.languages).map((row) =>
    withRowId(row, rowToLanguage(row)),
  );
  const interests = sortInterestRows(sections.interests).map((row) =>
    withRowId(row, rowToInterest(row)),
  );
  const references = sortReferenceRows(sections.references).map((row) =>
    withRowId(row, rowToReference(row)),
  );
  const projects = sortProjectRows(sections.projects).map((row) =>
    withRowId(row, rowToProject(row)),
  );

  return omitUndefined({
    basics,
    work: work.length > 0 ? work : undefined,
    volunteer: volunteer.length > 0 ? volunteer : undefined,
    education: education.length > 0 ? education : undefined,
    awards: awards.length > 0 ? awards : undefined,
    certificates: certificates.length > 0 ? certificates : undefined,
    publications: publications.length > 0 ? publications : undefined,
    skills: skills.length > 0 ? skills : undefined,
    languages: languages.length > 0 ? languages : undefined,
    interests: interests.length > 0 ? interests : undefined,
    references: references.length > 0 ? references : undefined,
    projects: projects.length > 0 ? projects : undefined,
  }) as Resume;
}

/** Map camelCase JSON Resume item fields to snake_case DB insert/update payload. */
export function resumeItemToDbPayload(
  _section: string,
  item: Record<string, unknown>,
): Record<string, unknown> {
  const mapping: Record<string, string> = {
    startDate: 'start_date',
    endDate: 'end_date',
    studyType: 'study_type',
    releaseDate: 'release_date',
    organization: 'organization',
  };

  const skip = new Set(['id', 'cv_id', 'sort']);
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(item)) {
    if (skip.has(key)) continue;
    const dbKey = mapping[key] ?? key;
    if (key === 'highlights' || key === 'courses' || key === 'keywords' || key === 'roles') {
      result[dbKey] = emptyStringArray(value);
    } else {
      result[dbKey] = value;
    }
  }
  return result;
}

/** Map snake_case DB row to camelCase JSON Resume item (includes row id when present). */
export function dbRowToResumeItem(
  _section: string,
  row: Record<string, unknown>,
): Record<string, unknown> {
  const reverseMapping: Record<string, string> = {
    start_date: 'startDate',
    end_date: 'endDate',
    study_type: 'studyType',
    release_date: 'releaseDate',
    organization: 'organization',
  };

  const skip = new Set(['cv_id', 'sort']);
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    if (skip.has(key)) continue;
    const jsonKey = reverseMapping[key] ?? key;
    result[jsonKey] = value;
  }

  return result;
}

export const SECTION_TABLE_MAP: Record<CvSectionKey, string> = {
  profiles: 'cv_profile',
  work: 'cv_work',
  volunteer: 'cv_volunteer',
  education: 'cv_education',
  awards: 'cv_award',
  certificates: 'cv_certificate',
  publications: 'cv_publication',
  skills: 'cv_skill',
  languages: 'cv_language',
  interests: 'cv_interest',
  references: 'cv_reference',
  projects: 'cv_project',
};

export const SORT_BACKED_SECTIONS: SortBackedSection[] = [
  'profiles',
  'skills',
  'languages',
  'interests',
  'references',
];

export function isSortBackedSection(section: string): section is SortBackedSection {
  return (SORT_BACKED_SECTIONS as string[]).includes(section);
}

export function sortSectionRows<T extends { id: string }>(section: CvSectionKey, rows: T[]): T[] {
  switch (section) {
    case 'profiles':
      return sortProfileRows(rows as unknown as CvProfileRow[]) as unknown as T[];
    case 'skills':
      return sortSkillRows(rows as unknown as CvSkillRow[]) as unknown as T[];
    case 'languages':
      return sortLanguageRows(rows as unknown as CvLanguageRow[]) as unknown as T[];
    case 'interests':
      return sortInterestRows(rows as unknown as CvInterestRow[]) as unknown as T[];
    case 'references':
      return sortReferenceRows(rows as unknown as CvReferenceRow[]) as unknown as T[];
    case 'work':
      return sortWorkRows(rows as unknown as CvWorkRow[]) as unknown as T[];
    case 'volunteer':
      return sortVolunteerRows(rows as unknown as CvVolunteerRow[]) as unknown as T[];
    case 'education':
      return sortEducationRows(rows as unknown as CvEducationRow[]) as unknown as T[];
    case 'awards':
      return sortAwardRows(rows as unknown as CvAwardRow[]) as unknown as T[];
    case 'certificates':
      return sortCertificateRows(rows as unknown as CvCertificateRow[]) as unknown as T[];
    case 'publications':
      return sortPublicationRows(rows as unknown as CvPublicationRow[]) as unknown as T[];
    case 'projects':
      return sortProjectRows(rows as unknown as CvProjectRow[]) as unknown as T[];
    default:
      return rows;
  }
}
