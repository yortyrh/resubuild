import { getMcpAuthUser, mcpAuthStorage } from '../../mcp-auth.context';
import { FetchExportUrlTool } from './fetch-export-url.tool';

const user = { id: 'user-1', accessToken: 'tok', authMethod: 'jwt' as const };

describe('FetchExportUrlTool', () => {
  let tool: FetchExportUrlTool;
  let mcpExportService: { refreshSignedUrl: jest.Mock };

  beforeEach(() => {
    mcpExportService = { refreshSignedUrl: jest.fn() };
    tool = new FetchExportUrlTool(mcpExportService as never);
  });

  it('delegates to McpExportService.refreshSignedUrl with exportId and optional ttl', async () => {
    const envelope = { exportId: 'exp-1', url: 'https://signed' };
    mcpExportService.refreshSignedUrl.mockResolvedValue(envelope);
    let observed: unknown;
    const observable = await mcpAuthStorage.run(user, async () => {
      observed = getMcpAuthUser();
      return tool.run({ exportId: 'exp-1', ttlSeconds: 7200 });
    });

    expect(observed).toBe(user);
    expect(mcpExportService.refreshSignedUrl).toHaveBeenCalledWith(user, 'exp-1', 7200);
    expect(await observable).toBe(envelope);
  });
});
