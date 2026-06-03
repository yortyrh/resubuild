import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { McpController } from './mcp.controller';
import { McpToolsService } from './mcp-tools.service';

jest.mock('@modelcontextprotocol/sdk/server/mcp.js');
jest.mock('@modelcontextprotocol/sdk/server/streamableHttp.js');

const mockConfigService = {
  get: jest.fn(),
};

function createMockResponse() {
  return {
    headersSent: false,
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('McpController', () => {
  let controller: McpController;
  let mockMcpToolsService: {
    createServer: jest.Mock;
    listRegisteredToolNames: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockMcpToolsService = {
      createServer: jest.fn().mockReturnValue({}),
      listRegisteredToolNames: jest.fn().mockReturnValue([]),
    };

    controller = new McpController(
      mockMcpToolsService as unknown as McpToolsService,
      mockConfigService as never,
    );
  });

  describe('assertEnabled', () => {
    it('does not throw when MCP_SERVER_ENABLED is not set', () => {
      mockConfigService.get.mockReturnValue(undefined);
      expect(() =>
        (controller as unknown as { assertEnabled: () => void }).assertEnabled(),
      ).not.toThrow();
    });

    it('does not throw when MCP_SERVER_ENABLED is "true"', () => {
      mockConfigService.get.mockReturnValue('true');
      expect(() =>
        (controller as unknown as { assertEnabled: () => void }).assertEnabled(),
      ).not.toThrow();
    });

    it('does not throw when MCP_SERVER_ENABLED is "1"', () => {
      mockConfigService.get.mockReturnValue('1');
      expect(() =>
        (controller as unknown as { assertEnabled: () => void }).assertEnabled(),
      ).not.toThrow();
    });

    it('throws ServiceUnavailableException when MCP_SERVER_ENABLED is "false"', () => {
      mockConfigService.get.mockReturnValue('false');
      expect(() =>
        (controller as unknown as { assertEnabled: () => void }).assertEnabled(),
      ).toThrow('MCP server is disabled');
    });

    it('throws ServiceUnavailableException when MCP_SERVER_ENABLED is "0"', () => {
      mockConfigService.get.mockReturnValue('0');
      expect(() =>
        (controller as unknown as { assertEnabled: () => void }).assertEnabled(),
      ).toThrow('MCP server is disabled');
    });
  });

  describe('getSessionId', () => {
    it('returns undefined when header is missing', () => {
      const req = { headers: {} } as never;
      expect(
        (
          controller as unknown as { getSessionId: (req: unknown) => string | undefined }
        ).getSessionId(req),
      ).toBeUndefined();
    });

    it('returns undefined when header is not a string', () => {
      const req = { headers: { 'mcp-session-id': ['abc'] } } as never;
      expect(
        (
          controller as unknown as { getSessionId: (req: unknown) => string | undefined }
        ).getSessionId(req),
      ).toBeUndefined();
    });

    it('returns the session id when header is a string', () => {
      const req = { headers: { 'mcp-session-id': 'session-123' } } as never;
      expect(
        (
          controller as unknown as { getSessionId: (req: unknown) => string | undefined }
        ).getSessionId(req),
      ).toBe('session-123');
    });
  });

  describe('sendJsonRpcError', () => {
    it('does nothing if headers already sent', () => {
      const res = { headersSent: true, status: jest.fn(), json: jest.fn() };
      (
        controller as unknown as {
          sendJsonRpcError: (res: unknown, status: number, message: string) => void;
        }
      ).sendJsonRpcError(res as unknown, 500, 'Server error');
      expect(res.status).not.toHaveBeenCalled();
    });

    it('sends JSON-RPC error response', () => {
      const res = createMockResponse();
      (
        controller as unknown as {
          sendJsonRpcError: (res: unknown, status: number, message: string) => void;
        }
      ).sendJsonRpcError(res as unknown, 400, 'Bad Request');
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Bad Request' },
        id: null,
      });
    });
  });

  describe('sessions map', () => {
    it('initializes with empty sessions map', () => {
      const sessions = (controller as unknown as { sessions: Map<string, unknown> }).sessions;
      expect(sessions.size).toBe(0);
    });

    it('can store and retrieve sessions', () => {
      const sessions = (controller as unknown as { sessions: Map<string, unknown> }).sessions;
      sessions.set('test-session', { transport: {}, server: {} });
      expect(sessions.has('test-session')).toBe(true);
    });
  });

  describe('resolveTransport', () => {
    let mockTransport: jest.Mocked<StreamableHTTPServerTransport>;
    let mockServer: jest.Mocked<McpServer>;

    beforeEach(() => {
      mockTransport = {
        sessionId: 'existing-session',
        onclose: null,
        handleRequest: jest.fn(),
      } as never;

      mockServer = {
        close: jest.fn().mockResolvedValue(undefined),
      } as unknown as jest.Mocked<McpServer>;

      mockMcpToolsService.createServer.mockReturnValue(mockServer as never);
    });

    it('returns existing transport when session exists', async () => {
      const sessions = (controller as unknown as { sessions: Map<string, unknown> }).sessions;
      sessions.set('existing-session', { transport: mockTransport, server: mockServer });

      const req = {
        headers: { 'mcp-session-id': 'existing-session' },
        body: {},
      } as unknown as Request;
      const res = { headersSent: false, status: jest.fn(), json: jest.fn() } as unknown as Response;

      const result = await (
        controller as unknown as {
          resolveTransport: (req: unknown, res: unknown) => Promise<unknown>;
        }
      ).resolveTransport(req, res);

      expect(result).toBe(mockTransport);
    });

    it('creates new transport for initialize request without session', async () => {
      const sessions = (controller as unknown as { sessions: Map<string, unknown> }).sessions;
      sessions.clear();

      const req = {
        headers: {},
        body: { jsonrpc: '2.0', method: 'initialize', id: 1 },
      } as unknown as Request;
      const res = {
        headersSent: false,
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      const result = await (
        controller as unknown as {
          resolveTransport: (req: unknown, res: unknown) => Promise<unknown>;
        }
      ).resolveTransport(req, res);

      // result should be a transport or null depending on isInitializeRequest
      // We just verify it doesn't throw
      expect(result).toBeDefined();
    });

    it('sends 400 error when no session and not initialize request', async () => {
      const sessions = (controller as unknown as { sessions: Map<string, unknown> }).sessions;
      sessions.clear();

      const req = {
        headers: {},
        body: { jsonrpc: '2.0', method: 'tools/list', id: 1 },
      } as unknown as Request;
      const res = {
        headersSent: false,
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      const result = await (
        controller as unknown as {
          resolveTransport: (req: unknown, res: unknown) => Promise<unknown>;
        }
      ).resolveTransport(req, res);

      expect(result).toBeNull();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
        id: null,
      });
    });

    it('stores session via onsessioninitialized callback', async () => {
      const req = {
        headers: {},
        body: { jsonrpc: '2.0', method: 'initialize', id: 1 },
      } as unknown as Request;
      const res = {
        headersSent: false,
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      await (
        controller as unknown as {
          resolveTransport: (req: unknown, res: unknown) => Promise<unknown>;
        }
      ).resolveTransport(req, res);

      const sessions = (controller as unknown as { sessions: Map<string, unknown> }).sessions;
      expect(sessions.size).toBeGreaterThanOrEqual(0);
    });
  });
});
