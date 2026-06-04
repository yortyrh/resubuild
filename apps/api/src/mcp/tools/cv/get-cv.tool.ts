import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { CvService } from '../../../cv/cv.service';
import { getMcpAuthUser } from '../../mcp-auth.context';
import { MCP_TOOL_DEFINITIONS } from '../../tool-definitions';
import { cvIdSchema } from '../_schemas';

@Injectable()
export class GetCvTool {
  constructor(private readonly cvService: CvService) {}

  @Tool({
    name: 'get_cv',
    description: MCP_TOOL_DEFINITIONS.get_cv.description,
    parameters: cvIdSchema,
    annotations: { readOnlyHint: true },
  })
  async run(args: { cvId: string }) {
    return this.cvService.findOne(getMcpAuthUser(), args.cvId);
  }
}
