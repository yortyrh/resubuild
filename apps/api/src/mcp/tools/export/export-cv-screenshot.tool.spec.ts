import { getMcpAuthUser, mcpAuthStorage } from '../../mcp-auth.context';
import { ExportCvScreenshotTool } from './export-cv-screenshot.tool';

const user = { id: 'user-1', accessToken: 'tok', authMethod: 'jwt' as const };

describe('ExportCvScreenshotTool', () => {
  let tool: ExportCvScreenshotTool;
  let mcpExportService: { publishScreenshot: jest.Mock };

  beforeEach(() => {
    mcpExportService = { publishScreenshot: jest.fn() };
    tool = new ExportCvScreenshotTool(mcpExportService as never);
  });

  it('delegates to McpExportService.publishScreenshot with template + mode', async () => {
    const envelope = { exportId: 'exp-1', url: 'https://signed' };
    mcpExportService.publishScreenshot.mockResolvedValue(envelope);
    let observed: unknown;
    const observable = await mcpAuthStorage.run(user, async () => {
      observed = getMcpAuthUser();
      return tool.run({ cvId: 'cv-1', template: 'classic', mode: 'first_page' });
    });

    expect(observed).toBe(user);
    expect(mcpExportService.publishScreenshot).toHaveBeenCalledWith(user, 'cv-1', {
      template: 'classic',
      mode: 'first_page',
    });
    expect(await observable).toBe(envelope);
  });
});
