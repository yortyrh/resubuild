import { BadRequestException } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import type { CvExportService } from '../cv-export/cv-export.service';
import { ApplicationController } from './application.controller';
import type { ApplicationService } from './application.service';

describe('ApplicationController', () => {
  const user = {
    id: 'u1',
    email: 'u@test.dev',
    accessToken: 'tok',
  } as AuthenticatedRequest['user'];
  const req = { user } as AuthenticatedRequest;

  let controller: ApplicationController;
  let service: jest.Mocked<
    Pick<
      ApplicationService,
      | 'prepare'
      | 'findAll'
      | 'findOne'
      | 'updateCoverLetter'
      | 'promoteClone'
      | 'getCoverLetterMarkdown'
      | 'remove'
      | 'cancel'
      | 'retry'
    >
  >;
  let exportService: jest.Mocked<Pick<CvExportService, 'renderLetterHtml' | 'renderLetterPdf'>>;

  beforeEach(() => {
    service = {
      prepare: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      updateCoverLetter: jest.fn(),
      promoteClone: jest.fn(),
      getCoverLetterMarkdown: jest.fn(),
      remove: jest.fn(),
      cancel: jest.fn(),
      retry: jest.fn(),
    };
    exportService = {
      renderLetterHtml: jest.fn(),
      renderLetterPdf: jest.fn(),
    };
    controller = new ApplicationController(service as never, exportService as never);
  });

  it('returns 202 payload from prepare', async () => {
    service.prepare.mockResolvedValue({ applicationId: 'app-1', status: 'queued' });

    await expect(
      controller.prepare(req, { text: 'Senior engineer role' }, undefined),
    ).resolves.toEqual({ applicationId: 'app-1', status: 'queued' });
  });

  it('rejects unsupported file types', () => {
    const file = { mimetype: 'text/plain', size: 10 } as Express.Multer.File;
    expect(() => controller.prepare(req, { text: 'x' }, file)).toThrow(BadRequestException);
  });

  it('proxies getApplication to service', async () => {
    service.findOne.mockResolvedValue({ id: 'app-1', status: 'ready' } as never);
    await expect(controller.findOne(req, 'app-1')).resolves.toEqual({
      id: 'app-1',
      status: 'ready',
    });
  });

  it('renders letter HTML', async () => {
    service.getCoverLetterMarkdown.mockResolvedValue('# Hello');
    exportService.renderLetterHtml.mockReturnValue('<html>Hello</html>');

    await expect(controller.exportLetterHtml(req, 'app-1')).resolves.toBe('<html>Hello</html>');
  });

  it('delegates delete to service', async () => {
    service.remove.mockResolvedValue(undefined);

    await expect(controller.remove(req, 'app-1')).resolves.toBeUndefined();
    expect(service.remove).toHaveBeenCalledWith(user, 'app-1');
  });
});
