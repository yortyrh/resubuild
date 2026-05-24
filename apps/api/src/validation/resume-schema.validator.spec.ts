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
});
