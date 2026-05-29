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
    Pick<ImportService, 'startPdfImport' | 'startMarkdownImport' | 'getJob'>
  >;

  beforeEach(() => {
    service = {
      startPdfImport: jest.fn(),
      startMarkdownImport: jest.fn(),
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

  it('proxies getJob to service', () => {
    service.getJob.mockReturnValue({
      status: 'running',
      progress: 'drafting',
      cvId: undefined,
      errors: undefined,
    });
    expect(controller.getJob(req, 'job-1')).toEqual({
      status: 'running',
      progress: 'drafting',
      cvId: undefined,
      errors: undefined,
    });
    expect(service.getJob).toHaveBeenCalledWith(user, 'job-1');
  });
});
