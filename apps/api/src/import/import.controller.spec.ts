/**
 * Mirrors import controller endpoints.
 */

import { BadRequestException } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import { ImportController } from './import.controller';
import type { ImportService } from './import.service';

describe('ImportController', () => {
  const user = {
    id: 'u1',
    email: 'u@test.dev',
    accessToken: 'tok',
  } as AuthenticatedRequest['user'];
  const req = { user } as AuthenticatedRequest;

  let controller: ImportController;
  let service: jest.Mocked<
    Pick<
      ImportService,
      | 'startPdfImport'
      | 'startMarkdownImport'
      | 'startImageImport'
      | 'startDocxImport'
      | 'importFromUrl'
      | 'getJob'
    >
  >;

  beforeEach(() => {
    service = {
      startPdfImport: jest.fn(),
      startMarkdownImport: jest.fn(),
      startImageImport: jest.fn(),
      startDocxImport: jest.fn(),
      importFromUrl: jest.fn(),
      getJob: jest.fn(),
    };
    controller = new ImportController(service as never);
  });

  it('returns 202 payload from startPdfImport', async () => {
    service.startPdfImport.mockResolvedValue({ jobId: 'job-1' });
    const file = {
      mimetype: 'application/pdf',
      size: 10,
      buffer: Buffer.from('%PDF'),
    } as Express.Multer.File;

    await expect(controller.startPdfImport(req, file)).resolves.toEqual({ jobId: 'job-1' });
  });

  it('requires multipart file field', async () => {
    expect(() => controller.startPdfImport(req, undefined)).toThrow(BadRequestException);
  });

  it('returns 202 payload from startMarkdownImport', async () => {
    service.startMarkdownImport.mockResolvedValue({ jobId: 'job-md-1' });
    const file = {
      mimetype: 'text/markdown',
      size: 10,
      buffer: Buffer.from('# Jane'),
    } as Express.Multer.File;

    await expect(controller.startMarkdownImport(req, file)).resolves.toEqual({ jobId: 'job-md-1' });
  });

  it('requires markdown multipart file field', async () => {
    expect(() => controller.startMarkdownImport(req, undefined)).toThrow(BadRequestException);
  });

  it('returns 202 payload from startImageImport', async () => {
    service.startImageImport.mockResolvedValue({ jobId: 'job-img-1' });
    const file = {
      mimetype: 'image/png',
      size: 10,
      buffer: Buffer.from('png'),
    } as Express.Multer.File;

    await expect(controller.startImageImport(req, file)).resolves.toEqual({ jobId: 'job-img-1' });
  });

  it('requires image multipart file field', async () => {
    expect(() => controller.startImageImport(req, undefined)).toThrow(BadRequestException);
  });

  it('returns 202 payload from startDocxImport', async () => {
    service.startDocxImport.mockResolvedValue({ jobId: 'job-docx-1' });
    const file = {
      mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 10,
      buffer: Buffer.from('docx'),
      originalname: 'resume.docx',
    } as Express.Multer.File;

    await expect(controller.startDocxImport(req, file)).resolves.toEqual({ jobId: 'job-docx-1' });
  });

  it('requires docx multipart file field', async () => {
    expect(() => controller.startDocxImport(req, undefined)).toThrow(BadRequestException);
  });

  it('proxies importFromUrl to service', async () => {
    service.importFromUrl.mockResolvedValue({
      kind: 'json',
      data: { basics: { name: 'Jane Doe' } },
    });

    await expect(
      controller.importFromUrl(req, { url: 'https://example.com/resume.json' }),
    ).resolves.toEqual({
      kind: 'json',
      data: { basics: { name: 'Jane Doe' } },
    });
    expect(service.importFromUrl).toHaveBeenCalledWith(user, 'https://example.com/resume.json');
  });

  it('proxies getJob to service', () => {
    service.getJob.mockReturnValue({
      status: 'running',
      progress: 'drafting',
      cvId: undefined,
      previewData: undefined,
      discoveredProfilesCount: undefined,
      errors: undefined,
    });
    expect(controller.getJob(req, 'job-1')).toEqual({
      status: 'running',
      progress: 'drafting',
      cvId: undefined,
      previewData: undefined,
      discoveredProfilesCount: undefined,
      errors: undefined,
    });
    expect(service.getJob).toHaveBeenCalledWith(user, 'job-1');
  });

  it('returns discoveredProfilesCount from getJob when present', () => {
    service.getJob.mockReturnValue({
      status: 'succeeded',
      progress: 'finalizing',
      cvId: undefined,
      previewData: { basics: { name: 'Jane Doe' } },
      discoveredProfilesCount: 2,
      errors: undefined,
    });
    expect(controller.getJob(req, 'job-2')).toMatchObject({
      discoveredProfilesCount: 2,
    });
  });
});
