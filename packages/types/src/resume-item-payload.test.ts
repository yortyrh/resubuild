import { describe, expect, it } from 'vitest';
import { sanitizeResumeItemPayload } from './resume-item-payload';

describe('sanitizeResumeItemPayload', () => {
  it('removes empty string fields such as optional url', () => {
    expect(
      sanitizeResumeItemPayload({
        name: 'TechNova',
        position: 'Senior Software Engineer',
        url: '',
        highlights: ['Shipped features'],
      }),
    ).toEqual({
      name: 'TechNova',
      position: 'Senior Software Engineer',
      highlights: ['Shipped features'],
    });
  });

  it('trims non-empty strings and drops blank optional dates', () => {
    expect(
      sanitizeResumeItemPayload({
        name: ' Acme ',
        startDate: '',
        endDate: '2024-06',
      }),
    ).toEqual({
      name: 'Acme',
      endDate: '2024-06',
    });
  });

  it('preserves non-string values', () => {
    expect(
      sanitizeResumeItemPayload({
        keywords: ['React'],
        roles: [],
      }),
    ).toEqual({
      keywords: ['React'],
      roles: [],
    });
  });
});
