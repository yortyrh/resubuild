import * as fs from 'node:fs';
import { BadRequestException } from '@nestjs/common';
import { ResumeSchemaValidator } from './resume-schema.validator';

jest.mock('node:fs', () => {
  const actual = jest.requireActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    existsSync: jest.fn(actual.existsSync),
    readFileSync: jest.fn(actual.readFileSync),
  };
});

describe('ResumeSchemaValidator', () => {
  let validator: ResumeSchemaValidator;

  beforeEach(() => {
    jest
      .mocked(fs.existsSync)
      .mockImplementation(jest.requireActual<typeof import('node:fs')>('node:fs').existsSync);
    jest
      .mocked(fs.readFileSync)
      .mockImplementation(jest.requireActual<typeof import('node:fs')>('node:fs').readFileSync);
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

  it('throws when resume schema file cannot be located', () => {
    jest.mocked(fs.existsSync).mockReturnValue(false);

    expect(() => new ResumeSchemaValidator()).toThrow('Resume schema file not found');
  });

  it('uses root path when AJV omits instancePath', () => {
    try {
      validator.validate({ work: [{ startDate: 'not-a-date' }] });
      throw new Error('expected validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as {
        errors: string[];
      };
      expect(response.errors.some((entry) => entry.startsWith('/'))).toBe(true);
    }
  });

  it('uses root path when AJV returns an empty instancePath', () => {
    const validateFn = jest.fn().mockReturnValue(false);
    Object.assign(validateFn, {
      errors: [{ instancePath: '', message: 'schema mismatch' }],
    });
    (validator as unknown as { validateFn: typeof validateFn }).validateFn = validateFn;

    try {
      validator.validate({});
      throw new Error('expected validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as { errors: string[] };
      expect(response.errors).toContain('/: schema mismatch');
    }
  });

  it('falls back to invalid value when AJV omits error message', () => {
    const validateFn = jest.fn().mockReturnValue(false);
    Object.assign(validateFn, {
      errors: [{ instancePath: '/basics', message: undefined }],
    });
    (validator as unknown as { validateFn: typeof validateFn }).validateFn = validateFn;

    try {
      validator.validate({});
      throw new Error('expected validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as { errors: string[] };
      expect(response.errors).toContain('/basics: invalid value');
    }
  });

  it('handles missing AJV error list gracefully', () => {
    const validateFn = jest.fn().mockReturnValue(false);
    Object.assign(validateFn, { errors: undefined });
    (validator as unknown as { validateFn: typeof validateFn }).validateFn = validateFn;

    try {
      validator.validate({});
      throw new Error('expected validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as { errors: string[] };
      expect(response.errors).toEqual([]);
    }
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
