import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import { CvExportController } from './cv-export.controller';
import type { CvExportService } from './cv-export.service';

describe('CvExportController', () => {
  let controller: CvExportController;
  let exportService: jest.Mocked<
    Pick<CvExportService, 'renderHtml' | 'renderPdf' | 'listTemplateCatalog'>
  >;

  const userCtx: AuthenticatedRequest['user'] = {
    id: 'u42',
    email: 'hitme@test.dev',
    accessToken: 'tok',
  };
  const req = { user: userCtx } as AuthenticatedRequest;

  beforeEach(() => {
    exportService = {
      renderHtml: jest.fn(),
      renderPdf: jest.fn(),
      listTemplateCatalog: jest.fn(),
    };
    controller = new CvExportController(exportService as never);
  });

  it('listTemplates returns catalog from service', () => {
    exportService.listTemplateCatalog.mockReturnValue([
      { id: 'mit-classic', label: 'MIT Classic', description: '', category: 'default' },
    ]);
    expect(controller.listTemplates()).toEqual({
      templates: [{ id: 'mit-classic', label: 'MIT Classic', description: '', category: 'default' }],
    });
  });

  it('exportHtml delegates to CvExportService.renderHtml with optional template', async () => {
    exportService.renderHtml.mockResolvedValue('<html>Jane</html>');
    await expect(controller.exportHtml(req, 'cv-1', 'capd-alum')).resolves.toBe('<html>Jane</html>');
    expect(exportService.renderHtml).toHaveBeenCalledWith(userCtx, 'cv-1', 'capd-alum');
  });
});
