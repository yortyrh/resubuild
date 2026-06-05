import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  InvalidImportedResumeError,
  prepareImportedResume,
  reclassifyVolunteerWorkEntries,
} from './prepare-imported-resume';

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

    expect(prepared.basics).toEqual({ name: 'Alex', profiles: [] });
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

  describe('basics.profiles normalization', () => {
    it('preserves a well-formed array of profile objects', () => {
      const prepared = prepareImportedResume({
        basics: {
          name: 'Alex',
          profiles: [
            { network: 'LinkedIn', username: 'alex', url: 'https://linkedin.com/in/alex' },
            { network: 'GitHub', username: 'alex' },
          ],
        },
      });

      const profiles = (prepared.basics as Record<string, unknown>).profiles;
      expect(Array.isArray(profiles)).toBe(true);
      expect(profiles).toHaveLength(2);
      expect(profiles).toEqual([
        expect.objectContaining({ network: 'LinkedIn', username: 'alex' }),
        expect.objectContaining({ network: 'GitHub' }),
      ]);
    });

    it('defaults to an empty array when basics.profiles is missing', () => {
      const prepared = prepareImportedResume({ basics: { name: 'Alex' } });

      expect(Array.isArray((prepared.basics as Record<string, unknown>).profiles)).toBe(true);
      expect((prepared.basics as Record<string, unknown>).profiles).toEqual([]);
    });

    it('coerces a single profile object to a one-element array', () => {
      const prepared = prepareImportedResume({
        basics: {
          name: 'Alex',
          profiles: { network: 'LinkedIn', username: 'alex' },
        },
      });

      const profiles = (prepared.basics as Record<string, unknown>).profiles;
      expect(Array.isArray(profiles)).toBe(true);
      expect(profiles).toEqual([{ network: 'LinkedIn', username: 'alex' }]);
    });

    it('coerces a string URL (e.g. a scraped sidebar link) to an empty array', () => {
      const prepared = prepareImportedResume({
        basics: {
          name: 'Alex',
          profiles: 'https://linkedin.com/in/alex',
        },
      });

      expect((prepared.basics as Record<string, unknown>).profiles).toEqual([]);
    });

    it('coerces null / undefined / numeric basics.profiles to an empty array', () => {
      const fromNull = prepareImportedResume({ basics: { name: 'Alex', profiles: null } });
      const fromUndefined = prepareImportedResume({
        basics: { name: 'Alex', profiles: undefined },
      });
      const fromNumber = prepareImportedResume({ basics: { name: 'Alex', profiles: 42 } });

      expect((fromNull.basics as Record<string, unknown>).profiles).toEqual([]);
      expect((fromUndefined.basics as Record<string, unknown>).profiles).toEqual([]);
      expect((fromNumber.basics as Record<string, unknown>).profiles).toEqual([]);
    });

    it('filters non-object entries from an otherwise-valid array', () => {
      const prepared = prepareImportedResume({
        basics: {
          name: 'Alex',
          profiles: [
            { network: 'LinkedIn', username: 'alex' },
            'https://github.com/alex',
            null,
            42,
            { network: 'GitHub', username: 'alex' },
          ],
        },
      });

      const profiles = (prepared.basics as Record<string, unknown>).profiles as unknown[];
      expect(profiles).toHaveLength(2);
      expect(profiles[0]).toEqual({ network: 'LinkedIn', username: 'alex' });
      expect(profiles[1]).toEqual({ network: 'GitHub', username: 'alex' });
    });

    it('does not crash when basics is missing entirely', () => {
      const prepared = prepareImportedResume({ work: [] });

      expect(prepared.basics).toBeUndefined();
      expect(prepared.work).toEqual([]);
    });
  });

  it('moves volunteer work entries from work to volunteer on import', () => {
    const prepared = prepareImportedResume({
      basics: { name: 'Mariela Romero Mederos' },
      work: [
        {
          name: 'Good Shepherd',
          position: 'Kitchen Assistant',
          location: 'Hamilton, ON',
          startDate: '2023-09',
          endDate: '2024-04',
          summary:
            'Volunteer/part-time role supporting kitchen and community meal service operations.',
          highlights: [
            'Supported kitchen operations, food preparation, and food safety standards.',
            'Contributed to community meal service.',
          ],
        },
        {
          name: 'InterRent REIT',
          position: 'Property Cleaner',
          location: 'Burlington, ON',
          startDate: '2023-09',
          summary: 'Cleaning and property maintenance for residential buildings and common areas.',
        },
      ],
    });

    expect(prepared.work).toHaveLength(1);
    expect(prepared.work).toEqual([
      expect.objectContaining({
        name: 'InterRent REIT',
        position: 'Property Cleaner',
      }),
    ]);
    expect(prepared.volunteer).toEqual([
      expect.objectContaining({
        organization: 'Good Shepherd',
        position: 'Kitchen Assistant',
        startDate: '2023-09',
        endDate: '2024-04',
        summary:
          'Volunteer/part-time role supporting kitchen and community meal service operations.',
        highlights: expect.arrayContaining([
          'Supported kitchen operations, food preparation, and food safety standards.',
        ]),
      }),
    ]);
    const volunteerEntry = (prepared.volunteer as Record<string, unknown>[])[0];
    expect(volunteerEntry).not.toHaveProperty('name');
    expect(volunteerEntry).not.toHaveProperty('location');
    expect(volunteerEntry).not.toHaveProperty('description');
  });

  it('keeps paid work when employer name contains Volunteer', () => {
    const prepared = reclassifyVolunteerWorkEntries({
      work: [
        {
          name: 'Volunteer State Community College',
          position: 'Adjunct Instructor',
          summary: 'Taught introductory programming courses.',
        },
      ],
      volunteer: [],
    });

    expect(prepared.work).toHaveLength(1);
    expect(prepared.volunteer).toEqual([]);
  });

  describe('XML-style { item: [...] } wrapper unwrapping', () => {
    it('unwraps top-level array sections wrapped as { item: [...] }', () => {
      const prepared = prepareImportedResume({
        basics: { name: 'Yorty' },
        work: { item: [{ name: 'Acme', position: 'Engineer' }] },
        education: { item: { institution: 'U' } },
        skills: { item: [{ name: 'JS' }] },
      });

      expect(prepared.work).toEqual([{ name: 'Acme', position: 'Engineer' }]);
      expect(prepared.education).toEqual([{ institution: 'U' }]);
      expect(prepared.skills).toEqual([{ name: 'JS' }]);
    });

    it('unwraps nested array properties (e.g. highlights, keywords) wrapped as { item: [...] }', () => {
      const prepared = prepareImportedResume({
        basics: { name: 'Yorty' },
        work: [
          {
            name: 'Acme',
            position: 'Engineer',
            highlights: { item: ['Did things', 'Did more things'] },
          },
        ],
        skills: [
          {
            name: 'Backend',
            keywords: { item: ['Node.js', 'NestJS', 'PostgreSQL'] },
          },
        ],
      });

      expect(prepared.work).toEqual([
        {
          name: 'Acme',
          position: 'Engineer',
          highlights: ['Did things', 'Did more things'],
        },
      ]);
      expect(prepared.skills).toEqual([
        {
          name: 'Backend',
          keywords: ['Node.js', 'NestJS', 'PostgreSQL'],
        },
      ]);
    });

    it('unwraps basics.profiles wrapped as { item: [...] }', () => {
      const prepared = prepareImportedResume({
        basics: {
          name: 'Yorty',
          profiles: {
            item: [
              { network: 'GitHub', username: 'yorty' },
              { network: 'LinkedIn', username: 'yortyrh' },
            ],
          },
        },
      });

      expect((prepared.basics as Record<string, unknown>).profiles).toEqual([
        { network: 'GitHub', username: 'yorty' },
        { network: 'LinkedIn', username: 'yortyrh' },
      ]);
    });

    it('preserves a full document emitted by an MCP agent (real-world shape)', () => {
      // Mirrors the exact shape sent by the MCP agent in the bug report:
      // every array field is wrapped as { item: [...] } including nested ones.
      const raw = {
        basics: {
          name: 'Yorty Ruiz Hernández',
          label: 'Lead Software Engineer',
          email: 'yorty@example.com',
          phone: '+1 365 833 4392',
          summary: 'Lead / Staff-level Software Engineer.',
          location: { city: 'Stoney Creek', region: 'Ontario', countryCode: 'CA' },
          profiles: {
            item: [
              { network: 'GitHub', username: 'yorty', url: 'https://github.com/yorty' },
              { network: 'LinkedIn', username: 'yortyrh' },
            ],
          },
        },
        work: {
          item: [
            {
              name: 'Acme',
              position: 'Lead Engineer',
              location: 'Canada',
              startDate: '2023-07',
              highlights: { item: ['Did A', 'Did B'] },
            },
            {
              name: 'Beta',
              position: 'Engineer',
              startDate: '2021-01',
              endDate: '2023-06',
              highlights: { item: ['Did C'] },
            },
          ],
        },
        education: { item: { institution: 'U', area: 'CS' } },
        skills: { item: [{ name: 'Backend', keywords: { item: ['Node', 'NestJS'] } }] },
        languages: { item: [{ language: 'English', fluency: 'Fluent' }] },
        references: { item: [{ name: 'Ref', reference: 'Great.' }] },
      };

      const prepared = prepareImportedResume(raw);

      expect(prepared.work).toEqual([
        {
          name: 'Acme',
          position: 'Lead Engineer',
          location: 'Canada',
          startDate: '2023-07',
          highlights: ['Did A', 'Did B'],
        },
        {
          name: 'Beta',
          position: 'Engineer',
          startDate: '2021-01',
          endDate: '2023-06',
          highlights: ['Did C'],
        },
      ]);
      expect(prepared.education).toEqual([{ institution: 'U', area: 'CS' }]);
      expect(prepared.skills).toEqual([{ name: 'Backend', keywords: ['Node', 'NestJS'] }]);
      expect(prepared.languages).toEqual([{ language: 'English', fluency: 'Fluent' }]);
      expect(prepared.references).toEqual([{ name: 'Ref', reference: 'Great.' }]);
      expect((prepared.basics as Record<string, unknown>).profiles).toEqual([
        { network: 'GitHub', username: 'yorty', url: 'https://github.com/yorty' },
        { network: 'LinkedIn', username: 'yortyrh' },
      ]);
    });

    it('does not unwrap objects that happen to have an "item" key but are not { item: [...] } wrappers', () => {
      const prepared = prepareImportedResume({
        basics: { name: 'Yorty' },
        work: [
          {
            name: 'Acme',
            position: 'Engineer',
            item: 'not-an-array',
          },
        ],
      });

      // The wrapper heuristic only unwraps { item: Array }, not arbitrary "item" keys.
      expect(prepared.work).toEqual([{ name: 'Acme', position: 'Engineer', item: 'not-an-array' }]);
    });
  });
});
