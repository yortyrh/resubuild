import { describe, expect, it } from 'vitest';
import { validateResumeSchema } from './validate-resume-schema';

describe('validateResumeSchema', () => {
  it('accepts an empty resume object', () => {
    expect(validateResumeSchema({})).toEqual({ valid: true });
  });

  it('rejects invalid email format', () => {
    const result = validateResumeSchema({
      basics: { email: 'not-an-email' },
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((entry) => entry.includes('/basics'))).toBe(true);
    }
  });

  it('rejects invalid basics url format', () => {
    const result = validateResumeSchema({
      basics: { url: 'not-a-url' },
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });
});
