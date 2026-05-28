import type { Resume } from '@resumind/types';
import { describe, expect, it } from 'vitest';
import { renderMarkdownField } from './render-markdown-field';
import { renderResumeHtml } from './render-resume-html';
import { sampleResume } from './templates/capd-factory';

describe('renderResumeHtml', () => {
  it('orders experience before education when both are present (default template)', () => {
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
    expect(html).toContain('>SUMMARY<');
  });

  it('accepts explicit template id', () => {
    const html = renderResumeHtml(sampleResume, 'capd-global');
    expect(html).toContain('data-template="capd-global"');
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
