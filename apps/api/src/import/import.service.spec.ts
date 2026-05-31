import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  extractDocxTextTool,
  runImageImportWorkflow,
  runPdfImportWorkflow,
  runTextImportWorkflow,
  runWebsiteImportWorkflow,
} from '@resumind/import-agent';
import type { ImportModelCatalog } from '@resumind/import-models';
import catalog from '@resumind/import-models/catalog.json';
import { InvalidImportedResumeError, prepareImportedResume } from '@resumind/types';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import type { ImportModelsCatalogService } from '../import-models-catalog/import-models-catalog.service';
import { ImportService } from './import.service';

const testCatalog = catalog as ImportModelCatalog;

jest.mock('@resumind/import-agent', () => ({
  runPdfImportWorkflow: jest.fn(),
  runTextImportWorkflow: jest.fn(),
  runWebsiteImportWorkflow: jest.fn(),
  runImageImportWorkflow: jest.fn(),
  extractDocxTextTool: jest.fn(),
}));

function mockFetchJsonResume(body: Record<string, unknown>, contentType = 'application/json') {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: { get: () => contentType },
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  }) as never;
}

function mockFetchHtml(html: string) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: { get: () => 'text/html' },
    text: jest.fn().mockResolvedValue(html),
  }) as never;
}

jest.mock('@resumind/types', () => {
  const actual = jest.requireActual<typeof import('@resumind/types')>('@resumind/types');
  return {
    ...actual,
    prepareImportedResume: jest.fn(actual.prepareImportedResume),
  };
});

describe('ImportService', () => {
  const user = {
    id: 'u1',
    email: 'u@test.dev',
    accessToken: 'tok',
  } as AuthenticatedRequest['user'];

  let service: ImportService;
  let aiAgentCredentialService: { getActiveCredentials: jest.Mock };
  let catalogService: Pick<ImportModelsCatalogService, 'getCatalog'>;
  let schemaValidator: { validate: jest.Mock };
  let webScrapeService: { getDecryptedConfig: jest.Mock };

  beforeEach(() => {
    jest
      .mocked(prepareImportedResume)
      .mockImplementation(
        jest.requireActual<typeof import('@resumind/types')>('@resumind/types')
          .prepareImportedResume,
      );
    aiAgentCredentialService = { getActiveCredentials: jest.fn() };
    catalogService = { getCatalog: () => testCatalog };
    schemaValidator = { validate: jest.fn() };
    webScrapeService = { getDecryptedConfig: jest.fn().mockResolvedValue(null) };

    service = new ImportService(
      {
        get: jest.fn((key: string) => {
          if (key === 'PDF_IMPORT_ENABLED') return 'true';
          if (key === 'PDF_IMPORT_MAX_BYTES') return '5242880';
          return undefined;
        }),
      } as never,
      aiAgentCredentialService as never,
      catalogService as never,
      schemaValidator as never,
      webScrapeService as never,
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
    jest.mocked(runPdfImportWorkflow).mockImplementation(async ({ onProgress }) => {
      onProgress?.('extracting');
      return { draft: { basics: { name: 'Jane Doe' } }, errors: [] };
    });
    schemaValidator.validate.mockReturnValue(undefined);

    const result = await service.startPdfImport(user, {
      mimetype: 'application/pdf',
      size: 100,
      buffer: Buffer.from('%PDF'),
    } as Express.Multer.File);

    expect(result.jobId).toEqual(expect.any(String));
    await new Promise((resolve) => setImmediate(resolve));
    expect(runPdfImportWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        onProgress: expect.any(Function),
      }),
    );
    expect(service.getJob(user, result.jobId).status).toBe('succeeded');
    expect(service.getJob(user, result.jobId).previewData).toMatchObject({
      basics: { name: 'Jane Doe' },
    });
  });

  it('uses default max bytes when PDF_IMPORT_MAX_BYTES is unset', () => {
    expect(service.getMaxBytes()).toBe(5 * 1024 * 1024);
  });

  it('reads configured max bytes from environment', () => {
    service = new ImportService(
      {
        get: jest.fn((key: string) => {
          if (key === 'PDF_IMPORT_MAX_BYTES') return '2048';
          return undefined;
        }),
      } as never,
      aiAgentCredentialService as never,
      catalogService as never,
      schemaValidator as never,
      webScrapeService as never,
    );

    expect(service.getMaxBytes()).toBe(2048);
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
      catalogService as never,
      schemaValidator as never,
      webScrapeService as never,
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

  it('stores previewData when workflow returns a valid draft', async () => {
    aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'sk-test',
      accountId: 'acc-1',
    });
    schemaValidator.validate.mockReturnValue(undefined);
    jest.mocked(runPdfImportWorkflow).mockResolvedValue({
      draft: { basics: { name: 'Jane Doe' } },
      errors: [],
    });

    const result = await service.startPdfImport(user, {
      mimetype: 'application/pdf',
      size: 100,
      buffer: Buffer.from('%PDF'),
    } as Express.Multer.File);

    await new Promise((resolve) => setImmediate(resolve));
    expect(service.getJob(user, result.jobId)).toMatchObject({
      status: 'succeeded',
      previewData: expect.objectContaining({ basics: { name: 'Jane Doe' } }),
    });
    expect(service.getJob(user, result.jobId).cvId).toBeUndefined();
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

  it('marks job failed when workflow succeeds without draft', async () => {
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
      errors: ['Import failed before preview'],
    });
  });

  it('restores a previous provider API key env var after the job finishes', async () => {
    process.env.OPENAI_API_KEY = 'existing-key';
    aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'sk-test',
      accountId: 'acc-1',
    });
    jest.mocked(runPdfImportWorkflow).mockResolvedValue({
      draft: { basics: { name: 'Jane Doe' } },
      errors: [],
    });
    schemaValidator.validate.mockReturnValue(undefined);

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

    it('rejects invalid JSON bodies', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { get: () => 'application/json' },
        text: jest.fn().mockResolvedValue('{not-json'),
      }) as never;

      await expect(service.importFromUrl(user, 'https://example.com/data')).rejects.toThrow(
        'URL returned invalid JSON',
      );
    });

    it('returns prepared data for valid JSON resume', async () => {
      mockFetchJsonResume({ basics: { name: 'Test User' } });
      schemaValidator.validate.mockReturnValue(undefined);

      const result = await service.importFromUrl(user, 'https://example.com/data');
      expect(result).toEqual({
        kind: 'json',
        data: expect.objectContaining({ basics: { name: 'Test User' } }),
      });
    });

    it('handles non-Error thrown in fetch', async () => {
      global.fetch = jest.fn().mockRejectedValue('string error') as never;

      await expect(service.importFromUrl(user, 'https://example.com/data')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('parses JSON bodies without a JSON content-type', async () => {
      mockFetchJsonResume({ basics: { name: 'No Header User' } }, '');
      schemaValidator.validate.mockReturnValue(undefined);

      const result = await service.importFromUrl(user, 'https://example.com/data');
      expect(result.kind).toBe('json');
      expect(result).toMatchObject({
        data: expect.objectContaining({ basics: { name: 'No Header User' } }),
      });
    });

    it('starts an agent job for HTML pages when AI is configured', async () => {
      mockFetchHtml('<html><body>CV</body></html>');
      aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
        modelId: 'openai/gpt-4o-mini',
        apiKey: 'sk-test',
        accountId: 'acc-1',
      });
      jest.mocked(runWebsiteImportWorkflow).mockResolvedValue({
        draft: { basics: { name: 'HTML User' } },
        errors: [],
      });

      const result = await service.importFromUrl(user, 'https://example.com/profile');
      expect(result).toEqual({ kind: 'job', jobId: expect.any(String) });

      await new Promise((resolve) => setImmediate(resolve));
      const job = service.getJob(user, result.kind === 'job' ? result.jobId : '');
      expect(job.previewData).toMatchObject({ basics: { name: 'HTML User' } });
    });

    it('marks website import job failed on workflow errors', async () => {
      mockFetchHtml('<html><body>CV</body></html>');
      aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
        modelId: 'openai/gpt-4o-mini',
        apiKey: 'sk-test',
        accountId: 'acc-1',
      });
      jest.mocked(runWebsiteImportWorkflow).mockRejectedValue(new Error('scrape failed'));

      const result = await service.importFromUrl(user, 'https://example.com/profile');

      await new Promise((resolve) => setImmediate(resolve));
      expect(service.getJob(user, result.kind === 'job' ? result.jobId : '').errors).toEqual([
        'scrape failed',
      ]);
    });

    it('maps auth failures during website import to a friendly error', async () => {
      mockFetchHtml('<html><body>CV</body></html>');
      aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
        modelId: 'openai/gpt-4o-mini',
        apiKey: 'sk-test',
        accountId: 'acc-1',
      });
      jest.mocked(runWebsiteImportWorkflow).mockRejectedValue(new Error('401 invalid api key'));

      const result = await service.importFromUrl(user, 'https://example.com/profile');

      await new Promise((resolve) => setImmediate(resolve));
      expect(service.getJob(user, result.kind === 'job' ? result.jobId : '').errors?.[0]).toMatch(
        /AI agent settings/i,
      );
    });

    it('passes Tavily search key to website import workflow', async () => {
      mockFetchHtml('<html><body>CV</body></html>');
      webScrapeService.getDecryptedConfig.mockResolvedValue({
        provider: 'tavily',
        apiKey: 'tvly-test',
      });
      aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
        modelId: 'openai/gpt-4o-mini',
        apiKey: 'sk-test',
        accountId: 'acc-1',
      });
      jest
        .mocked(runWebsiteImportWorkflow)
        .mockImplementation(async ({ onProgress, toolsConfig }) => {
          onProgress?.('extracting');
          expect(toolsConfig?.searchApiKey).toBe('tvly-test');
          return { draft: { basics: { name: 'HTML User' } }, errors: [] };
        });

      const result = await service.importFromUrl(user, 'https://example.com/profile');

      await new Promise((resolve) => setImmediate(resolve));
      expect(runWebsiteImportWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          onProgress: expect.any(Function),
        }),
      );
      expect(service.getJob(user, result.kind === 'job' ? result.jobId : '').status).toBe(
        'succeeded',
      );
    });

    it('marks website import job failed when preview draft is invalid', async () => {
      mockFetchHtml('<html><body>CV</body></html>');
      aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
        modelId: 'openai/gpt-4o-mini',
        apiKey: 'sk-test',
        accountId: 'acc-1',
      });
      jest.mocked(runWebsiteImportWorkflow).mockResolvedValue({
        draft: { basics: {} },
        errors: [],
      });
      jest.mocked(prepareImportedResume).mockImplementationOnce(() => {
        throw new InvalidImportedResumeError('missing name');
      });

      const result = await service.importFromUrl(user, 'https://example.com/profile');

      await new Promise((resolve) => setImmediate(resolve));
      expect(service.getJob(user, result.kind === 'job' ? result.jobId : '')).toMatchObject({
        status: 'failed',
        errors: ['missing name'],
      });
    });

    it('marks website import job failed when preview validation fails', async () => {
      mockFetchHtml('<html><body>CV</body></html>');
      aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
        modelId: 'openai/gpt-4o-mini',
        apiKey: 'sk-test',
        accountId: 'acc-1',
      });
      jest.mocked(runWebsiteImportWorkflow).mockResolvedValue({
        draft: { basics: { name: 'Jane Doe' } },
        errors: [],
      });
      schemaValidator.validate.mockImplementation(() => {
        throw new BadRequestException('invalid schema');
      });

      const result = await service.importFromUrl(user, 'https://example.com/profile');

      await new Promise((resolve) => setImmediate(resolve));
      expect(service.getJob(user, result.kind === 'job' ? result.jobId : '')).toMatchObject({
        status: 'failed',
        errors: ['Imported page did not produce valid JSON Resume data'],
      });
    });

    it('rejects HTML import when AI agent is not configured', async () => {
      mockFetchHtml('<html></html>');
      aiAgentCredentialService.getActiveCredentials.mockRejectedValue(
        new UnprocessableEntityException('Active AI agent configuration is required'),
      );

      await expect(service.importFromUrl(user, 'https://example.com/profile')).rejects.toThrow(
        'Configure an AI agent account',
      );
    });

    it('accepts text/plain JSON responses', async () => {
      mockFetchJsonResume({ basics: { name: 'Plain Text User' } }, 'text/plain');
      schemaValidator.validate.mockReturnValue(undefined);

      const result = await service.importFromUrl(user, 'https://example.com/resume.txt');
      expect(result.kind).toBe('json');
      expect(result).toMatchObject({
        data: expect.objectContaining({ basics: { name: 'Plain Text User' } }),
      });
    });

    it('rejects HTTP error responses from URL import', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: { get: () => 'application/json' },
      }) as never;

      await expect(service.importFromUrl(user, 'https://example.com/missing')).rejects.toThrow(
        'URL returned 404 Not Found',
      );
    });

    it('falls back to agent import when JSON body fails prepareImportedResume', async () => {
      mockFetchJsonResume({ basics: {} });
      aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
        modelId: 'openai/gpt-4o-mini',
        apiKey: 'sk-test',
        accountId: 'acc-1',
      });
      jest.mocked(prepareImportedResume).mockImplementationOnce(() => {
        throw new InvalidImportedResumeError('missing basics');
      });
      jest.mocked(runWebsiteImportWorkflow).mockResolvedValue({
        draft: { basics: { name: 'Agent User' } },
        errors: [],
      });

      const result = await service.importFromUrl(user, 'https://example.com/data');
      expect(result.kind).toBe('job');
    });

    it('rewrites registry profile URLs before fetching', async () => {
      mockFetchJsonResume({ basics: { name: 'Registry User' } });
      schemaValidator.validate.mockReturnValue(undefined);

      const result = await service.importFromUrl(
        user,
        'https://registry.jsonresume.org/thomasdavis',
      );
      expect(global.fetch).toHaveBeenCalledWith(
        'https://registry.jsonresume.org/thomasdavis.json',
        expect.any(Object),
      );
      expect(result).toMatchObject({
        kind: 'json',
        data: expect.objectContaining({ basics: { name: 'Registry User' } }),
      });
    });

    it('rejects URL import when JSON fails validation and imports are disabled', async () => {
      mockFetchJsonResume({ basics: { name: 'Invalid User' } });
      schemaValidator.validate.mockImplementation(() => {
        throw new BadRequestException('invalid schema');
      });
      service = new ImportService(
        {
          get: jest.fn((key: string) => (key === 'PDF_IMPORT_ENABLED' ? 'false' : undefined)),
        } as never,
        aiAgentCredentialService as never,
        catalogService as never,
        schemaValidator as never,
        webScrapeService as never,
      );

      await expect(service.importFromUrl(user, 'https://example.com/data')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('rethrows unexpected prepareImportedResume failures during URL import', async () => {
      mockFetchJsonResume({ basics: { name: 'Broken User' } });
      jest.mocked(prepareImportedResume).mockImplementationOnce(() => {
        throw new Error('unexpected prepare failure');
      });

      await expect(service.importFromUrl(user, 'https://example.com/data')).rejects.toThrow(
        'unexpected prepare failure',
      );
    });

    it('falls back to agent import when JSON body fails schema validation', async () => {
      mockFetchJsonResume({ basics: { name: 'Invalid User' } });
      schemaValidator.validate.mockImplementation(() => {
        throw new BadRequestException('invalid schema');
      });
      aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
        modelId: 'openai/gpt-4o-mini',
        apiKey: 'sk-test',
        accountId: 'acc-1',
      });
      jest.mocked(runWebsiteImportWorkflow).mockResolvedValue({
        draft: { basics: { name: 'Agent User' } },
        errors: [],
      });

      const result = await service.importFromUrl(user, 'https://example.com/data');

      expect(result.kind).toBe('job');
    });
  });

  describe('startMarkdownImport', () => {
    it('rejects non-markdown uploads', async () => {
      aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
        modelId: 'openai/gpt-4o-mini',
        apiKey: 'sk-test',
        accountId: 'acc-1',
      });

      await expect(
        service.startMarkdownImport(user, {
          mimetype: 'application/pdf',
          size: 100,
          buffer: Buffer.from('# Hello'),
        } as Express.Multer.File),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects oversize markdown files', async () => {
      aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
        modelId: 'openai/gpt-4o-mini',
        apiKey: 'sk-test',
        accountId: 'acc-1',
      });
      service = new ImportService(
        {
          get: jest.fn((key: string) => {
            if (key === 'MARKDOWN_IMPORT_MAX_BYTES') return '10';
            return undefined;
          }),
        } as never,
        aiAgentCredentialService as never,
        catalogService as never,
        schemaValidator as never,
        webScrapeService as never,
      );

      await expect(
        service.startMarkdownImport(user, {
          mimetype: 'text/markdown',
          size: 20,
          buffer: Buffer.from('# Too large markdown file'),
        } as Express.Multer.File),
      ).rejects.toThrow(/maximum size/i);
    });

    it('rejects empty markdown files', async () => {
      aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
        modelId: 'openai/gpt-4o-mini',
        apiKey: 'sk-test',
        accountId: 'acc-1',
      });

      await expect(
        service.startMarkdownImport(user, {
          mimetype: 'text/markdown',
          size: 0,
          buffer: Buffer.from('   '),
        } as Express.Multer.File),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('enqueues a markdown import job', async () => {
      aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
        modelId: 'openai/gpt-4o-mini',
        apiKey: 'sk-test',
        accountId: 'acc-1',
      });
      jest.mocked(runTextImportWorkflow).mockResolvedValue({
        draft: { basics: { name: 'Jane Doe' } },
        errors: [],
      });
      schemaValidator.validate.mockReturnValue(undefined);

      const result = await service.startMarkdownImport(user, {
        mimetype: 'text/markdown',
        size: 20,
        buffer: Buffer.from('# Jane Doe\nEngineer'),
      } as Express.Multer.File);

      expect(result.jobId).toEqual(expect.any(String));
      await new Promise((resolve) => setImmediate(resolve));
      expect(runTextImportWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceText: '# Jane Doe\nEngineer',
        }),
      );
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
        catalogService as never,
        schemaValidator as never,
        webScrapeService as never,
      );

      await expect(
        service.startMarkdownImport(user, {
          mimetype: 'text/markdown',
          size: 20,
          buffer: Buffer.from('# Jane'),
        } as Express.Multer.File),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('marks markdown job failed on workflow errors', async () => {
      aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
        modelId: 'openai/gpt-4o-mini',
        apiKey: 'sk-test',
        accountId: 'acc-1',
      });
      jest.mocked(runTextImportWorkflow).mockRejectedValue(new Error('markdown parse failed'));

      const result = await service.startMarkdownImport(user, {
        mimetype: 'text/plain',
        size: 20,
        buffer: Buffer.from('# Jane Doe'),
      } as Express.Multer.File);

      await new Promise((resolve) => setImmediate(resolve));
      expect(service.getJob(user, result.jobId).errors).toEqual(['markdown parse failed']);
    });

    it('passes Tavily search key to markdown import workflow', async () => {
      webScrapeService.getDecryptedConfig.mockResolvedValue({
        provider: 'tavily',
        apiKey: 'tvly-test',
      });
      aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
        modelId: 'openai/gpt-4o-mini',
        apiKey: 'sk-test',
        accountId: 'acc-1',
      });
      jest.mocked(runTextImportWorkflow).mockResolvedValue({
        draft: { basics: { name: 'Jane Doe' } },
        errors: [],
      });
      schemaValidator.validate.mockReturnValue(undefined);

      const result = await service.startMarkdownImport(user, {
        mimetype: 'text/markdown',
        size: 20,
        buffer: Buffer.from('# Jane Doe\nEngineer'),
      } as Express.Multer.File);

      await new Promise((resolve) => setImmediate(resolve));
      expect(runTextImportWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({ searchApiKey: 'tvly-test' }),
      );
      expect(service.getJob(user, result.jobId).status).toBe('succeeded');
    });

    it('updates markdown job progress from workflow callbacks', async () => {
      aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
        modelId: 'openai/gpt-4o-mini',
        apiKey: 'sk-test',
        accountId: 'acc-1',
      });
      jest.mocked(runTextImportWorkflow).mockImplementation(async ({ onProgress }) => {
        onProgress?.('drafting');
        return { draft: { basics: { name: 'Jane Doe' } }, errors: [] };
      });
      schemaValidator.validate.mockReturnValue(undefined);

      const result = await service.startMarkdownImport(user, {
        mimetype: 'text/markdown',
        size: 20,
        buffer: Buffer.from('# Jane Doe\nEngineer'),
      } as Express.Multer.File);

      await new Promise((resolve) => setImmediate(resolve));
      expect(runTextImportWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          onProgress: expect.any(Function),
        }),
      );
    });
  });

  describe('startImageImport', () => {
    it('rejects non-image uploads', async () => {
      aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
        modelId: 'openai/gpt-4o-mini',
        apiKey: 'sk-test',
        accountId: 'acc-1',
      });

      await expect(
        service.startImageImport(user, {
          mimetype: 'application/pdf',
          size: 100,
          buffer: Buffer.from('%PDF'),
        } as Express.Multer.File),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('enqueues an image import job', async () => {
      aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
        modelId: 'openai/gpt-4o-mini',
        apiKey: 'sk-test',
        accountId: 'acc-1',
      });
      jest.mocked(runImageImportWorkflow).mockResolvedValue({
        draft: { basics: { name: 'Jane Doe' } },
        errors: [],
      });
      schemaValidator.validate.mockReturnValue(undefined);

      const result = await service.startImageImport(user, {
        mimetype: 'image/png',
        size: 100,
        buffer: Buffer.from('png'),
      } as Express.Multer.File);

      expect(result.jobId).toEqual(expect.any(String));
      await new Promise((resolve) => setImmediate(resolve));
      expect(runImageImportWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          imageMimeType: 'image/png',
        }),
      );
      expect(service.getJob(user, result.jobId).status).toBe('succeeded');
    });
  });

  describe('startDocxImport', () => {
    it('rejects non-docx uploads', async () => {
      aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
        modelId: 'openai/gpt-4o-mini',
        apiKey: 'sk-test',
        accountId: 'acc-1',
      });

      await expect(
        service.startDocxImport(user, {
          mimetype: 'text/plain',
          size: 100,
          buffer: Buffer.from('hello'),
          originalname: 'resume.txt',
        } as Express.Multer.File),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('enqueues a docx import job', async () => {
      aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
        modelId: 'openai/gpt-4o-mini',
        apiKey: 'sk-test',
        accountId: 'acc-1',
      });
      jest.mocked(extractDocxTextTool).mockResolvedValue({ text: 'Jane Doe\nEngineer' });
      jest.mocked(runTextImportWorkflow).mockResolvedValue({
        draft: { basics: { name: 'Jane Doe' } },
        errors: [],
      });
      schemaValidator.validate.mockReturnValue(undefined);

      const result = await service.startDocxImport(user, {
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 100,
        buffer: Buffer.from('docx'),
        originalname: 'resume.docx',
      } as Express.Multer.File);

      expect(result.jobId).toEqual(expect.any(String));
      await new Promise((resolve) => setImmediate(resolve));
      expect(extractDocxTextTool).toHaveBeenCalled();
      expect(runTextImportWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceText: 'Jane Doe\nEngineer',
        }),
      );
      expect(service.getJob(user, result.jobId).status).toBe('succeeded');
    });
  });

  describe('resolveApiKeyEnvVar', () => {
    it('returns null when model not found in catalog', async () => {
      aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
        modelId: 'unknown/model',
        apiKey: 'sk-test',
        accountId: 'acc-1',
      });
      jest.mocked(runPdfImportWorkflow).mockResolvedValue({
        draft: { basics: { name: 'Jane Doe' } },
        errors: [],
      });
      schemaValidator.validate.mockReturnValue(undefined);

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
