import { BadRequestException } from '@nestjs/common';
import { ResumeSchemaValidator } from './resume-schema.validator';

describe('ResumeSchemaValidator', () => {
  let validator: ResumeSchemaValidator;

  beforeEach(() => {
    validator = new ResumeSchemaValidator();
  });

  it('accepts minimal resume payload permitted by schema', () => {
    expect(() => validator.validate({})).not.toThrow();
  });

  it('rejects invalid email format via AJV formats', () => {
    expect(() =>
      validator.validate({
        basics: { email: 'not-an-email' },
      }),
    ).toThrow(BadRequestException);
  });

  it('includes AJV error paths in validation messages', () => {
    try {
      validator.validate({
        basics: { email: 'not-an-email', url: 'not-a-url' },
      });
      throw new Error('expected validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as {
        message: string;
        errors: string[];
      };
      expect(response.errors.length).toBeGreaterThan(0);
      expect(response.errors.some((entry) => entry.includes('/basics'))).toBe(true);
    }
  });
});
