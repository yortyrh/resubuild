import { describe, expect, it } from 'vitest';
import { JSON_RESUME_SCHEMA_URI, prepareExportedResume } from './prepare-exported-resume';
import { prepareImportedResume } from './prepare-imported-resume';
import type { Resume } from './resume';
import type { CvHeaderRow, NormalizedCvSections } from './resume-normalized';
import { assembleResume } from './resume-normalized';

const emptySections: NormalizedCvSections = {
  profiles: [],
  work: [],
  volunteer: [],
  education: [],
  awards: [],
  certificates: [],
  publications: [],
  skills: [],
  languages: [],
  interests: [],
  references: [],
  projects: [],
};

describe('prepareExportedResume', () => {
  it('strips internal row ids from work items and profiles', () => {
    const header: CvHeaderRow = {
      id: 'cv-1',
      user_id: 'u1',
      name: 'Jane Doe',
      updated_at: '2024-06-01T12:00:00.000Z',
    };
    const sections: NormalizedCvSections = {
      ...emptySections,
      profiles: [
        {
          id: 'p1',
          cv_id: 'cv-1',
          sort: 0,
          network: 'GitHub',
          username: 'jane',
        },
      ],
      work: [
        {
          id: 'w1',
          cv_id: 'cv-1',
          name: 'Acme',
          position: 'Engineer',
          start_date: '2020-01',
          highlights: ['Shipped features'],
        },
      ],
    };

    const assembled = assembleResume(header, sections);
    const exported = prepareExportedResume(assembled, {
      updatedAt: header.updated_at!,
    });

    const work = exported.work as Record<string, unknown>[];
    expect(work[0]).not.toHaveProperty('id');
    expect(work[0]).toMatchObject({
      name: 'Acme',
      position: 'Engineer',
      highlights: ['Shipped features'],
    });

    const profiles = (exported.basics as Record<string, unknown>).profiles as Record<
      string,
      unknown
    >[];
    expect(profiles[0]).not.toHaveProperty('id');
    expect(profiles[0]).toMatchObject({ network: 'GitHub', username: 'jane' });
  });

  it('omits empty top-level sections', () => {
    const resume: Resume = {
      basics: { name: 'Alex' },
    };

    const exported = prepareExportedResume(resume, {
      updatedAt: '2024-01-15T08:30:00.000Z',
    });

    expect(exported).not.toHaveProperty('volunteer');
    expect(exported).not.toHaveProperty('references');
    expect(exported).not.toHaveProperty('work');
    expect(exported.basics).toEqual({ name: 'Alex' });
  });

  it('includes schema and meta from updatedAt', () => {
    const exported = prepareExportedResume(
      { basics: { name: 'Jane' } },
      { updatedAt: '2024-03-10T16:45:00.000Z', version: 'v2' },
    );

    expect(exported.$schema).toBe(JSON_RESUME_SCHEMA_URI);
    expect(exported.meta).toEqual({
      lastModified: '2024-03-10T16:45:00.000Z',
      version: 'v2',
    });
  });

  it('round-trips through prepareImportedResume preserving content', () => {
    const header: CvHeaderRow = {
      id: 'cv-1',
      user_id: 'u1',
      name: 'Jane Doe',
      label: 'Engineer',
      updated_at: '2024-06-01T12:00:00.000Z',
    };
    const sections: NormalizedCvSections = {
      ...emptySections,
      work: [
        {
          id: 'w1',
          cv_id: 'cv-1',
          name: 'Acme Corp',
          position: 'Senior Engineer',
          start_date: '2020-01',
          highlights: ['Led migration'],
        },
      ],
    };

    const exported = prepareExportedResume(assembleResume(header, sections), {
      updatedAt: header.updated_at!,
    });
    const reimported = prepareImportedResume(exported);

    expect(reimported).not.toHaveProperty('$schema');
    expect(reimported).not.toHaveProperty('meta');
    expect(reimported.basics).toEqual(
      expect.objectContaining({ name: 'Jane Doe', label: 'Engineer' }),
    );
    expect(reimported.work).toEqual([
      {
        name: 'Acme Corp',
        position: 'Senior Engineer',
        startDate: '2020-01',
        highlights: ['Led migration'],
      },
    ]);
  });
});
