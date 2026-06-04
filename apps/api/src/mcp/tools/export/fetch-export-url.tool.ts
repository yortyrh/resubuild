import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { getMcpAuthUser } from '../../mcp-auth.context';
import { McpExportService } from '../../mcp-export.service';
import { MCP_TOOL_DEFINITIONS } from '../../tool-definitions';
import { fetchExportUrlSchema } from '../_schemas';

@Injectable()
export class FetchExportUrlTool {
  constructor(private readonly mcpExportService: McpExportService) {}

  @Tool({
    name: 'fetch_export_url',
    description: MCP_TOOL_DEFINITIONS.fetch_export_url.description,
    parameters: fetchExportUrlSchema,
    annotations: { readOnlyHint: true },
  })
  async run(args: { exportId: string; ttlSeconds?: number }) {
    return this.mcpExportService.refreshSignedUrl(
      getMcpAuthUser(),
      args.exportId,
      args.ttlSeconds,
    );
  }
}
