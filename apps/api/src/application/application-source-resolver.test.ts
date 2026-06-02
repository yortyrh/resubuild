import type { JobApplicationRow } from '@resumind/types';
import {
  APPLICATION_SNAPSHOT_CV_ID,
  parseSourceCvSnapshot,
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
});
