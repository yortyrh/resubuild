import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Resume } from './resume';
import {
  assembleResume,
  compareEndDateDescNullsFirst,
  dbRowToResumeItem,
  disassembleResume,
  headerToSlimCvData,
  resumeItemToDbPayload,
  sortWorkRows,
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

function compareEndDateNullsFirst(a?: string, b?: string): number {
  const aEmpty = !a;
  const bEmpty = !b;
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return -1;
  if (bEmpty) return 1;
  return compareDateDesc(a, b);
}

function normalizeDateSections(resume: Resume): Resume {
  const normalized = { ...resume };

  if (normalized.work?.length) {
    normalized.work = [...normalized.work].sort((a, b) => {
      const byEnd = compareEndDateNullsFirst(a.endDate, b.endDate);
      if (byEnd !== 0) return byEnd;
      const byStart = compareDateDesc(a.startDate, b.startDate);
      if (byStart !== 0) return byStart;
      return (a.id ?? '').localeCompare(b.id ?? '');
    });
  }

  if (normalized.volunteer?.length) {
    normalized.volunteer = [...normalized.volunteer].sort((a, b) => {
      const byEnd = compareEndDateNullsFirst(a.endDate, b.endDate);
      if (byEnd !== 0) return byEnd;
      const byStart = compareDateDesc(a.startDate, b.startDate);
      if (byStart !== 0) return byStart;
      return (a.id ?? '').localeCompare(b.id ?? '');
    });
  }

  if (normalized.education?.length) {
    normalized.education = [...normalized.education].sort((a, b) => {
      const byEnd = compareEndDateNullsFirst(a.endDate, b.endDate);
      if (byEnd !== 0) return byEnd;
      const byStart = compareDateDesc(a.startDate, b.startDate);
      if (byStart !== 0) return byStart;
      return (a.id ?? '').localeCompare(b.id ?? '');
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
      const byEnd = compareEndDateNullsFirst(a.endDate, b.endDate);
      if (byEnd !== 0) return byEnd;
      const byStart = compareDateDesc(a.startDate, b.startDate);
      if (byStart !== 0) return byStart;
      return (a.id ?? '').localeCompare(b.id ?? '');
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

  it('orders work by end_date descending with ongoing entries first', () => {
    const cvId = '00000000-0000-4000-8000-000000000003';
    const resume: Resume = {
      work: [
        { name: 'Past', startDate: '2018-01', endDate: '2019-01' },
        { name: 'Current', startDate: '2022-06' },
        { name: 'RecentPast', startDate: '2020-01', endDate: '2024-01' },
      ],
    };
    const payload = disassembleResume(resume, cvId);
    payload.sections.work[0].id = '00000000-0000-4000-8000-000000000030';
    payload.sections.work[1].id = '00000000-0000-4000-8000-000000000031';
    payload.sections.work[2].id = '00000000-0000-4000-8000-000000000032';
    const header = { id: cvId, user_id: 'user-1', ...payload.header };
    const assembled = assembleResume(header, payload.sections);

    expect(assembled.work?.map((w) => w.name)).toEqual(['Current', 'RecentPast', 'Past']);
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

describe('sortWorkRows', () => {
  it('ranks ongoing entries before dated entries', () => {
    const sorted = sortWorkRows([
      {
        id: 'b',
        cv_id: 'cv-1',
        start_date: '2018-01',
        end_date: '2020-01',
      },
      {
        id: 'a',
        cv_id: 'cv-1',
        start_date: '2022-01',
        end_date: null,
      },
    ]);
    expect(sorted.map((row) => row.id)).toEqual(['a', 'b']);
  });

  it('uses start_date then id as tiebreakers', () => {
    const sorted = sortWorkRows([
      {
        id: 'z',
        cv_id: 'cv-1',
        start_date: '2019-01',
        end_date: '2021-01',
      },
      {
        id: 'a',
        cv_id: 'cv-1',
        start_date: '2020-01',
        end_date: '2021-01',
      },
    ]);
    expect(sorted.map((row) => row.id)).toEqual(['a', 'z']);
  });
});

describe('compareEndDateDescNullsFirst', () => {
  it('treats empty end dates as ongoing (sort first)', () => {
    expect(compareEndDateDescNullsFirst(null, '2024-01')).toBeLessThan(0);
    expect(compareEndDateDescNullsFirst('', '2024-01')).toBeLessThan(0);
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

  it('persists hidden volunteer storage fields on create payloads', () => {
    expect(
      resumeItemToDbPayload('volunteer', {
        organization: 'NPO',
        location: 'Remote',
        description: 'Contract',
        startDate: '2020-01',
      }),
    ).toEqual({
      organization: 'NPO',
      location: 'Remote',
      description: 'Contract',
      start_date: '2020-01',
    });
  });
});

describe('volunteer hidden storage export', () => {
  it('includes hidden fields in editor API rows but omits them from assembleResume export', () => {
    const editorItem = dbRowToResumeItem('volunteer', {
      id: 'v1',
      cv_id: 'cv-1',
      organization: 'NPO',
      location: 'Remote',
      description: 'Hidden role',
      start_date: '2020-01',
      highlights: [],
    });

    expect(editorItem).toMatchObject({
      id: 'v1',
      organization: 'NPO',
      location: 'Remote',
      description: 'Hidden role',
    });

    const resume = assembleResume(
      { id: 'cv-1', user_id: 'user-1' },
      {
        profiles: [],
        work: [],
        volunteer: [
          {
            id: 'v1',
            cv_id: 'cv-1',
            organization: 'NPO',
            location: 'Remote',
            description: 'Hidden role',
            start_date: '2020-01',
            highlights: [],
          },
        ],
        education: [],
        awards: [],
        certificates: [],
        publications: [],
        skills: [],
        languages: [],
        interests: [],
        references: [],
        projects: [],
      },
    );

    expect(resume.volunteer?.[0]).toEqual({
      id: 'v1',
      organization: 'NPO',
      startDate: '2020-01',
    });
  });
});
