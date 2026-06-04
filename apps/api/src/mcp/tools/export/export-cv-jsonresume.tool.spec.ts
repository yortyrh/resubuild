import { getMcpAuthUser, mcpAuthStorage } from '../../mcp-auth.context';
import { ExportCvJsonresumeTool } from './export-cv-jsonresume.tool';

const user = { id: 'user-1', accessToken: 'tok', authMethod: 'jwt' as const };

describe('ExportCvJsonresumeTool', () => {
  let tool: ExportCvJsonresumeTool;
  let mcpExportService: { publishJsonResume: jest.Mock };

  beforeEach(() => {
    mcpExportService = { publishJsonResume: jest.fn() };
    tool = new ExportCvJsonresumeTool(mcpExportService as never);
  });

  it('delegates to McpExportService.publishJsonResume and returns envelope + document', async () => {
    const envelope = { exportId: 'exp-1', url: 'https://signed', document: { basics: {} } };
    mcpExportService.publishJsonResume.mockResolvedValue(envelope);
    let observed: unknown;
    const observable = await mcpAuthStorage.run(user, async () => {
      observed = getMcpAuthUser();
      return tool.run({ cvId: 'cv-1' });
    });

    expect(observed).toBe(user);
    expect(mcpExportService.publishJsonResume).toHaveBeenCalledWith(user, 'cv-1');
    expect(await observable).toBe(envelope);
  });
});
