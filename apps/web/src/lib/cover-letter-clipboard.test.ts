import { describe, expect, it } from 'vitest';
import {
  buildFallbackEmailSubject,
  formatCoverLetterHtmlForClipboard,
  formatCoverLetterPlainText,
  resolveCoverLetterEmailSubject,
} from './cover-letter-clipboard';

describe('cover-letter-clipboard', () => {
  it('builds fallback subject from job metadata', () => {
    expect(buildFallbackEmailSubject('Engineering Manager', 'Acme')).toBe(
      'Application — Engineering Manager at Acme',
    );
    expect(buildFallbackEmailSubject('Engineering Manager', null)).toBe(
      'Application — Engineering Manager',
    );
  });

  it('prefers stored email subject', () => {
    expect(
      resolveCoverLetterEmailSubject('Jane Doe — Engineering Manager application', 'Dev', 'Co'),
    ).toBe('Jane Doe — Engineering Manager application');
  });

  it('formats plain text with subject header', () => {
    expect(formatCoverLetterPlainText('Apply for Dev', 'Dear team,')).toBe(
      'Email subject: Apply for Dev\n\nDear team,',
    );
  });

  it('formats html clipboard without document title', () => {
    const html =
      '<!DOCTYPE html><html><head><title>Cover letter</title></head><body><p>Hello</p></body></html>';
    const result = formatCoverLetterHtmlForClipboard('Apply for Dev', html);
    expect(result).toContain('<strong>Email subject:</strong> Apply for Dev');
    expect(result).toContain('<p>Hello</p>');
    expect(result).not.toContain('Cover letter');
    expect(result).not.toContain('<title>');
  });
});
