import { describe, expect, it } from 'vitest';
import { sanitizeAiTypography, sanitizeAiTypographyDeep } from './sanitize-ai-typography';

describe('sanitizeAiTypography', () => {
  it('replaces em dash with spaced hyphen', () => {
    expect(sanitizeAiTypography('Application — Senior Engineer')).toBe(
      'Application - Senior Engineer',
    );
  });

  it('replaces en dash in date ranges', () => {
    expect(sanitizeAiTypography('2020–2024')).toBe('2020-2024');
  });

  it('replaces curly quotes and ellipsis', () => {
    expect(sanitizeAiTypography('“Hello” — it’s great…')).toBe('"Hello" - it\'s great...');
  });

  it('strips zero-width characters', () => {
    expect(sanitizeAiTypography(`hello\u200Bworld`)).toBe('helloworld');
  });
});

describe('sanitizeAiTypographyDeep', () => {
  it('sanitizes nested resume draft strings', () => {
    const draft = {
      basics: { summary: 'Led teams — shipped features' },
      work: [{ highlights: ['Built APIs — scale'] }],
    };

    expect(sanitizeAiTypographyDeep(draft)).toEqual({
      basics: { summary: 'Led teams - shipped features' },
      work: [{ highlights: ['Built APIs - scale'] }],
    });
  });
});
