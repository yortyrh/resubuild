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
      templates: [
        { id: 'mit-classic', label: 'MIT Classic', description: '', category: 'default' },
      ],
    });
  });

  it('exportHtml delegates to CvExportService.renderHtml with optional template', async () => {
    exportService.renderHtml.mockResolvedValue('<html>Jane</html>');
    await expect(controller.exportHtml(req, 'cv-1', 'capd-alum')).resolves.toBe(
      '<html>Jane</html>',
    );
    expect(exportService.renderHtml).toHaveBeenCalledWith(userCtx, 'cv-1', 'capd-alum');
  });

  it('exportPdf sets PDF headers and sends buffer', async () => {
    const buffer = Buffer.from('%PDF-1.4');
    exportService.renderPdf.mockResolvedValue({ buffer, filename: 'jane-doe.pdf' });
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };

    await controller.exportPdf(req, 'cv-1', 'classic', res as never);

    expect(exportService.renderPdf).toHaveBeenCalledWith(userCtx, 'cv-1', 'classic');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="jane-doe.pdf"',
    );
    expect(res.send).toHaveBeenCalledWith(buffer);
  });
});
