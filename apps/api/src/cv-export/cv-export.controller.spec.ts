import { CvExportController } from './cv-export.controller';
import type { CvExportService } from './cv-export.service';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';

describe('CvExportController', () => {
  let controller: CvExportController;
  let exportService: jest.Mocked<Pick<CvExportService, 'renderHtml' | 'renderPdf'>>;

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
    };
    controller = new CvExportController(exportService as never);
  });

  it('exportHtml delegates to CvExportService.renderHtml', async () => {
    exportService.renderHtml.mockResolvedValue('<html>Jane</html>');
    await expect(controller.exportHtml(req, 'cv-1')).resolves.toBe('<html>Jane</html>');
    expect(exportService.renderHtml).toHaveBeenCalledWith(userCtx, 'cv-1');
  });
});
