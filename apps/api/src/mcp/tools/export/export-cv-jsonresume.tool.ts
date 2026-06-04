import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { getMcpAuthUser } from '../../mcp-auth.context';
import { McpExportService } from '../../mcp-export.service';
import { MCP_TOOL_DEFINITIONS } from '../../tool-definitions';
import { cvIdSchema } from '../_schemas';

@Injectable()
export class ExportCvJsonresumeTool {
  constructor(private readonly mcpExportService: McpExportService) {}

  @Tool({
    name: 'export_cv_jsonresume',
    description: MCP_TOOL_DEFINITIONS.export_cv_jsonresume.description,
    parameters: cvIdSchema,
    annotations: { readOnlyHint: true },
  })
  async run(args: { cvId: string }) {
    return this.mcpExportService.publishJsonResume(getMcpAuthUser(), args.cvId);
  }
}
