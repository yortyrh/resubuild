const RESUME_ARRAY_SECTION_KEYS = [
  'work',
  'volunteer',
  'education',
  'awards',
  'certificates',
  'publications',
  'skills',
  'languages',
  'interests',
  'references',
  'projects',
] as const;

const STRIPPED_TOP_LEVEL_KEYS = new Set(['$schema', 'meta']);

export class InvalidImportedResumeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidImportedResumeError';
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function copySectionValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => (isPlainObject(item) ? { ...item } : item));
  }
  if (isPlainObject(value)) {
    return { ...value };
  }
  return value;
}

function defaultArraySection(value: unknown): unknown[] {
  return Array.isArray(value) ? (copySectionValue(value) as unknown[]) : [];
}

/** Matches volunteer/unpaid roles in entry text (not employer names). */
const VOLUNTEER_ROLE_TEXT = /\b(volunteer|unpaid|community service|pro bono)\b/i;

function volunteerIndicatorText(entry: Record<string, unknown>): string {
  const highlights = Array.isArray(entry.highlights)
    ? entry.highlights.filter((h): h is string => typeof h === 'string')
    : [];
  return [entry.position, entry.summary, entry.description, ...highlights]
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
    .join(' ');
}

function isVolunteerWorkEntry(entry: Record<string, unknown>): boolean {
  if (typeof entry.organization === 'string' && entry.organization.length > 0) {
    return true;
  }
  return VOLUNTEER_ROLE_TEXT.test(volunteerIndicatorText(entry));
}

function mergeSummaryAndDescription(entry: Record<string, unknown>): string | undefined {
  const summary = typeof entry.summary === 'string' ? entry.summary.trim() : '';
  const description = typeof entry.description === 'string' ? entry.description.trim() : '';
  if (summary && description && summary !== description) {
    return `${summary}\n\n${description}`;
  }
  return summary || description || undefined;
}

function mapWorkEntryToVolunteer(entry: Record<string, unknown>): Record<string, unknown> {
  const organization =
    typeof entry.organization === 'string'
      ? entry.organization
      : typeof entry.name === 'string'
        ? entry.name
        : undefined;

  const volunteer: Record<string, unknown> = {};
  if (organization) {
    volunteer.organization = organization;
  }
  for (const key of ['position', 'url', 'startDate', 'endDate', 'highlights'] as const) {
    if (entry[key] !== undefined) {
      volunteer[key] = copySectionValue(entry[key]);
    }
  }
  const summary = mergeSummaryAndDescription(entry);
  if (summary) {
    volunteer.summary = summary;
  }
  return volunteer;
}

/**
 * Moves work entries that describe volunteer/unpaid roles into `volunteer[]`.
 */
export function reclassifyVolunteerWorkEntries(
  resume: Record<string, unknown>,
): Record<string, unknown> {
  const work = defaultArraySection(resume.work);
  const volunteer = defaultArraySection(resume.volunteer);

  const keptWork: unknown[] = [];
  for (const item of work) {
    if (!isPlainObject(item)) {
      keptWork.push(item);
      continue;
    }
    if (isVolunteerWorkEntry(item)) {
      volunteer.push(mapWorkEntryToVolunteer(item));
    } else {
      keptWork.push({ ...item });
    }
  }

  return {
    ...resume,
    work: keptWork,
    volunteer,
  };
}

/**
 * Normalizes an external JSON Resume document for `POST /cv` `data`.
 * Strips foreign `$schema` / `meta` and ensures standard array sections exist.
 */
export function prepareImportedResume(raw: unknown): Record<string, unknown> {
  if (!isPlainObject(raw)) {
    throw new InvalidImportedResumeError('Resume must be a JSON object');
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (STRIPPED_TOP_LEVEL_KEYS.has(key)) {
      continue;
    }
    if ((RESUME_ARRAY_SECTION_KEYS as readonly string[]).includes(key)) {
      continue;
    }
    result[key] = copySectionValue(value);
  }

  for (const key of RESUME_ARRAY_SECTION_KEYS) {
    result[key] = defaultArraySection(raw[key]);
  }

  return reclassifyVolunteerWorkEntries(result);
}
