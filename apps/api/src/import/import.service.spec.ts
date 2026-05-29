import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { runPdfImportWorkflow } from '@resumind/import-agent';
import type { ImportModelCatalog } from '@resumind/import-models';
import catalog from '@resumind/import-models/catalog.json';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import type { ImportModelsCatalogService } from '../import-models-catalog/import-models-catalog.service';
import { ImportService } from './import.service';

const testCatalog = catalog as ImportModelCatalog;

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
  let aiAgentCredentialService: { getActiveCredentials: jest.Mock };
  let cvService: { create: jest.Mock };
  let catalogService: Pick<ImportModelsCatalogService, 'getCatalog'>;
  let schemaValidator: { validate: jest.Mock };

  beforeEach(() => {
    aiAgentCredentialService = { getActiveCredentials: jest.fn() };
    cvService = { create: jest.fn() };
    catalogService = { getCatalog: () => testCatalog };
    schemaValidator = { validate: jest.fn() };

    service = new ImportService(
      {
        get: jest.fn((key: string) => {
          if (key === 'PDF_IMPORT_ENABLED') return 'true';
          if (key === 'PDF_IMPORT_MAX_BYTES') return '5242880';
          return undefined;
        }),
      } as never,
      aiAgentCredentialService as never,
      cvService as never,
      catalogService as never,
      schemaValidator as never,
    );
  });

  it('rejects import when AI agent config is missing', async () => {
    aiAgentCredentialService.getActiveCredentials.mockRejectedValue(
      new UnprocessableEntityException('Active AI agent configuration is required'),
    );

    await expect(
      service.startPdfImport(user, {
        mimetype: 'application/pdf',
        size: 100,
        buffer: Buffer.from('%PDF'),
      } as Express.Multer.File),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects non-pdf uploads', async () => {
    aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'sk-test',
      accountId: 'acc-1',
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
    aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'sk-test',
      accountId: 'acc-1',
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
      aiAgentCredentialService as never,
      cvService as never,
      catalogService as never,
      schemaValidator as never,
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
    aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'sk-test',
      accountId: 'acc-1',
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
    aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'sk-test',
      accountId: 'acc-1',
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
    aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'sk-test',
      accountId: 'acc-1',
    });
    jest.mocked(runPdfImportWorkflow).mockRejectedValue(new Error('401 invalid api key'));

    const result = await service.startPdfImport(user, {
      mimetype: 'application/pdf',
      size: 100,
      buffer: Buffer.from('%PDF'),
    } as Express.Multer.File);

    await new Promise((resolve) => setImmediate(resolve));
    expect(service.getJob(user, result.jobId).errors?.[0]).toMatch(/AI agent settings/i);
  });

  it('creates CV through workflow finalize callback', async () => {
    aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'sk-test',
      accountId: 'acc-1',
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
    aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'sk-test',
      accountId: 'acc-1',
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
    aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'sk-test',
      accountId: 'acc-1',
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

  it('restores a previous provider API key env var after the job finishes', async () => {
    process.env.OPENAI_API_KEY = 'existing-key';
    aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'sk-test',
      accountId: 'acc-1',
    });
    jest.mocked(runPdfImportWorkflow).mockResolvedValue({ cvId: 'cv-1', errors: [] });

    const result = await service.startPdfImport(user, {
      mimetype: 'application/pdf',
      size: 100,
      buffer: Buffer.from('%PDF'),
    } as Express.Multer.File);

    await new Promise((resolve) => setImmediate(resolve));
    expect(process.env.OPENAI_API_KEY).toBe('existing-key');
    expect(service.getJob(user, result.jobId).status).toBe('succeeded');
  });

  it('handles non-error workflow rejections', async () => {
    aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'sk-test',
      accountId: 'acc-1',
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

  describe('importFromUrl', () => {
    it('rejects invalid URLs', async () => {
      await expect(service.importFromUrl(user, 'not-a-url')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects non-JSON responses', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { get: () => 'text/html' },
      }) as never;

      await expect(service.importFromUrl(user, 'https://example.com/data')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects invalid JSON', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { get: () => 'application/json' },
        json: jest.fn().mockRejectedValue(new Error('parse error')),
      }) as never;

      await expect(service.importFromUrl(user, 'https://example.com/data')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects non-resume JSON', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { get: () => 'application/json' },
        json: jest.fn().mockResolvedValue({ not: 'a resume' }),
      }) as never;

      schemaValidator.validate.mockImplementation(() => {
        throw new Error('invalid schema');
      });

      await expect(service.importFromUrl(user, 'https://example.com/data')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('returns prepared data for valid JSON resume', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { get: () => 'application/json' },
        json: jest.fn().mockResolvedValue({ basics: { name: 'Test User' } }),
      }) as never;

      schemaValidator.validate.mockReturnValue(undefined);

      const result = await service.importFromUrl(user, 'https://example.com/data');
      expect(result.data).toMatchObject({ basics: { name: 'Test User' } });
    });

    it('handles non-Error thrown in fetch', async () => {
      global.fetch = jest.fn().mockRejectedValue('string error') as never;

      await expect(service.importFromUrl(user, 'https://example.com/data')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('handles InvalidImportedResumeError from prepareImportedResume', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { get: () => 'application/json' },
        json: jest.fn().mockResolvedValue({ basics: {} }),
      }) as never;

      const { InvalidImportedResumeError } = require('@resumind/types');
      schemaValidator.validate.mockImplementation(() => {
        throw new InvalidImportedResumeError('missing basics');
      });

      await expect(service.importFromUrl(user, 'https://example.com/data')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('re-throws unknown errors from prepareImportedResume', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { get: () => 'application/json' },
        json: jest.fn().mockResolvedValue({ basics: {} }),
      }) as never;

      schemaValidator.validate.mockImplementation(() => {
        throw { unknown: 'error' };
      });

      await expect(service.importFromUrl(user, 'https://example.com/data')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('resolveApiKeyEnvVar', () => {
    it('returns null when model not found in catalog', async () => {
      aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
        modelId: 'unknown/model',
        apiKey: 'sk-test',
        accountId: 'acc-1',
      });
      jest.mocked(runPdfImportWorkflow).mockResolvedValue({ cvId: 'cv-1', errors: [] });

      const result = await service.startPdfImport(user, {
        mimetype: 'application/pdf',
        size: 100,
        buffer: Buffer.from('%PDF'),
      } as Express.Multer.File);

      await new Promise((resolve) => setImmediate(resolve));
      expect(service.getJob(user, result.jobId).status).toBe('succeeded');
    });
  });
});
