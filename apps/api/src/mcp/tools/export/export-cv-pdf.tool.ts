import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { getMcpAuthUser } from '../../mcp-auth.context';
import { McpExportService } from '../../mcp-export.service';
import { MCP_TOOL_DEFINITIONS } from '../../tool-definitions';
import { templateOptionalSchema } from '../_schemas';

@Injectable()
export class ExportCvPdfTool {
  constructor(private readonly mcpExportService: McpExportService) {}

  @Tool({
    name: 'export_cv_pdf',
    description: MCP_TOOL_DEFINITIONS.export_cv_pdf.description,
    parameters: templateOptionalSchema,
    annotations: { readOnlyHint: true },
  })
  async run(args: { cvId: string; template?: string }) {
    return this.mcpExportService.publishPdf(getMcpAuthUser(), args.cvId, args.template);
  }
}
