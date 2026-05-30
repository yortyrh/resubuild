import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type ImportJobProgress,
  runPdfImportWorkflow,
  runTextImportWorkflow,
  runWebsiteImportWorkflow,
  type WebsiteImportToolsConfig,
} from '@resumind/import-agent';
import { InvalidImportedResumeError, prepareImportedResume } from '@resumind/types';
import { AiAgentCredentialService } from '../ai-agent/ai-agent-credential.service';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import { CvService } from '../cv/cv.service';
import { ImportModelsCatalogService } from '../import-models-catalog/import-models-catalog.service';
import { ResumeSchemaValidator } from '../validation/resume-schema.validator';
import { WebScrapeService } from '../web-scrape/web-scrape.service';
import { ImportJobStore } from './import-job.store';
import { resolveImportUrl, validateImportUrl } from './import-url.util';

export type ImportFromUrlResponse =
  | { kind: 'json'; data: Record<string, unknown> }
  | { kind: 'job'; jobId: string };

export const PDF_IMPORT_MAX_BYTES_DEFAULT = 5 * 1024 * 1024;
export const MARKDOWN_IMPORT_MAX_BYTES_DEFAULT = 512 * 1024;

const MARKDOWN_MIME_TYPES = new Set(['text/markdown', 'text/plain', 'text/x-markdown']);

@Injectable()
export class ImportService {
  private readonly jobStore = new ImportJobStore();

  constructor(
    private readonly configService: ConfigService,
    private readonly aiAgentCredentialService: AiAgentCredentialService,
    private readonly cvService: CvService,
    private readonly catalogService: ImportModelsCatalogService,
    private readonly schemaValidator: ResumeSchemaValidator,
    private readonly webScrapeService: WebScrapeService,
  ) {}

  isEnabled(): boolean {
    return this.configService.get<string>('PDF_IMPORT_ENABLED', 'true') !== 'false';
  }

  getMaxBytes(): number {
    return Number(
      this.configService.get<string>('PDF_IMPORT_MAX_BYTES') ?? PDF_IMPORT_MAX_BYTES_DEFAULT,
    );
  }

  getMarkdownMaxBytes(): number {
    return Number(
      this.configService.get<string>('MARKDOWN_IMPORT_MAX_BYTES') ??
        MARKDOWN_IMPORT_MAX_BYTES_DEFAULT,
    );
  }

  async startPdfImport(user: AuthenticatedRequest['user'], file: Express.Multer.File) {
    if (!this.isEnabled()) {
      throw new ForbiddenException('PDF import is disabled');
    }

    const llmConfig = await this.aiAgentCredentialService.getActiveCredentials(user);

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are supported');
    }

    if (file.size > this.getMaxBytes()) {
      throw new BadRequestException(`PDF exceeds maximum size of ${this.getMaxBytes()} bytes`);
    }

    const job = this.jobStore.create(user.id);
    setImmediate(() => {
      void this.runPdfJob(user, job.id, file.buffer, llmConfig.modelId, llmConfig.apiKey);
    });

    return { jobId: job.id };
  }

  async startMarkdownImport(user: AuthenticatedRequest['user'], file: Express.Multer.File) {
    if (!this.isEnabled()) {
      throw new ForbiddenException('Markdown import is disabled');
    }

    const llmConfig = await this.aiAgentCredentialService.getActiveCredentials(user);

    if (!MARKDOWN_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Only Markdown files are supported');
    }

    if (file.size > this.getMarkdownMaxBytes()) {
      throw new BadRequestException(
        `Markdown file exceeds maximum size of ${this.getMarkdownMaxBytes()} bytes`,
      );
    }

    const sourceText = file.buffer.toString('utf8').trim();
    if (!sourceText) {
      throw new BadRequestException('Markdown file is empty');
    }

    const job = this.jobStore.create(user.id);
    setImmediate(() => {
      void this.runTextJob(user, job.id, sourceText, llmConfig.modelId, llmConfig.apiKey);
    });

    return { jobId: job.id };
  }

  getJob(user: AuthenticatedRequest['user'], jobId: string) {
    const job = this.jobStore.get(jobId, user.id);
    if (!job) {
      throw new NotFoundException('Import job not found');
    }

    return {
      status: job.status,
      progress: job.progress,
      cvId: job.cvId,
      previewData: job.previewData,
      errors: job.errors,
    };
  }

  async importFromUrl(
    user: AuthenticatedRequest['user'],
    rawUrl: string,
  ): Promise<ImportFromUrlResponse> {
    const validated = validateImportUrl(rawUrl);
    const url = resolveImportUrl(validated);

    let fetched: Response;
    try {
      fetched = await fetch(url.toString(), {
        signal: AbortSignal.timeout(10_000),
        headers: {
          Accept: 'application/json, text/plain, text/html;q=0.8',
        },
      });
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error ? `Failed to fetch URL: ${err.message}` : 'Failed to fetch URL',
      );
    }

    if (!fetched.ok) {
      throw new BadRequestException(`URL returned ${fetched.status} ${fetched.statusText}`);
    }

    const contentType = fetched.headers.get('content-type') ?? '';
    const bodyText = await fetched.text();
    const trimmed = bodyText.trim();

    const jsonCandidate =
      contentType.includes('json') ||
      contentType.includes('text/plain') ||
      trimmed.startsWith('{') ||
      trimmed.startsWith('[');

    if (jsonCandidate) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        if (!contentType.includes('html')) {
          throw new BadRequestException('URL returned invalid JSON');
        }
      }

      if (parsed !== undefined) {
        const prepared = this.tryPrepareJsonResume(parsed);
        if (prepared) {
          return { kind: 'json', data: prepared };
        }
      }
    }

    if (!this.isEnabled()) {
      throw new ForbiddenException('Website import is disabled');
    }

    let llmConfig: Awaited<ReturnType<AiAgentCredentialService['getActiveCredentials']>>;
    try {
      llmConfig = await this.aiAgentCredentialService.getActiveCredentials(user);
    } catch {
      throw new BadRequestException(
        'This page is not JSON Resume data. Configure an AI agent account in settings to import HTML or markdown pages.',
      );
    }

    const scrapeConfig = await this.webScrapeService.getDecryptedConfig(user);
    const job = this.jobStore.create(user.id);
    setImmediate(() => {
      void this.runWebsiteJob(user, job.id, validated.toString(), llmConfig, scrapeConfig);
    });

    return { kind: 'job', jobId: job.id };
  }

  private tryPrepareJsonResume(parsed: unknown): Record<string, unknown> | null {
    let prepared: Record<string, unknown>;
    try {
      prepared = prepareImportedResume(parsed);
    } catch (err) {
      if (err instanceof InvalidImportedResumeError) {
        return null;
      }
      throw err;
    }

    try {
      this.schemaValidator.validate(prepared);
    } catch {
      return null;
    }

    return prepared;
  }

  /** Tavily search/extract key from per-user web scrape settings (no server env fallback). */
  private async resolveUserSearchApiKey(
    user: AuthenticatedRequest['user'],
  ): Promise<string | undefined> {
    const scrapeConfig = await this.webScrapeService.getDecryptedConfig(user);
    if (scrapeConfig?.provider === 'tavily') {
      return scrapeConfig.apiKey;
    }
    return undefined;
  }

  private resolveApiKeyEnvVar(modelId: string): string | null {
    for (const provider of this.catalogService.getCatalog().providers) {
      if (provider.models.some((model) => model.id === modelId)) {
        return provider.apiKeyEnvVar;
      }
    }
    return null;
  }

  private async withScopedApiKey<T>(
    modelId: string,
    apiKey: string,
    action: () => Promise<T>,
  ): Promise<T> {
    const envVar = this.resolveApiKeyEnvVar(modelId);
    if (!envVar) {
      return action();
    }

    const previous = process.env[envVar];
    process.env[envVar] = apiKey;
    try {
      return await action();
    } finally {
      if (previous === undefined) {
        delete process.env[envVar];
      } else {
        process.env[envVar] = previous;
      }
    }
  }

  private async runPdfJob(
    user: AuthenticatedRequest['user'],
    jobId: string,
    pdfBuffer: Buffer,
    modelId: string,
    apiKey: string,
  ) {
    this.jobStore.update(jobId, { status: 'running', progress: 'extracting' });

    try {
      const searchApiKey = await this.resolveUserSearchApiKey(user);
      const result = await this.withScopedApiKey(modelId, apiKey, async () => {
        return runPdfImportWorkflow({
          pdfBuffer,
          modelId,
          apiKey,
          searchApiKey,
          onProgress: (progress: ImportJobProgress) => {
            this.jobStore.update(jobId, { progress });
          },
          finalize: async (draft: Record<string, unknown>) => {
            const prepared = prepareImportedResume(draft);
            const created = await this.cvService.create(user, { data: prepared });
            return created.id;
          },
        });
      });

      this.finishJob(jobId, result);
    } catch (error) {
      this.failJob(jobId, error);
    }
  }

  private async runWebsiteJob(
    user: AuthenticatedRequest['user'],
    jobId: string,
    sourceUrl: string,
    llmConfig: { modelId: string; apiKey: string },
    scrapeConfig: { provider: 'firecrawl' | 'tavily'; apiKey: string } | null,
  ) {
    this.jobStore.update(jobId, { status: 'running', progress: 'extracting' });

    const toolsConfig: WebsiteImportToolsConfig = {
      scrapeProvider: scrapeConfig?.provider ?? null,
      scrapeApiKey: scrapeConfig?.apiKey,
      searchApiKey: scrapeConfig?.provider === 'tavily' ? scrapeConfig.apiKey : undefined,
    };

    try {
      const result = await this.withScopedApiKey(llmConfig.modelId, llmConfig.apiKey, async () => {
        return runWebsiteImportWorkflow({
          sourceUrl,
          modelId: llmConfig.modelId,
          apiKey: llmConfig.apiKey,
          toolsConfig,
          onProgress: (progress: ImportJobProgress) => {
            this.jobStore.update(jobId, { progress });
          },
        });
      });

      this.finishWebsitePreviewJob(jobId, result);
    } catch (error) {
      this.failJob(jobId, error);
    }
  }

  private finishWebsitePreviewJob(
    jobId: string,
    result: { draft?: Record<string, unknown>; errors: string[] },
  ) {
    if (result.errors.length > 0 || !result.draft) {
      const errors = result.errors.length
        ? result.errors
        : ['Website import failed before preview'];
      this.jobStore.update(jobId, { status: 'failed', errors });
      return;
    }

    let prepared: Record<string, unknown>;
    try {
      prepared = prepareImportedResume(result.draft);
      this.schemaValidator.validate(prepared);
    } catch (err) {
      const message =
        err instanceof InvalidImportedResumeError
          ? err.message
          : 'Imported page did not produce valid JSON Resume data';
      this.jobStore.update(jobId, { status: 'failed', errors: [message] });
      return;
    }

    this.jobStore.update(jobId, {
      status: 'succeeded',
      previewData: prepared,
      progress: 'finalizing',
    });
  }

  private async runTextJob(
    user: AuthenticatedRequest['user'],
    jobId: string,
    sourceText: string,
    modelId: string,
    apiKey: string,
  ) {
    this.jobStore.update(jobId, { status: 'running', progress: 'drafting' });

    try {
      const searchApiKey = await this.resolveUserSearchApiKey(user);
      const result = await this.withScopedApiKey(modelId, apiKey, async () => {
        return runTextImportWorkflow({
          sourceText,
          modelId,
          apiKey,
          searchApiKey,
          onProgress: (progress: ImportJobProgress) => {
            this.jobStore.update(jobId, { progress });
          },
          finalize: async (draft: Record<string, unknown>) => {
            const prepared = prepareImportedResume(draft);
            const created = await this.cvService.create(user, { data: prepared });
            return created.id;
          },
        });
      });

      this.finishJob(jobId, result);
    } catch (error) {
      this.failJob(jobId, error);
    }
  }

  private finishJob(jobId: string, result: { cvId?: string; errors: string[] }) {
    if (result.errors.length > 0 || !result.cvId) {
      const errors = result.errors.length ? result.errors : ['Import failed before CV creation'];
      this.jobStore.update(jobId, { status: 'failed', errors });
      return;
    }

    this.jobStore.update(jobId, {
      status: 'succeeded',
      cvId: result.cvId,
      progress: 'finalizing',
    });
  }

  private failJob(jobId: string, error: unknown) {
    const message = error instanceof Error ? error.message : 'Import failed';
    const errors = /auth|api key|401|403/i.test(message)
      ? ['Import failed. Update your AI agent settings and verify the API key.']
      : [message];
    this.jobStore.update(jobId, { status: 'failed', errors });
  }
}
