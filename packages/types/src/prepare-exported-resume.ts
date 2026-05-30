import type { Resume } from './resume';

export const JSON_RESUME_SCHEMA_URI =
  'https://raw.githubusercontent.com/jsonresume/resume-schema/master/schema.json';

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

export interface PrepareExportedResumeOptions {
  updatedAt: string | Date;
  version?: string;
  canonical?: string;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key as keyof T] = value as T[keyof T];
    }
  }
  return result;
}

function stripInternalId(item: unknown): Record<string, unknown> | unknown {
  if (!isPlainObject(item)) return item;
  const { id: _id, ...rest } = item;
  return rest;
}

function stripInternalIds(items: unknown[] | undefined): unknown[] | undefined {
  if (!items?.length) return undefined;
  return items.map(stripInternalId);
}

function isEmptyLocation(location: unknown): boolean {
  if (!location || typeof location !== 'object' || Array.isArray(location)) {
    return true;
  }
  return Object.values(location).every(
    (value) => value === undefined || value === null || value === '',
  );
}

function prepareBasicsForExport(basics: Resume['basics']): Record<string, unknown> | undefined {
  if (!basics) return undefined;

  const { location, profiles, ...rest } = basics;
  const exportProfiles = stripInternalIds(profiles as unknown[] | undefined);
  const prepared = omitUndefined({
    ...rest,
    location: isEmptyLocation(location) ? undefined : location,
    profiles: exportProfiles?.length ? exportProfiles : undefined,
  });

  return Object.keys(prepared).length > 0 ? prepared : undefined;
}

function toIso8601(updatedAt: string | Date): string {
  if (updatedAt instanceof Date) {
    return updatedAt.toISOString();
  }
  return new Date(updatedAt).toISOString();
}

/**
 * Normalizes an assembled Resumind resume for JSON download.
 * Strips internal row ids, omits empty sections, and adds export metadata.
 */
export function prepareExportedResume(
  resume: Resume,
  options: PrepareExportedResumeOptions,
): Record<string, unknown> {
  const meta = omitUndefined({
    lastModified: toIso8601(options.updatedAt),
    version: options.version?.trim() || 'v1',
    canonical: options.canonical?.trim() || undefined,
  });

  const result: Record<string, unknown> = {
    $schema: JSON_RESUME_SCHEMA_URI,
    meta,
  };

  const basics = prepareBasicsForExport(resume.basics);
  if (basics) {
    result.basics = basics;
  }

  for (const key of RESUME_ARRAY_SECTION_KEYS) {
    const section = resume[key];
    if (Array.isArray(section) && section.length > 0) {
      result[key] = section.map(stripInternalId);
    }
  }

  return result;
}
