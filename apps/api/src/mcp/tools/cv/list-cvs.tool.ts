import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { CvService } from '../../../cv/cv.service';
import { getMcpAuthUser } from '../../mcp-auth.context';
import { MCP_TOOL_DEFINITIONS } from '../../tool-definitions';

@Injectable()
export class ListCvsTool {
  constructor(private readonly cvService: CvService) {}

  @Tool({
    name: 'list_cvs',
    description: MCP_TOOL_DEFINITIONS.list_cvs.description,
    annotations: { readOnlyHint: true },
  })
  async run() {
    return this.cvService.findAll(getMcpAuthUser());
  }
}
