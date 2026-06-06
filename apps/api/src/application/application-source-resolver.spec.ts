import type { JobApplicationRow } from '@resubuild/types';
import {
  APPLICATION_SNAPSHOT_CV_ID,
  buildCvSummaryFromId,
  buildSourceCvSnapshot,
  deriveSourceCvTitle,
  parseSourceCvSnapshot,
  resolveApplicationSource,
  resumeToCvSummary,
} from './application-source-resolver';

describe('application-source-resolver', () => {
  const sampleResume = {
    basics: {
      name: 'Jane Doe',
      label: 'Engineer',
      summary: 'Backend specialist',
    },
    work: [{ highlights: ['APIs', 'Scale'] }],
    skills: [{ name: 'TypeScript' }],
  };

  it('omits name when basics name is blank', () => {
    expect(resumeToCvSummary({ basics: { name: '   ' }, work: [], skills: [] }, 'cv-1').name).toBe(
      undefined,
    );
  });

  it('builds CV summaries from resume JSON', () => {
    expect(resumeToCvSummary(sampleResume, 'cv-1')).toEqual({
      id: 'cv-1',
      title: 'Jane Doe — Engineer',
      name: 'Jane Doe',
      label: 'Engineer',
      summary: 'Backend specialist',
      workHighlights: ['APIs', 'Scale'],
      skills: ['TypeScript'],
    });
  });

  it('parses valid source CV snapshots', () => {
    expect(parseSourceCvSnapshot(sampleResume)).toEqual(sampleResume);
  });

  it('rejects invalid source CV snapshots', () => {
    expect(parseSourceCvSnapshot(null)).toBeNull();
    expect(parseSourceCvSnapshot({ work: [] })).toBeNull();
  });

  it('uses a stable workflow id for snapshot-only applications', () => {
    const row = {
      source_cv_id: null,
      intake_source_cv_id: null,
      source_cv_snapshot: sampleResume,
    } as unknown as JobApplicationRow;

    const snapshot = parseSourceCvSnapshot(row.source_cv_snapshot);
    expect(snapshot).not.toBeNull();
    expect(resumeToCvSummary(snapshot!, APPLICATION_SNAPSHOT_CV_ID).id).toBe(
      APPLICATION_SNAPSHOT_CV_ID,
    );
  });

  it('derives source CV title from snapshot', () => {
    expect(
      deriveSourceCvTitle({
        source_cv_snapshot: sampleResume,
      } as unknown as JobApplicationRow),
    ).toBe('Jane Doe — Engineer');
    expect(
      deriveSourceCvTitle({ source_cv_snapshot: null } as unknown as JobApplicationRow),
    ).toBeNull();
  });
});

describe('resolveApplicationSource', () => {
  const user = { id: 'u1', accessToken: 'tok' } as never;
  const sampleResume = {
    basics: { name: 'Jane Doe', label: 'Engineer' },
    work: [],
    skills: [],
  };

  it('returns live primary CV when available', async () => {
    const normalizedRepo = {
      createClientForUser: jest.fn().mockReturnValue({}),
      fetchHeader: jest.fn().mockResolvedValue({ id: 'cv-1', kind: 'primary' }),
      assembleFullResume: jest.fn().mockResolvedValue(sampleResume),
    };

    const resolved = await resolveApplicationSource(
      user,
      { source_cv_id: 'cv-1', intake_source_cv_id: null } as JobApplicationRow,
      normalizedRepo as never,
    );

    expect(resolved).toEqual(
      expect.objectContaining({
        workflowCvId: 'cv-1',
        liveSourceCvId: 'cv-1',
        fromSnapshot: false,
      }),
    );
  });

  it('skips non-primary headers before resolving a primary CV', async () => {
    const normalizedRepo = {
      createClientForUser: jest.fn().mockReturnValue({}),
      fetchHeader: jest
        .fn()
        .mockResolvedValueOnce({ id: 'cv-1', kind: 'application_clone' })
        .mockResolvedValueOnce({ id: 'cv-2', kind: 'primary' }),
      assembleFullResume: jest.fn().mockResolvedValue(sampleResume),
    };

    const resolved = await resolveApplicationSource(
      user,
      { source_cv_id: 'cv-1', intake_source_cv_id: 'cv-2' } as JobApplicationRow,
      normalizedRepo as never,
    );

    expect(resolved?.workflowCvId).toBe('cv-2');
    expect(normalizedRepo.assembleFullResume).toHaveBeenCalledTimes(1);
  });

  it('continues when assembleFullResume returns null for a primary CV', async () => {
    const normalizedRepo = {
      createClientForUser: jest.fn().mockReturnValue({}),
      fetchHeader: jest
        .fn()
        .mockResolvedValueOnce({ id: 'cv-1', kind: 'primary' })
        .mockResolvedValueOnce({ id: 'cv-2', kind: 'primary' }),
      assembleFullResume: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(sampleResume),
    };

    const resolved = await resolveApplicationSource(
      user,
      { source_cv_id: 'cv-1', intake_source_cv_id: 'cv-2' } as JobApplicationRow,
      normalizedRepo as never,
    );

    expect(resolved?.workflowCvId).toBe('cv-2');
  });

  it('falls back to intake source CV when primary source is not usable', async () => {
    const normalizedRepo = {
      createClientForUser: jest.fn().mockReturnValue({}),
      fetchHeader: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'cv-2', kind: 'primary' }),
      assembleFullResume: jest.fn().mockResolvedValue(sampleResume),
    };

    const resolved = await resolveApplicationSource(
      user,
      { source_cv_id: 'missing', intake_source_cv_id: 'cv-2' } as JobApplicationRow,
      normalizedRepo as never,
    );

    expect(resolved?.workflowCvId).toBe('cv-2');
  });

  it('returns snapshot-backed source when live CVs are unavailable', async () => {
    const normalizedRepo = {
      createClientForUser: jest.fn().mockReturnValue({}),
      fetchHeader: jest.fn().mockResolvedValue(null),
      assembleFullResume: jest.fn(),
    };

    const resolved = await resolveApplicationSource(
      user,
      {
        source_cv_id: null,
        intake_source_cv_id: null,
        source_cv_snapshot: sampleResume,
      } as unknown as JobApplicationRow,
      normalizedRepo as never,
    );

    expect(resolved).toEqual(
      expect.objectContaining({
        workflowCvId: APPLICATION_SNAPSHOT_CV_ID,
        liveSourceCvId: null,
        fromSnapshot: true,
      }),
    );
  });

  it('returns null when no source can be resolved', async () => {
    const normalizedRepo = {
      createClientForUser: jest.fn().mockReturnValue({}),
      fetchHeader: jest.fn().mockResolvedValue(null),
      assembleFullResume: jest.fn(),
    };

    await expect(
      resolveApplicationSource(
        user,
        {
          source_cv_id: null,
          intake_source_cv_id: null,
          source_cv_snapshot: null,
        } as JobApplicationRow,
        normalizedRepo as never,
      ),
    ).resolves.toBeNull();
  });
});

describe('buildSourceCvSnapshot', () => {
  const user = { id: 'u1', accessToken: 'tok' } as never;

  it('assembles resume JSON for a source CV id', async () => {
    const resume = { basics: { name: 'Jane Doe' }, work: [], skills: [] };
    const normalizedRepo = {
      createClientForUser: jest.fn().mockReturnValue({}),
      assembleFullResume: jest.fn().mockResolvedValue(resume),
    };

    await expect(buildSourceCvSnapshot(user, 'cv-1', normalizedRepo as never)).resolves.toEqual(
      resume,
    );
  });
});

describe('buildCvSummaryFromId', () => {
  const user = { id: 'u1', accessToken: 'tok' } as never;

  it('returns null when CV header is missing', async () => {
    const normalizedRepo = {
      createClientForUser: jest.fn().mockReturnValue({}),
      fetchHeader: jest.fn().mockResolvedValue(null),
      fetchSections: jest.fn(),
    };

    await expect(buildCvSummaryFromId(user, 'cv-1', normalizedRepo as never)).resolves.toBeNull();
  });

  it('builds a CV summary from stored sections', async () => {
    const normalizedRepo = {
      createClientForUser: jest.fn().mockReturnValue({}),
      fetchHeader: jest.fn().mockResolvedValue({
        name: 'Jane Doe',
        label: 'Engineer',
      }),
      fetchSections: jest.fn().mockResolvedValue({
        profiles: [],
        work: [],
        volunteer: [],
        education: [],
        awards: [],
        certificates: [],
        publications: [],
        skills: [{ name: 'TypeScript' }],
        languages: [],
        interests: [],
        references: [],
        projects: [],
      }),
    };

    await expect(buildCvSummaryFromId(user, 'cv-1', normalizedRepo as never)).resolves.toEqual(
      expect.objectContaining({
        id: 'cv-1',
        name: 'Jane Doe',
        skills: ['TypeScript'],
      }),
    );
  });
});
