import resumeSchema from '@resumind/schemas/resume.schema.json';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export interface ResumeValidationResult {
  valid: boolean;
  errors: string[];
}

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(resumeSchema as Record<string, unknown>);

export function validateResumeSchemaTool(data: unknown): ResumeValidationResult {
  const valid = validate(data);
  if (valid) {
    return { valid: true, errors: [] };
  }

  const errors = (validate.errors ?? []).map((error) => {
    const path = error.instancePath || '/';
    return `${path}: ${error.message ?? 'invalid'}`;
  });

  return { valid: false, errors };
}
