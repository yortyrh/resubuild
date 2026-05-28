import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { runPdfImportWorkflow } from '@resumind/import-agent';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import { ImportService } from './import.service';

jest.mock('@resumind/import-agent', () => ({
  runPdfImportWorkflow: jest.fn(),
}));

describe('ImportService', () => {
  const user = {
    id: 'u1',
    email: 'u@test.dev',
    accessToken: 'tok',
  } as AuthenticatedRequest['user'];

  let service: ImportService;
  let importLlmConfigRepository: { getDecryptedConfig: jest.Mock };
  let cvService: { create: jest.Mock };

  beforeEach(() => {
    importLlmConfigRepository = { getDecryptedConfig: jest.fn() };
    cvService = { create: jest.fn() };

    service = new ImportService(
      {
        get: jest.fn((key: string) => {
          if (key === 'PDF_IMPORT_ENABLED') return 'true';
          if (key === 'PDF_IMPORT_MAX_BYTES') return '5242880';
          return undefined;
        }),
      } as never,
      importLlmConfigRepository as never,
      cvService as never,
    );
  });

  it('rejects import when LLM config is missing', async () => {
    importLlmConfigRepository.getDecryptedConfig.mockResolvedValue(null);

    await expect(
      service.startPdfImport(user, {
        mimetype: 'application/pdf',
        size: 100,
        buffer: Buffer.from('%PDF'),
      } as Express.Multer.File),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects non-pdf uploads', async () => {
    importLlmConfigRepository.getDecryptedConfig.mockResolvedValue({
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'sk-test',
      configuredAt: 'now',
    });

    await expect(
      service.startPdfImport(user, {
        mimetype: 'text/plain',
        size: 100,
        buffer: Buffer.from('hello'),
      } as Express.Multer.File),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns 404 for unknown jobs', () => {
    expect(() => service.getJob(user, 'missing-job')).toThrow(NotFoundException);
  });

  it('enqueues a job when config and mime type are valid', async () => {
    importLlmConfigRepository.getDecryptedConfig.mockResolvedValue({
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'sk-test',
      configuredAt: 'now',
    });
    jest.mocked(runPdfImportWorkflow).mockResolvedValue({ cvId: 'cv-1', errors: [] });

    const result = await service.startPdfImport(user, {
      mimetype: 'application/pdf',
      size: 100,
      buffer: Buffer.from('%PDF'),
    } as Express.Multer.File);

    expect(result.jobId).toEqual(expect.any(String));
    await new Promise((resolve) => setImmediate(resolve));
    expect(runPdfImportWorkflow).toHaveBeenCalled();
    expect(service.getJob(user, result.jobId).status).toBe('succeeded');
  });

  it('rejects when feature flag is disabled', async () => {
    service = new ImportService(
      {
        get: jest.fn((key: string) => {
          if (key === 'PDF_IMPORT_ENABLED') return 'false';
          return undefined;
        }),
      } as never,
      importLlmConfigRepository as never,
      cvService as never,
    );

    await expect(
      service.startPdfImport(user, {
        mimetype: 'application/pdf',
        size: 100,
        buffer: Buffer.from('%PDF'),
      } as Express.Multer.File),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects oversize uploads', async () => {
    importLlmConfigRepository.getDecryptedConfig.mockResolvedValue({
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'sk-test',
      configuredAt: 'now',
    });

    await expect(
      service.startPdfImport(user, {
        mimetype: 'application/pdf',
        size: 6 * 1024 * 1024,
        buffer: Buffer.alloc(1),
      } as Express.Multer.File),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('marks job failed when workflow returns validation errors', async () => {
    importLlmConfigRepository.getDecryptedConfig.mockResolvedValue({
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'sk-test',
      configuredAt: 'now',
    });
    jest.mocked(runPdfImportWorkflow).mockResolvedValue({ errors: ['/basics: invalid'] });

    const result = await service.startPdfImport(user, {
      mimetype: 'application/pdf',
      size: 100,
      buffer: Buffer.from('%PDF'),
    } as Express.Multer.File);

    await new Promise((resolve) => setImmediate(resolve));
    expect(service.getJob(user, result.jobId)).toMatchObject({
      status: 'failed',
      errors: ['/basics: invalid'],
    });
  });

  it('marks job failed with LLM settings hint on auth-like errors', async () => {
    importLlmConfigRepository.getDecryptedConfig.mockResolvedValue({
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'sk-test',
      configuredAt: 'now',
    });
    jest.mocked(runPdfImportWorkflow).mockRejectedValue(new Error('401 invalid api key'));

    const result = await service.startPdfImport(user, {
      mimetype: 'application/pdf',
      size: 100,
      buffer: Buffer.from('%PDF'),
    } as Express.Multer.File);

    await new Promise((resolve) => setImmediate(resolve));
    expect(service.getJob(user, result.jobId).errors?.[0]).toMatch(/LLM settings/i);
  });

  it('creates CV through workflow finalize callback', async () => {
    importLlmConfigRepository.getDecryptedConfig.mockResolvedValue({
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'sk-test',
      configuredAt: 'now',
    });
    cvService.create.mockResolvedValue({ id: 'cv-final' });
    jest.mocked(runPdfImportWorkflow).mockImplementation(async (input) => {
      const cvId = await input.finalize?.({ basics: { name: 'Jane Doe' } });
      return { cvId, errors: [] };
    });

    const result = await service.startPdfImport(user, {
      mimetype: 'application/pdf',
      size: 100,
      buffer: Buffer.from('%PDF'),
    } as Express.Multer.File);

    await new Promise((resolve) => setImmediate(resolve));
    expect(cvService.create).toHaveBeenCalled();
    expect(service.getJob(user, result.jobId).cvId).toBe('cv-final');
  });

  it('marks job failed with generic workflow errors', async () => {
    importLlmConfigRepository.getDecryptedConfig.mockResolvedValue({
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'sk-test',
      configuredAt: 'now',
    });
    jest.mocked(runPdfImportWorkflow).mockRejectedValue(new Error('parse failed'));

    const result = await service.startPdfImport(user, {
      mimetype: 'application/pdf',
      size: 100,
      buffer: Buffer.from('%PDF'),
    } as Express.Multer.File);

    await new Promise((resolve) => setImmediate(resolve));
    expect(service.getJob(user, result.jobId).errors).toEqual(['parse failed']);
  });

  it('marks job failed when workflow succeeds without cvId', async () => {
    importLlmConfigRepository.getDecryptedConfig.mockResolvedValue({
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'sk-test',
      configuredAt: 'now',
    });
    jest.mocked(runPdfImportWorkflow).mockResolvedValue({ errors: [] });

    const result = await service.startPdfImport(user, {
      mimetype: 'application/pdf',
      size: 100,
      buffer: Buffer.from('%PDF'),
    } as Express.Multer.File);

    await new Promise((resolve) => setImmediate(resolve));
    expect(service.getJob(user, result.jobId)).toMatchObject({
      status: 'failed',
      errors: ['Import failed before CV creation'],
    });
  });

  it('handles non-error workflow rejections', async () => {
    importLlmConfigRepository.getDecryptedConfig.mockResolvedValue({
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'sk-test',
      configuredAt: 'now',
    });
    jest.mocked(runPdfImportWorkflow).mockRejectedValue('bad');

    const result = await service.startPdfImport(user, {
      mimetype: 'application/pdf',
      size: 100,
      buffer: Buffer.from('%PDF'),
    } as Express.Multer.File);

    await new Promise((resolve) => setImmediate(resolve));
    expect(service.getJob(user, result.jobId).errors).toEqual(['Import failed']);
  });
});
