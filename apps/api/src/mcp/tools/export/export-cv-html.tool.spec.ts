import { getMcpAuthUser, mcpAuthStorage } from '../../mcp-auth.context';
import { ExportCvHtmlTool } from './export-cv-html.tool';

const user = { id: 'user-1', accessToken: 'tok', authMethod: 'jwt' as const };

describe('ExportCvHtmlTool', () => {
  let tool: ExportCvHtmlTool;
  let mcpExportService: { publishHtml: jest.Mock };

  beforeEach(() => {
    mcpExportService = { publishHtml: jest.fn() };
    tool = new ExportCvHtmlTool(mcpExportService as never);
  });

  it('delegates to McpExportService.publishHtml with the user, cvId, and template', async () => {
    const envelope = { exportId: 'exp-1', url: 'https://signed' };
    mcpExportService.publishHtml.mockResolvedValue(envelope);
    let observed: unknown;
    const observable = await mcpAuthStorage.run(user, async () => {
      observed = getMcpAuthUser();
      return tool.run({ cvId: 'cv-1', template: 'classic' });
    });

    expect(observed).toBe(user);
    expect(mcpExportService.publishHtml).toHaveBeenCalledWith(user, 'cv-1', 'classic');
    expect(await observable).toBe(envelope);
  });
});
