import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { CvJsonResumeSwapService } from '../../cv-json-resume-swap.service';
import { getMcpAuthUser } from '../../mcp-auth.context';
import { MCP_TOOL_DEFINITIONS } from '../../tool-definitions';
import { jsonResumeReplaceSchema } from '../_schemas';

@Injectable()
export class ReplaceCvFromJsonresumeTool {
  constructor(private readonly jsonResumeSwapService: CvJsonResumeSwapService) {}

  @Tool({
    name: 'replace_cv_from_jsonresume',
    description: MCP_TOOL_DEFINITIONS.replace_cv_from_jsonresume.description,
    parameters: jsonResumeReplaceSchema,
    annotations: { destructiveHint: true },
  })
  async run(args: { cvId: string; document: Record<string, unknown> }) {
    const replaced = await this.jsonResumeSwapService.replaceFromJsonResume(
      getMcpAuthUser(),
      args.cvId,
      args.document,
    );
    return { cvId: replaced.id, cv: replaced };
  }
}
