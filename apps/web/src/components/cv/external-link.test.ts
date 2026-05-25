import { describe, expect, it } from 'vitest';
import { normalizeResumeUrl } from './external-link';

describe('normalizeResumeUrl', () => {
  it('returns null for empty string', () => {
    expect(normalizeResumeUrl('')).toBeNull();
  });

  it('returns null for whitespace-only string', () => {
    expect(normalizeResumeUrl('   ')).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(normalizeResumeUrl(undefined)).toBeNull();
  });

  it('returns null for null', () => {
    expect(normalizeResumeUrl(null)).toBeNull();
  });

  it('passes through https:// URLs unchanged', () => {
    expect(normalizeResumeUrl('https://example.com')).toBe('https://example.com');
  });

  it('passes through http:// URLs unchanged', () => {
    expect(normalizeResumeUrl('http://example.com')).toBe('http://example.com');
  });

  it('passes through mailto: URLs unchanged', () => {
    expect(normalizeResumeUrl('mailto:user@example.com')).toBe('mailto:user@example.com');
  });

  it('passes through tel: URLs unchanged', () => {
    expect(normalizeResumeUrl('tel:+1234567890')).toBe('tel:+1234567890');
  });

  it('prepends https:// to bare hostnames', () => {
    expect(normalizeResumeUrl('example.com')).toBe('https://example.com');
  });

  it('prepends https:// to bare hostnames with paths', () => {
    expect(normalizeResumeUrl('linkedin.com/in/user')).toBe('https://linkedin.com/in/user');
  });

  it('rejects javascript: scheme', () => {
    expect(normalizeResumeUrl('javascript:alert(1)')).toBeNull();
  });

  it('rejects data: scheme', () => {
    expect(normalizeResumeUrl('data:text/html,<h1>hi</h1>')).toBeNull();
  });

  it('rejects ftp: scheme', () => {
    expect(normalizeResumeUrl('ftp://files.example.com')).toBeNull();
  });

  it('trims leading/trailing whitespace before processing', () => {
    expect(normalizeResumeUrl('  https://example.com  ')).toBe('https://example.com');
  });
});
