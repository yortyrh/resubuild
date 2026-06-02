import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { All, Controller, Req, Res, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../auth/auth-user.types';
import { McpApiKeyGuard } from './mcp-api-key.guard';
import { mcpAuthStorage } from './mcp-auth.context';
import { McpToolsService } from './mcp-tools.service';

@Controller()
export class McpController {
  private transport: StreamableHTTPServerTransport | null = null;
  private connectPromise: Promise<void> | null = null;

  constructor(
    private readonly mcpToolsService: McpToolsService,
    private readonly configService: ConfigService,
  ) {}

  private assertEnabled(): void {
    const flag = this.configService.get<string>('MCP_SERVER_ENABLED');
    if (flag === 'false' || flag === '0') {
      throw new ServiceUnavailableException('MCP server is disabled');
    }
  }

  private async ensureTransport(): Promise<StreamableHTTPServerTransport> {
    if (this.transport) {
      return this.transport;
    }

    if (!this.connectPromise) {
      this.connectPromise = (async () => {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
        });
        await this.mcpToolsService.getServer().connect(transport);
        this.transport = transport;
      })();
    }

    await this.connectPromise;
    return this.transport!;
  }

  @All(['mcp', 'mcp/'])
  @UseGuards(McpApiKeyGuard)
  async handleMcp(@Req() req: AuthenticatedRequest & Request, @Res() res: Response): Promise<void> {
    this.assertEnabled();
    const transport = await this.ensureTransport();

    await mcpAuthStorage.run(req.user, async () => {
      await transport.handleRequest(req, res, req.body);
    });
  }
}
