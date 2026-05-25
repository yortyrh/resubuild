import * as fs from 'node:fs';
import * as path from 'node:path';
import { BadRequestException, Injectable } from '@nestjs/common';
import Ajv, { type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';

@Injectable()
export class ResumeSchemaValidator {
  private readonly validateFn: ReturnType<Ajv['compile']>;

  constructor() {
    const schemaPath = [
      path.join(process.cwd(), '../../packages/schemas/resume.schema.json'),
      path.join(process.cwd(), 'packages/schemas/resume.schema.json'),
      path.join(__dirname, '../../../../packages/schemas/resume.schema.json'),
      path.join(__dirname, '../resume.schema.json'),
    ].find((candidate) => fs.existsSync(candidate));

    if (!schemaPath) {
      throw new Error('Resume schema file not found');
    }

    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8')) as object;

    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    this.validateFn = ajv.compile(schema);
  }

  validate(data: Record<string, unknown>): void {
    const valid = this.validateFn(data);

    if (!valid) {
      const messages = (this.validateFn.errors ?? []).map(formatAjvError);
      throw new BadRequestException({
        message: 'Resume data does not match JSON Resume schema',
        errors: messages,
      });
    }
  }
}

function formatAjvError(error: ErrorObject): string {
  const path = error.instancePath || '/';
  return `${path}: ${error.message ?? 'invalid value'}`;
}
