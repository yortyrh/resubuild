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

  return result;
}
