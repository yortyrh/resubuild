import resumeSchema from '@resumind/schemas/resume.schema.json';
import Ajv, { type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';

let validateFn: ReturnType<Ajv['compile']> | null = null;

function getValidator(): ReturnType<Ajv['compile']> {
  if (!validateFn) {
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    validateFn = ajv.compile(resumeSchema as object);
  }
  return validateFn;
}

export function formatResumeSchemaError(error: ErrorObject): string {
  const path = error.instancePath || '/';
  return `${path}: ${error.message ?? 'invalid value'}`;
}

export function validateResumeSchema(
  data: Record<string, unknown>,
): { valid: true } | { valid: false; errors: string[] } {
  const validate = getValidator();
  const valid = validate(data);

  if (valid) {
    return { valid: true };
  }

  const errors = (validate.errors ?? []).map(formatResumeSchemaError);
  return { valid: false, errors };
}
