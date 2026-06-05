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

/**
 * Unwrap a single-key `{ item: <value> }` envelope if `value` is the
 * expected `item` payload. JSON Resume documents emitted by some MCP/LLM
 * agents wrap every array (and a few single-object fields) inside an
 * XML-style `item` key, e.g. `"work": { "item": [...] }`. That shape
 * matches a plain object and therefore trips the array checks further
 * down this module, silently dropping the section. We treat the wrapper
 * as transparent and unwrap it recursively, but only when the envelope
 * contains nothing but the `item` key — otherwise it is a legitimate
 * resume field that happens to be called `item`.
 */
function unwrapItemEnvelope(value: unknown): unknown {
  if (!isPlainObject(value)) {
    return value;
  }
  const keys = Object.keys(value);
  if (keys.length !== 1 || keys[0] !== 'item') {
    return value;
  }
  return unwrapJsonResumeWrappers(value.item);
}

/**
 * Recursively normalize a JSON Resume document so any `{"item": ...}`
 * wrapper is unwrapped at every level. This handles both top-level
 * sections (`work`, `education`, `skills`, ...) and nested arrays
 * inside entry objects (`highlights`, `keywords`, `profiles`, ...).
 */
function unwrapJsonResumeWrappers(value: unknown): unknown {
  const unwrapped = unwrapItemEnvelope(value);
  if (Array.isArray(unwrapped)) {
    return unwrapped.map((entry) => unwrapJsonResumeWrappers(entry));
  }
  if (isPlainObject(unwrapped)) {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(unwrapped)) {
      result[k] = unwrapJsonResumeWrappers(v);
    }
    return result;
  }
  return unwrapped;
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
  if (Array.isArray(value)) {
    return copySectionValue(value) as unknown[];
  }
  // Some MCP/LLM agents wrap a single object inside `{ item: { ... } }`,
  // which after our XML-wrapper unwrap becomes a plain object. Treat that
  // as a single-entry section so the data still lands in storage.
  if (isPlainObject(value)) {
    return [{ ...value }];
  }
  return [];
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
 * Coerces the `basics.profiles` value into a JSON-Resume-shaped array. The
 * schema requires `type: array`, but agentic tools (PDF import, scrapers,
 * copy-paste from a LinkedIn sidebar) often hand us a single object, a string
 * URL, or omit it entirely. We normalize to an array of plain objects so the
 * downstream AJV check passes; non-array, non-object inputs default to `[]`,
 * and entries inside an array that aren't plain objects are dropped.
 */
function normalizeBasicsProfiles(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is Record<string, unknown> => isPlainObject(entry))
      .map((entry) => ({ ...entry }));
  }
  if (isPlainObject(value)) {
    return [{ ...value }];
  }
  return [];
}

/**
 * Normalizes an external JSON Resume document for `POST /cv` `data`.
 * Strips foreign `$schema` / `meta` and ensures standard array sections exist.
 */
export function prepareImportedResume(raw: unknown): Record<string, unknown> {
  if (!isPlainObject(raw)) {
    throw new InvalidImportedResumeError('Resume must be a JSON object');
  }

  // Unwrap any `{"item": ...}` envelopes up front so downstream array
  // and object handling can assume a canonical JSON Resume shape. See
  // `unwrapJsonResumeWrappers` for the exact rule.
  const normalized = unwrapJsonResumeWrappers(raw) as Record<string, unknown>;
  if (!isPlainObject(normalized)) {
    throw new InvalidImportedResumeError('Resume must be a JSON object');
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(normalized)) {
    if (STRIPPED_TOP_LEVEL_KEYS.has(key)) {
      continue;
    }
    if ((RESUME_ARRAY_SECTION_KEYS as readonly string[]).includes(key)) {
      continue;
    }
    result[key] = copySectionValue(value);
  }

  for (const key of RESUME_ARRAY_SECTION_KEYS) {
    result[key] = defaultArraySection(normalized[key]);
  }

  // `basics` is not a top-level array section, so it gets copied through
  // verbatim above. The JSON Resume schema still requires `basics.profiles`
  // to be an array of profile objects — agentic imports frequently hand us a
  // single object, a URL string, or nothing at all, so normalize it here.
  if (isPlainObject(result.basics)) {
    const profiles = (result.basics as Record<string, unknown>).profiles;
    (result.basics as Record<string, unknown>).profiles = normalizeBasicsProfiles(profiles);
  }

  return reclassifyVolunteerWorkEntries(result);
}
