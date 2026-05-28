import type { Resume } from '@resumind/types';
import { describe, expect, it } from 'vitest';
import { renderMarkdownField } from './render-markdown-field';
import { renderResumeHtml } from './render-resume-html';

const sampleResume: Resume = {
  basics: {
    name: 'Jane Doe',
    summary: 'Experienced engineer.',
  },
  work: [
    {
      name: 'Acme Corp',
      position: 'Senior Engineer',
      startDate: '2020-01',
      endDate: '2024-06',
    },
  ],
  education: [
    {
      institution: 'MIT',
      studyType: 'B.S.',
      area: 'Computer Science',
      startDate: '2014-09',
      endDate: '2018-06',
    },
  ],
  skills: [
    {
      name: 'Languages',
      keywords: ['TypeScript', 'Python'],
    },
  ],
};

describe('renderResumeHtml', () => {
  it('orders experience before education when both are present', () => {
    const html = renderResumeHtml(sampleResume);
    const experienceIndex = html.indexOf('id="experience-heading"');
    const educationIndex = html.indexOf('id="education-heading"');
    expect(experienceIndex).toBeGreaterThan(-1);
    expect(educationIndex).toBeGreaterThan(-1);
    expect(experienceIndex).toBeLessThan(educationIndex);
  });

  it('renders work entries with employer bold before italic position', () => {
    const html = renderResumeHtml(sampleResume);
    expect(html).toContain('Acme Corp');
    expect(html).toContain('font-bold');
    expect(html).toContain('<p class="italic text-neutral-900 mt-0.5">Senior Engineer</p>');
  });

  it('renders skills as bold category with comma-separated keywords', () => {
    const html = renderResumeHtml(sampleResume);
    expect(html).toContain('<strong>Languages:</strong> TypeScript, Python');
  });

  it('includes visible SUMMARY section heading', () => {
    const html = renderResumeHtml(sampleResume);
    expect(html).toContain('id="summary-heading"');
    expect(html).toContain('>Summary<');
  });
});

describe('renderMarkdownField', () => {
  it('sanitizes markdown to safe html', () => {
    const html = renderMarkdownField('**Bold** and [link](https://example.com)');
    expect(html).toContain('<strong>Bold</strong>');
    expect(html).toContain('href="https://example.com"');
  });

  it('strips script tags', () => {
    const html = renderMarkdownField('<script>alert(1)</script>Hello');
    expect(html).not.toContain('<script');
    expect(html).toContain('Hello');
  });
});
