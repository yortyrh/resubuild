import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Resume } from './resume';
import {
  assembleResume,
  dbRowToResumeItem,
  disassembleResume,
  headerToSlimCvData,
  resumeItemToDbPayload,
} from './resume-normalized';

const samplesDir = join(process.cwd(), '../../.samples/resumes/jsonresume');

function loadSampleResumes(): { name: string; resume: Resume }[] {
  const files = readdirSync(samplesDir).filter((f) => f.endsWith('.json'));
  return files.map((file) => ({
    name: file,
    resume: JSON.parse(readFileSync(join(samplesDir, file), 'utf-8')) as Resume,
  }));
}

function stripMeta(resume: Resume): Resume {
  const { meta, $schema, ...rest } = resume;
  void meta;
  void $schema;
  return rest;
}

function compareDateDesc(a?: string, b?: string): number {
  return (b ?? '').localeCompare(a ?? '');
}

function normalizeDateSections(resume: Resume): Resume {
  const normalized = { ...resume };

  if (normalized.work?.length) {
    normalized.work = [...normalized.work].sort((a, b) => {
      const byStart = compareDateDesc(a.startDate, b.startDate);
      if (byStart !== 0) return byStart;
      return compareDateDesc(a.endDate, b.endDate);
    });
  }

  if (normalized.volunteer?.length) {
    normalized.volunteer = [...normalized.volunteer].sort((a, b) => {
      const byStart = compareDateDesc(a.startDate, b.startDate);
      if (byStart !== 0) return byStart;
      return compareDateDesc(a.endDate, b.endDate);
    });
  }

  if (normalized.education?.length) {
    normalized.education = [...normalized.education].sort((a, b) => {
      const byStart = compareDateDesc(a.startDate, b.startDate);
      if (byStart !== 0) return byStart;
      return compareDateDesc(a.endDate, b.endDate);
    });
  }

  if (normalized.awards?.length) {
    normalized.awards = [...normalized.awards].sort((a, b) => compareDateDesc(a.date, b.date));
  }

  if (normalized.certificates?.length) {
    normalized.certificates = [...normalized.certificates].sort((a, b) =>
      compareDateDesc(a.date, b.date),
    );
  }

  if (normalized.publications?.length) {
    normalized.publications = [...normalized.publications].sort((a, b) =>
      compareDateDesc(a.releaseDate, b.releaseDate),
    );
  }

  if (normalized.projects?.length) {
    normalized.projects = [...normalized.projects].sort((a, b) => {
      const byStart = compareDateDesc(a.startDate, b.startDate);
      if (byStart !== 0) return byStart;
      return compareDateDesc(a.endDate, b.endDate);
    });
  }

  return normalized;
}

describe('resume-normalized round-trip', () => {
  const samples = loadSampleResumes();

  it.each(samples)('disassemble → assemble preserves content for $name', ({ resume }) => {
    const cvId = '00000000-0000-4000-8000-000000000001';
    const payload = disassembleResume(resume, cvId);
    const header = { id: cvId, user_id: 'user-1', ...payload.header };
    const assembled = assembleResume(header, payload.sections);

    expect(normalizeDateSections(stripMeta(assembled))).toEqual(
      normalizeDateSections(stripMeta(resume)),
    );
  });

  it('defaults empty jsonb arrays and location', () => {
    const cvId = '00000000-0000-4000-8000-000000000002';
    const payload = disassembleResume({ basics: { name: 'Test' } }, cvId);
    const header = { id: cvId, user_id: 'user-1', ...payload.header };
    const assembled = assembleResume(header, payload.sections);

    expect(assembled.basics?.location).toEqual({});
    expect(assembled.work).toBeUndefined();
    expect(assembled.skills).toBeUndefined();
  });

  it('orders work by start_date descending', () => {
    const cvId = '00000000-0000-4000-8000-000000000003';
    const resume: Resume = {
      work: [
        { name: 'Old', startDate: '2018-01', endDate: '2019-01' },
        { name: 'New', startDate: '2022-06', endDate: '2024-01' },
      ],
    };
    const payload = disassembleResume(resume, cvId);
    const header = { id: cvId, user_id: 'user-1', ...payload.header };
    const assembled = assembleResume(header, payload.sections);

    expect(assembled.work?.map((w) => w.name)).toEqual(['New', 'Old']);
  });

  it('orders skills by sort ascending', () => {
    const cvId = '00000000-0000-4000-8000-000000000004';
    const resume: Resume = {
      skills: [{ name: 'B' }, { name: 'A' }],
    };
    const payload = disassembleResume(resume, cvId);
    payload.sections.skills[0].sort = 1;
    payload.sections.skills[1].sort = 0;
    payload.sections.skills[0].id = '00000000-0000-4000-8000-000000000010';
    payload.sections.skills[1].id = '00000000-0000-4000-8000-000000000011';

    const header = { id: cvId, user_id: 'user-1', ...payload.header };
    const assembled = assembleResume(header, payload.sections);

    expect(assembled.skills?.map((s) => s.name)).toEqual(['A', 'B']);
  });

  it('includes stable row ids on assembled section items', () => {
    const cvId = '00000000-0000-4000-8000-000000000005';
    const workId = '00000000-0000-4000-8000-000000000020';
    const resume: Resume = {
      work: [{ name: 'Acme', position: 'Engineer', startDate: '2020-01' }],
    };
    const payload = disassembleResume(resume, cvId);
    payload.sections.work[0].id = workId;

    const header = { id: cvId, user_id: 'user-1', ...payload.header };
    const assembled = assembleResume(header, payload.sections);

    expect(assembled.work?.[0]).toMatchObject({ name: 'Acme', id: workId });
  });
});

describe('headerToSlimCvData', () => {
  it('returns basics from header columns only', () => {
    const data = headerToSlimCvData({
      id: 'cv-1',
      user_id: 'user-1',
      name: 'Alex',
      label: 'Dev',
      meta_version: 'v1.0.0',
      meta_canonical: 'https://app/cv/cv-1',
      location: { city: 'Paris' },
    });

    expect(data).not.toHaveProperty('meta');
    expect(data.basics).toMatchObject({ name: 'Alex', label: 'Dev', location: { city: 'Paris' } });
    expect(data).not.toHaveProperty('work');
    expect(data).not.toHaveProperty('profiles');
  });

  it('includes empty location when header has no scalar basics', () => {
    const data = headerToSlimCvData({
      id: 'cv-1',
      user_id: 'user-1',
    });

    expect(data).not.toHaveProperty('meta');
    expect(data.basics).toEqual({ location: {} });
  });
});

describe('dbRowToResumeItem', () => {
  it('includes row id and omits cv_id and sort', () => {
    expect(
      dbRowToResumeItem('work', {
        id: 'row-1',
        cv_id: 'cv-1',
        sort: 3,
        name: 'Acme',
        start_date: '2020-01',
      }),
    ).toEqual({
      id: 'row-1',
      name: 'Acme',
      startDate: '2020-01',
    });
  });
});

describe('resumeItemToDbPayload', () => {
  it('omits id, cv_id, and sort from update payloads', () => {
    expect(
      resumeItemToDbPayload('work', {
        id: 'row-1',
        cv_id: 'cv-1',
        sort: 2,
        name: 'Acme',
        startDate: '2020-01',
      }),
    ).toEqual({
      name: 'Acme',
      start_date: '2020-01',
    });
  });
});
