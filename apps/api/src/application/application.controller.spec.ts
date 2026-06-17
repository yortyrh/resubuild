import { BadRequestException } from '@nestjs/common';
import type { Response } from 'express';
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
      | 'patchApplicationMetadata'
      | 'promoteClone'
      | 'getCoverLetterMarkdown'
      | 'getCoverLetterPdfExport'
      | 'remove'
      | 'cancel'
      | 'retry'
      | 'updateApplication'
    >
  >;
  let exportService: jest.Mocked<Pick<CvExportService, 'renderLetterHtml' | 'renderLetterPdf'>>;

  beforeEach(() => {
    service = {
      prepare: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      updateCoverLetter: jest.fn(),
      patchApplicationMetadata: jest.fn(),
      promoteClone: jest.fn(),
      getCoverLetterMarkdown: jest.fn(),
      getCoverLetterPdfExport: jest.fn(),
      remove: jest.fn(),
      cancel: jest.fn(),
      retry: jest.fn(),
      updateApplication: jest.fn(),
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

  it('lists applications', async () => {
    service.findAll.mockResolvedValue([{ id: 'app-1', status: 'ready' }] as never);

    await expect(controller.findAll(req)).resolves.toEqual([{ id: 'app-1', status: 'ready' }]);
  });

  it('proxies getApplication to service', async () => {
    service.findOne.mockResolvedValue({ id: 'app-1', status: 'ready' } as never);
    await expect(controller.findOne(req, 'app-1')).resolves.toEqual({
      id: 'app-1',
      status: 'ready',
    });
  });

  it('updates cover letter markdown', async () => {
    service.updateCoverLetter.mockResolvedValue({ id: 'app-1', coverLetter: 'Updated' } as never);

    await expect(
      controller.updateLetter(req, 'app-1', { coverLetter: 'Updated' }),
    ).resolves.toEqual({ id: 'app-1', coverLetter: 'Updated' });
  });

  it('patches application metadata', async () => {
    service.patchApplicationMetadata.mockResolvedValue({
      id: 'app-1',
      jobTitle: 'Staff Engineer',
      jobCompany: 'Acme',
    } as never);

    await expect(
      controller.updateMetadata(req, 'app-1', {
        jobTitle: 'Staff Engineer',
        jobCompany: 'Acme',
      }),
    ).resolves.toEqual({ id: 'app-1', jobTitle: 'Staff Engineer', jobCompany: 'Acme' });

    expect(service.patchApplicationMetadata).toHaveBeenCalledWith(user, 'app-1', {
      jobTitle: 'Staff Engineer',
      jobCompany: 'Acme',
    });
  });

  it('forwards undefined metadata fields to the service', async () => {
    service.patchApplicationMetadata.mockResolvedValue({ id: 'app-1' } as never);

    await expect(
      controller.updateMetadata(req, 'app-1', { jobTitle: 'Engineer' }),
    ).resolves.toEqual({ id: 'app-1' });

    expect(service.patchApplicationMetadata).toHaveBeenCalledWith(user, 'app-1', {
      jobTitle: 'Engineer',
      jobCompany: undefined,
    });
  });

  it('renders letter HTML', async () => {
    service.getCoverLetterMarkdown.mockResolvedValue('# Hello');
    exportService.renderLetterHtml.mockReturnValue('<html>Hello</html>');

    await expect(controller.exportLetterHtml(req, 'app-1')).resolves.toBe('<html>Hello</html>');
  });

  it('renders letter PDF', async () => {
    service.getCoverLetterPdfExport.mockResolvedValue({
      markdown: '# Hello',
      filename: 'cover-letter.pdf',
    });
    exportService.renderLetterPdf.mockResolvedValue({
      buffer: Buffer.from('pdf'),
      filename: 'cover-letter.pdf',
    });
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    } as unknown as Response;

    await controller.exportLetterPdf(req, 'app-1', res);

    expect(exportService.renderLetterPdf).toHaveBeenCalledWith('# Hello', {
      title: 'Cover letter',
      filename: 'cover-letter.pdf',
    });
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.send).toHaveBeenCalledWith(Buffer.from('pdf'));
  });

  it('delegates delete to service', async () => {
    service.remove.mockResolvedValue(undefined);

    await expect(controller.remove(req, 'app-1')).resolves.toBeUndefined();
    expect(service.remove).toHaveBeenCalledWith(user, 'app-1');
  });

  it('delegates cancel and retry to service', async () => {
    service.cancel.mockResolvedValue({ id: 'app-1', status: 'failed' } as never);
    service.retry.mockResolvedValue({ applicationId: 'app-1', status: 'queued' });
    service.updateApplication.mockResolvedValue({
      applicationId: 'app-1',
      draftApplicationId: 'draft-1',
      status: 'queued',
    });
    service.promoteClone.mockResolvedValue({ id: 'app-1', status: 'ready' } as never);

    await expect(controller.cancel(req, 'app-1')).resolves.toEqual({
      id: 'app-1',
      status: 'failed',
    });
    await expect(controller.retry(req, 'app-1')).resolves.toEqual({
      applicationId: 'app-1',
      status: 'queued',
    });
    await expect(controller.updateApplication(req, 'app-1', {})).resolves.toEqual({
      applicationId: 'app-1',
      draftApplicationId: 'draft-1',
      status: 'queued',
    });
    await expect(controller.promoteClone(req, 'app-1')).resolves.toEqual({
      id: 'app-1',
      status: 'ready',
    });
  });
});
