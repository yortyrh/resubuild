import { describe, expect, it } from 'vitest';
import { formatJobPostingPlainText } from './job-posting-clipboard';

describe('formatJobPostingPlainText', () => {
  it('formats position, company, source and the posting text', () => {
    expect(
      formatJobPostingPlainText({
        jobTitle: 'Senior Engineer',
        jobCompany: 'Acme',
        jobSourceUrl: 'https://jobs.example.com/123',
        jobRawText: 'We are hiring.\n\nRequirements:\n- TypeScript',
      }),
    ).toBe(
      'Position: Senior Engineer\nCompany: Acme\nSource: https://jobs.example.com/123\n\nWe are hiring.\n\nRequirements:\n- TypeScript',
    );
  });

  it('trims every value', () => {
    expect(
      formatJobPostingPlainText({
        jobTitle: '  Senior Engineer ',
        jobCompany: '\tAcme\n',
        jobSourceUrl: ' https://jobs.example.com/123 ',
        jobRawText: '\n\n  We are hiring.  \n\n',
      }),
    ).toBe(
      'Position: Senior Engineer\nCompany: Acme\nSource: https://jobs.example.com/123\n\nWe are hiring.',
    );
  });

  it('omits the position line when the title is missing or blank', () => {
    const rest = { jobCompany: 'Acme', jobSourceUrl: 'https://x.test', jobRawText: 'Text' };
    const expected = 'Company: Acme\nSource: https://x.test\n\nText';

    expect(formatJobPostingPlainText({ ...rest, jobTitle: null })).toBe(expected);
    expect(formatJobPostingPlainText({ ...rest, jobTitle: undefined })).toBe(expected);
    expect(formatJobPostingPlainText({ ...rest, jobTitle: '' })).toBe(expected);
    expect(formatJobPostingPlainText({ ...rest, jobTitle: '   ' })).toBe(expected);
  });

  it('omits the company line when the company is missing or blank', () => {
    const rest = { jobTitle: 'Engineer', jobSourceUrl: 'https://x.test', jobRawText: 'Text' };
    const expected = 'Position: Engineer\nSource: https://x.test\n\nText';

    expect(formatJobPostingPlainText({ ...rest, jobCompany: null })).toBe(expected);
    expect(formatJobPostingPlainText({ ...rest, jobCompany: '' })).toBe(expected);
    expect(formatJobPostingPlainText({ ...rest, jobCompany: '  ' })).toBe(expected);
  });

  it('omits the source line when no URL was saved', () => {
    const rest = { jobTitle: 'Engineer', jobCompany: 'Acme', jobRawText: 'Text' };
    const expected = 'Position: Engineer\nCompany: Acme\n\nText';

    expect(formatJobPostingPlainText({ ...rest, jobSourceUrl: null })).toBe(expected);
    expect(formatJobPostingPlainText({ ...rest, jobSourceUrl: undefined })).toBe(expected);
    expect(formatJobPostingPlainText({ ...rest, jobSourceUrl: '' })).toBe(expected);
    expect(formatJobPostingPlainText({ ...rest, jobSourceUrl: ' ' })).toBe(expected);
  });

  it('returns only the header lines when there is no posting text', () => {
    const rest = { jobTitle: 'Engineer', jobCompany: 'Acme', jobSourceUrl: 'https://x.test' };
    const expected = 'Position: Engineer\nCompany: Acme\nSource: https://x.test';

    expect(formatJobPostingPlainText({ ...rest, jobRawText: null })).toBe(expected);
    expect(formatJobPostingPlainText({ ...rest, jobRawText: '' })).toBe(expected);
    expect(formatJobPostingPlainText({ ...rest, jobRawText: '  \n ' })).toBe(expected);
  });

  it('returns just the trimmed posting text when there are no header lines', () => {
    expect(
      formatJobPostingPlainText({
        jobTitle: null,
        jobCompany: ' ',
        jobSourceUrl: '',
        jobRawText: '  We are hiring.  ',
      }),
    ).toBe('We are hiring.');
  });

  it('returns a single header line without separators', () => {
    expect(
      formatJobPostingPlainText({
        jobTitle: null,
        jobCompany: null,
        jobSourceUrl: 'https://x.test',
        jobRawText: null,
      }),
    ).toBe('Source: https://x.test');
  });

  it('returns an empty string when everything is empty', () => {
    expect(
      formatJobPostingPlainText({
        jobTitle: null,
        jobCompany: undefined,
        jobSourceUrl: '',
        jobRawText: '   ',
      }),
    ).toBe('');
    expect(formatJobPostingPlainText({})).toBe('');
  });
});
