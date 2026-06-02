import { randomUUID } from 'node:crypto';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import {
  All,
  Controller,
  Logger,
  Req,
  Res,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../auth/auth-user.types';
import { McpApiKeyGuard } from './mcp-api-key.guard';
import { mcpAuthStorage } from './mcp-auth.context';
import { McpToolsService } from './mcp-tools.service';

type McpSession = {
  transport: StreamableHTTPServerTransport;
  server: McpServer;
};

@Controller()
export class McpController {
  private readonly logger = new Logger(McpController.name);
  private readonly sessions = new Map<string, McpSession>();

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

  private getSessionId(req: Request): string | undefined {
    const raw = req.headers['mcp-session-id'];
    return typeof raw === 'string' ? raw : undefined;
  }

  private sendJsonRpcError(res: Response, status: number, message: string): void {
    if (res.headersSent) {
      return;
    }
    res.status(status).json({
      jsonrpc: '2.0',
      error: { code: -32000, message },
      id: null,
    });
  }

  private async resolveTransport(
    req: Request,
    res: Response,
  ): Promise<StreamableHTTPServerTransport | null> {
    const sessionId = this.getSessionId(req);
    const existing = sessionId ? this.sessions.get(sessionId) : undefined;

    if (sessionId && existing) {
      return existing.transport;
    }

    if (!sessionId && isInitializeRequest(req.body)) {
      const server = this.mcpToolsService.createServer();
      let transport!: StreamableHTTPServerTransport;

      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          this.sessions.set(sid, { transport, server });
        },
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (!sid) {
          return;
        }
        const entry = this.sessions.get(sid);
        if (entry) {
          void entry.server.close();
          this.sessions.delete(sid);
        }
      };

      await server.connect(transport);
      return transport;
    }

    this.sendJsonRpcError(res, 400, 'Bad Request: No valid session ID provided');
    return null;
  }

  @All(['mcp', 'mcp/'])
  @UseGuards(McpApiKeyGuard)
  async handleMcp(@Req() req: AuthenticatedRequest & Request, @Res() res: Response): Promise<void> {
    this.assertEnabled();

    try {
      const transport = await this.resolveTransport(req, res);
      if (!transport) {
        return;
      }

      await mcpAuthStorage.run(req.user, async () => {
        await transport.handleRequest(req, res, req.body);
      });
    } catch (error) {
      this.logger.error('MCP request failed', error instanceof Error ? error.stack : error);
      this.sendJsonRpcError(res, 500, 'Internal server error');
    }
  }
}
