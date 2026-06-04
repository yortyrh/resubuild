import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { ApplicationService } from '../../../application/application.service';
import { getMcpAuthUser } from '../../mcp-auth.context';
import { MCP_TOOL_DEFINITIONS } from '../../tool-definitions';

@Injectable()
export class ListApplicationsTool {
  constructor(private readonly applicationService: ApplicationService) {}

  @Tool({
    name: 'list_applications',
    description: MCP_TOOL_DEFINITIONS.list_applications.description,
    annotations: { readOnlyHint: true },
  })
  async run() {
    return this.applicationService.findAll(getMcpAuthUser());
  }
}
