import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { ApplicationService } from '../../../application/application.service';
import { getMcpAuthUser } from '../../mcp-auth.context';
import { MCP_TOOL_DEFINITIONS } from '../../tool-definitions';
import { applicationIdSchema } from '../_schemas';

@Injectable()
export class GetApplicationTool {
  constructor(private readonly applicationService: ApplicationService) {}

  @Tool({
    name: 'get_application',
    description: MCP_TOOL_DEFINITIONS.get_application.description,
    parameters: applicationIdSchema,
    annotations: { readOnlyHint: true },
  })
  async run(args: { applicationId: string }) {
    return this.applicationService.findOne(getMcpAuthUser(), args.applicationId);
  }
}
