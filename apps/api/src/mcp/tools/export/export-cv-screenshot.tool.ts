import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { getMcpAuthUser } from '../../mcp-auth.context';
import { McpExportService } from '../../mcp-export.service';
import { MCP_TOOL_DEFINITIONS } from '../../tool-definitions';
import { screenshotSchema } from '../_schemas';

@Injectable()
export class ExportCvScreenshotTool {
  constructor(private readonly mcpExportService: McpExportService) {}

  @Tool({
    name: 'export_cv_screenshot',
    description: MCP_TOOL_DEFINITIONS.export_cv_screenshot.description,
    parameters: screenshotSchema,
    annotations: { readOnlyHint: true },
  })
  async run(args: { cvId: string; template?: string; mode?: 'full_document' | 'first_page' }) {
    return this.mcpExportService.publishScreenshot(getMcpAuthUser(), args.cvId, {
      template: args.template,
      mode: args.mode,
    });
  }
}
