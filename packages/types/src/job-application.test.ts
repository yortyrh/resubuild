import { describe, expect, it } from 'vitest';
import { type JobApplicationRow, jobApplicationRowToDetail } from './job-application';

function baseRow(overrides: Partial<JobApplicationRow> = {}): JobApplicationRow {
  return {
    id: 'app-1',
    user_id: 'user-1',
    status: 'ready',
    job_source_type: 'url',
    job_raw_text: 'Full posting text',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-02T00:00:00.000Z',
    ...overrides,
  };
}

describe('jobApplicationRowToDetail job posting trace', () => {
  it('maps the job source URL, file name and summary', () => {
    const summary = {
      requirements: ['5+ years of TypeScript', 'Team leadership'],
      keywords: ['NestJS', 'PostgreSQL'],
      language: 'es',
    };

    const detail = jobApplicationRowToDetail(
      baseRow({
        job_source_url: 'https://jobs.example.com/123',
        job_source_file_name: 'job-offer.pdf',
        job_summary: summary,
      }),
    );

    expect(detail.jobSourceUrl).toBe('https://jobs.example.com/123');
    expect(detail.jobSourceFileName).toBe('job-offer.pdf');
    expect(detail.jobSummary).toEqual(summary);
    expect(detail.jobRawText).toBe('Full posting text');
    expect(detail.jobSourceType).toBe('url');
  });

  it('keeps a summary without language as stored', () => {
    const detail = jobApplicationRowToDetail(
      baseRow({ job_summary: { requirements: [], keywords: [], language: null } }),
    );

    expect(detail.jobSummary).toStrictEqual({ requirements: [], keywords: [], language: null });
  });

  it('passes null trace fields through as null', () => {
    const detail = jobApplicationRowToDetail(
      baseRow({ job_source_url: null, job_source_file_name: null, job_summary: null }),
    );

    expect(detail.jobSourceUrl).toBeNull();
    expect(detail.jobSourceFileName).toBeNull();
    expect(detail.jobSummary).toBeNull();
  });

  it('leaves trace fields undefined when the row does not have them', () => {
    const detail = jobApplicationRowToDetail(baseRow());

    expect(detail.jobSourceUrl).toBeUndefined();
    expect(detail.jobSourceFileName).toBeUndefined();
    expect(detail.jobSummary).toBeUndefined();
  });
});
