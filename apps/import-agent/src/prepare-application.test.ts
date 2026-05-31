import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyCoverLetterCandidateName,
  buildFallbackEmailSubject,
  rankCvForJobTool,
  resolveCandidateName,
  runPrepareApplicationWorkflow,
  runUpdateApplicationWorkflow,
  summarizeJobPostingTool,
} from './workflows/prepare-application.workflow';

describe('prepare application workflow', () => {
  const generateJson = vi.fn();
  const generateText = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    generateJson.mockImplementation(async (prompt: string) => {
      if (prompt.includes('Summarize job postings') || prompt.includes('title, company')) {
        return {
          title: 'Senior Engineer',
          company: 'Acme',
          requirements: ['React'],
          keywords: ['frontend'],
          language: 'en',
        };
      }
      if (prompt.includes('selectedCvId')) {
        return { selectedCvId: 'cv-2', rationale: 'Strong React experience' };
      }
      if (
        prompt.includes('JSON patch') ||
        prompt.includes('clone patches') ||
        prompt.includes('Current tailored resume')
      ) {
        return {
          basics: { label: 'Senior Engineer' },
          work: [{ index: 0, highlights: ['**Built design system**'] }],
        };
      }
      return {};
    });
    generateText.mockResolvedValue('Dear hiring team,\n\nI am excited to apply.');
  });

  it('runs text intake end-to-end with mocked LLM', async () => {
    const result = await runPrepareApplicationWorkflow({
      sourceType: 'text',
      text: 'We need a senior engineer with React experience.',
      cvSummaries: [
        { id: 'cv-1', title: 'Designer', workHighlights: [], skills: [] },
        { id: 'cv-2', title: 'Engineer', workHighlights: ['React apps'], skills: ['React'] },
      ],
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'test-key',
      generateJson,
      generateText,
    });

    expect(result.errors).toEqual([]);
    expect(result.sourceCvId).toBe('cv-2');
    expect(result.jobSummary.company).toBe('Acme');
    expect(result.coverLetter).toContain('Dear hiring team');
    expect(result.coverLetterEmailSubject).toBe('Application — Senior Engineer at Acme');
    expect(result.tailorPatch.basics?.label).toBe('Senior Engineer');
  });

  it('uses user-selected source CV without ranking', async () => {
    const result = await runPrepareApplicationWorkflow({
      sourceType: 'text',
      text: 'Backend role',
      sourceCvId: 'cv-1',
      cvSummaries: [{ id: 'cv-1', title: 'Backend', workHighlights: [], skills: [] }],
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'test-key',
      generateJson,
      generateText,
    });

    expect(result.sourceCvId).toBe('cv-1');
    expect(result.selectionRationale).toContain('User selected');
    expect(generateJson).not.toHaveBeenCalledWith(
      expect.stringContaining('Pick the best matching CV'),
    );
  });

  it('auto-selects single CV', async () => {
    const ranked = await rankCvForJobTool(
      { title: 'Dev', company: 'Co', requirements: [], keywords: [] },
      'job text',
      [{ id: 'only', title: 'Only CV', workHighlights: [], skills: [] }],
      undefined,
      'model',
      'key',
      generateJson,
    );

    expect(ranked.sourceCvId).toBe('only');
  });

  it('surfaces URL fetch errors', async () => {
    const result = await runPrepareApplicationWorkflow({
      sourceType: 'url',
      url: 'https://example.com/jobs/1',
      cvSummaries: [{ id: 'cv-1', title: 'CV', workHighlights: [], skills: [] }],
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'test-key',
      generateJson,
      generateText,
      fetchJobUrl: async () => {
        throw new Error('network');
      },
    });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('pasting');
  });

  it('runs update workflow using current resume and cover letter context', async () => {
    const result = await runUpdateApplicationWorkflow({
      jobSummary: {
        title: 'Senior Engineer',
        company: 'Acme',
        requirements: ['React'],
        keywords: [],
      },
      jobRawText: 'We need React leadership.',
      userMessage: 'Emphasize team lead experience',
      currentResume: {
        basics: { name: 'Jane Doe', label: 'Engineer' },
        work: [{ name: 'Acme', highlights: ['Built design system'] }],
      },
      currentCoverLetter: 'Dear team,\n\nPrevious draft about React.',
      cvSummaries: [
        { id: 'cv-1', title: 'Engineer', workHighlights: ['React apps'], skills: ['React'] },
      ],
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'test-key',
      generateJson,
      generateText,
    });

    expect(result.errors).toEqual([]);
    expect(result.sourceCvId).toBe('cv-1');
    expect(result.coverLetter).toContain('Dear hiring team');
    expect(generateText).toHaveBeenCalledWith(
      expect.stringContaining('Previous draft about React'),
    );
    expect(generateJson).toHaveBeenCalledWith(expect.stringContaining('Current tailored resume'));
  });
});

describe('summarizeJobPostingTool', () => {
  it('parses structured summary', async () => {
    const summary = await summarizeJobPostingTool(
      'Senior Dev at Acme — React required',
      'model',
      'key',
      async () => ({
        title: 'Senior Dev',
        company: 'Acme',
        requirements: ['React'],
        keywords: ['typescript'],
        language: 'en',
      }),
    );

    expect(summary.title).toBe('Senior Dev');
    expect(summary.requirements).toContain('React');
  });
});

describe('cover letter candidate name', () => {
  it('builds fallback email subject from job summary', () => {
    expect(buildFallbackEmailSubject({ title: 'Engineer', company: 'Acme' })).toBe(
      'Application — Engineer at Acme',
    );
  });

  it('replaces [Your Name] placeholders', () => {
    expect(applyCoverLetterCandidateName('Sincerely,\n\n**[Your Name]**', 'Jane Doe')).toBe(
      'Sincerely,\n\nJane Doe',
    );
  });

  it('prefers CV name over account display name', () => {
    expect(
      resolveCandidateName(
        { id: '1', title: 'CV', name: 'Jane Doe', workHighlights: [], skills: [] },
        'John Smith',
      ),
    ).toBe('Jane Doe');
  });

  it('falls back to account display name', () => {
    expect(
      resolveCandidateName({ id: '1', title: 'CV', workHighlights: [], skills: [] }, 'John Smith'),
    ).toBe('John Smith');
  });

  it('fills placeholder in workflow output when name is on CV summary', async () => {
    const generateJson = vi.fn().mockImplementation(async (prompt: string) => {
      if (prompt.includes('title, company') || prompt.includes('Summarize')) {
        return {
          title: 'Engineer',
          company: 'Acme',
          requirements: [],
          keywords: [],
          language: 'en',
        };
      }
      if (prompt.includes('selectedCvId')) {
        return { selectedCvId: 'cv-1', rationale: 'match' };
      }
      if (prompt.includes('emailSubject')) {
        return {
          emailSubject: 'Jane Doe — Engineering Manager application',
          coverLetter: 'Dear team,\n\nThanks.\n\nSincerely,\n\n**[Your Name]**',
        };
      }
      return { basics: { label: 'Engineer' } };
    });
    const generateText = vi
      .fn()
      .mockResolvedValue('Dear team,\n\nThanks.\n\nSincerely,\n\n**[Your Name]**');

    const result = await runPrepareApplicationWorkflow({
      sourceType: 'text',
      text: 'Job description',
      cvSummaries: [
        {
          id: 'cv-1',
          title: 'Jane — Engineer',
          name: 'Jane Doe',
          workHighlights: [],
          skills: [],
        },
      ],
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'test-key',
      generateJson,
    });

    expect(result.coverLetter).toContain('Jane Doe');
    expect(result.coverLetter).not.toContain('[Your Name]');
    expect(result.coverLetterEmailSubject).toBe('Jane Doe - Engineering Manager application');
  });
});
