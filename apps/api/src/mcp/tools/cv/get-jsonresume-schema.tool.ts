import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import resumeSchema from '../../../../../../packages/schemas/resume.schema.json';
import { MCP_TOOL_DEFINITIONS } from '../../tool-definitions';

interface ResumeSchemaEnvelope {
  $id: string;
  version: string | undefined;
  schema: typeof resumeSchema;
}

const ENVELOPE: ResumeSchemaEnvelope = {
  $id:
    typeof resumeSchema === 'object' && resumeSchema !== null && '$id' in resumeSchema
      ? String((resumeSchema as { $id?: unknown }).$id)
      : 'https://jsonresume.org/schema/',
  version:
    typeof resumeSchema === 'object' &&
    resumeSchema !== null &&
    'meta' in resumeSchema &&
    typeof (resumeSchema as { meta?: { version?: unknown } }).meta?.version === 'string'
      ? (resumeSchema as { meta: { version: string } }).meta.version
      : undefined,
  schema: resumeSchema,
};

@Injectable()
export class GetJsonresumeSchemaTool {
  @Tool({
    name: 'get_jsonresume_schema',
    description: MCP_TOOL_DEFINITIONS.get_jsonresume_schema.description,
    annotations: { readOnlyHint: true },
  })
  run() {
    return ENVELOPE;
  }
}
