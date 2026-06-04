import { getMcpAuthUser, mcpAuthStorage } from '../../mcp-auth.context';
import { ExportCvPdfTool } from './export-cv-pdf.tool';

const user = { id: 'user-1', accessToken: 'tok', authMethod: 'jwt' as const };

describe('ExportCvPdfTool', () => {
  let tool: ExportCvPdfTool;
  let mcpExportService: { publishPdf: jest.Mock };

  beforeEach(() => {
    mcpExportService = { publishPdf: jest.fn() };
    tool = new ExportCvPdfTool(mcpExportService as never);
  });

  it('delegates to McpExportService.publishPdf', async () => {
    const envelope = { exportId: 'exp-1', url: 'https://signed' };
    mcpExportService.publishPdf.mockResolvedValue(envelope);
    let observed: unknown;
    const observable = await mcpAuthStorage.run(user, async () => {
      observed = getMcpAuthUser();
      return tool.run({ cvId: 'cv-1', template: 'classic' });
    });

    expect(observed).toBe(user);
    expect(mcpExportService.publishPdf).toHaveBeenCalledWith(user, 'cv-1', 'classic');
    expect(await observable).toBe(envelope);
  });
});
