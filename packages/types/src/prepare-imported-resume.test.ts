import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { InvalidImportedResumeError, prepareImportedResume } from './prepare-imported-resume';

const samplePath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../.samples/resumes/jsonresume/Jane Doe - Senior Software Engineer.json',
);

describe('prepareImportedResume', () => {
  it('normalizes the Jane Doe sample with all array sections and no schema/meta', () => {
    const raw = JSON.parse(readFileSync(samplePath, 'utf-8')) as Record<string, unknown>;
    const prepared = prepareImportedResume(raw);

    expect(prepared).not.toHaveProperty('$schema');
    expect(prepared).not.toHaveProperty('meta');
    expect(prepared.basics).toEqual(expect.objectContaining({ name: 'Jane Doe' }));
    expect(Array.isArray(prepared.work)).toBe(true);
    expect((prepared.work as unknown[]).length).toBeGreaterThan(0);
    expect(Array.isArray(prepared.education)).toBe(true);
    expect((prepared.education as unknown[]).length).toBeGreaterThan(0);
    expect(Array.isArray(prepared.skills)).toBe(true);
    expect(Array.isArray(prepared.projects)).toBe(true);
    expect(Array.isArray(prepared.volunteer)).toBe(true);
  });

  it('defaults missing array sections for a minimal basics-only document', () => {
    const prepared = prepareImportedResume({ basics: { name: 'Alex' } });

    expect(prepared.basics).toEqual({ name: 'Alex' });
    expect(prepared.work).toEqual([]);
    expect(prepared.education).toEqual([]);
    expect(prepared.skills).toEqual([]);
    expect(prepared.projects).toEqual([]);
  });

  it('rejects non-object roots', () => {
    expect(() => prepareImportedResume([])).toThrow(InvalidImportedResumeError);
    expect(() => prepareImportedResume('resume')).toThrow(/JSON object/);
    expect(() => prepareImportedResume(null)).toThrow(InvalidImportedResumeError);
  });

  it('replaces non-array section values with empty arrays', () => {
    const prepared = prepareImportedResume({
      basics: { name: 'Alex' },
      work: 'invalid',
    });

    expect(prepared.work).toEqual([]);
  });
});
