import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { CvService } from '../../../cv/cv.service';
import { getMcpAuthUser } from '../../mcp-auth.context';
import { MCP_TOOL_DEFINITIONS } from '../../tool-definitions';
import { cvIdSchema } from '../_schemas';

@Injectable()
export class DeleteCvTool {
  constructor(private readonly cvService: CvService) {}

  @Tool({
    name: 'delete_cv',
    description: MCP_TOOL_DEFINITIONS.delete_cv.description,
    parameters: cvIdSchema,
    annotations: { destructiveHint: true },
  })
  async run(args: { cvId: string }) {
    await this.cvService.remove(getMcpAuthUser(), args.cvId);
    return { ok: true, cvId: args.cvId };
  }
}
