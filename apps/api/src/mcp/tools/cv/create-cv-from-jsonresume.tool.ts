import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { CvJsonResumeSwapService } from '../../cv-json-resume-swap.service';
import { getMcpAuthUser } from '../../mcp-auth.context';
import { MCP_TOOL_DEFINITIONS } from '../../tool-definitions';
import { jsonResumeCreateSchema } from '../_schemas';

@Injectable()
export class CreateCvFromJsonresumeTool {
  constructor(private readonly jsonResumeSwapService: CvJsonResumeSwapService) {}

  @Tool({
    name: 'create_cv_from_jsonresume',
    description: MCP_TOOL_DEFINITIONS.create_cv_from_jsonresume.description,
    parameters: jsonResumeCreateSchema,
  })
  async run(args: { document: Record<string, unknown> }) {
    const created = await this.jsonResumeSwapService.createFromJsonResume(
      getMcpAuthUser(),
      args.document,
    );
    return { cvId: created.id, cv: created };
  }
}
