import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createWebProviderPool,
  extractDocxTextTool,
  type ImportJobProgress,
  runImageImportWorkflow,
  runPdfImportWorkflow,
  runTextImportWorkflow,
  runWebsiteImportWorkflow,
  type WebProviderPool,
  withModelRunContext,
} from '@resubuild/import-agent';
import { getModelMaxOutputTokens } from '@resubuild/import-models';
import { InvalidImportedResumeError, prepareImportedResume } from '@resubuild/types';
import {
  type ActiveAiAgentCredentials,
  AiAgentCredentialService,
} from '../ai-agent/ai-agent-credential.service';
import type { AuthenticatedRequest } from '../auth/session-auth.guard';
import { ImportModelsCatalogService } from '../import-models-catalog/import-models-catalog.service';
import { ResumeSchemaValidator } from '../validation/resume-schema.validator';
import { ImportJobStore } from './import-job.store';
import { resolveImportUrl, validateImportUrl } from './import-url.util';

export type ImportFromUrlResponse =
  | { kind: 'json'; data: Record<string, unknown> }
  | { kind: 'job'; jobId: string };

export const PDF_IMPORT_MAX_BYTES_DEFAULT = 5 * 1024 * 1024;
export const MARKDOWN_IMPORT_MAX_BYTES_DEFAULT = 512 * 1024;
export const IMAGE_IMPORT_MAX_BYTES_DEFAULT = 5 * 1024 * 1024;
export const DOCX_IMPORT_MAX_BYTES_DEFAULT = 5 * 1024 * 1024;

const MARKDOWN_MIME_TYPES = new Set(['text/markdown', 'text/plain', 'text/x-markdown']);
export const IMAGE_IMPORT_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
export const DOCX_IMPORT_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

@Injectable()
export class ImportService {
  private readonly jobStore = new ImportJobStore();
  private readonly logger = new Logger(ImportService.name);
  /**
   * Deployment-wide web search / page extraction providers, shared by every
   * user. One instance per process so the round-robin rotation and the
   * out-of-credit cooldowns span all jobs.
   */
  private readonly webProviders: WebProviderPool;
  private readonly firecrawlApiKey: string | undefined;

  constructor(
    private readonly configService: ConfigService,
    private readonly aiAgentCredentialService: AiAgentCredentialService,
    private readonly catalogService: ImportModelsCatalogService,
    private readonly schemaValidator: ResumeSchemaValidator,
  ) {
    const key = (name: string) => this.configService.get<string>(name)?.trim() || undefined;
    this.firecrawlApiKey = key('FIRECRAWL_API_KEY');
    this.webProviders = createWebProviderPool(
      {
        tavily: key('TAVILY_API_KEY'),
        firecrawl: this.firecrawlApiKey,
        brave: key('BRAVE_SEARCH_API_KEY'),
      },
      {
        logger: {
          log: (message) => this.logger.debug(message),
          warn: (message) => this.logger.warn(message),
        },
      },
    );
  }

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

  getImageMaxBytes(): number {
    return Number(
      this.configService.get<string>('IMAGE_IMPORT_MAX_BYTES') ?? IMAGE_IMPORT_MAX_BYTES_DEFAULT,
    );
  }

  getDocxMaxBytes(): number {
    return Number(
      this.configService.get<string>('DOCX_IMPORT_MAX_BYTES') ?? DOCX_IMPORT_MAX_BYTES_DEFAULT,
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
      void this.runPdfJob(job.id, file.buffer, llmConfig);
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
      void this.runTextJob(job.id, sourceText, llmConfig);
    });

    return { jobId: job.id };
  }

  async startImageImport(user: AuthenticatedRequest['user'], file: Express.Multer.File) {
    if (!this.isEnabled()) {
      throw new ForbiddenException('Image import is disabled');
    }

    const llmConfig = await this.aiAgentCredentialService.getActiveCredentials(user);

    if (!IMAGE_IMPORT_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Only PNG, JPEG, and WebP images are supported');
    }

    if (file.size > this.getImageMaxBytes()) {
      throw new BadRequestException(
        `Image exceeds maximum size of ${this.getImageMaxBytes()} bytes`,
      );
    }

    const job = this.jobStore.create(user.id);
    setImmediate(() => {
      void this.runImageJob(job.id, file.buffer, file.mimetype, llmConfig);
    });

    return { jobId: job.id };
  }

  async startDocxImport(user: AuthenticatedRequest['user'], file: Express.Multer.File) {
    if (!this.isEnabled()) {
      throw new ForbiddenException('DOCX import is disabled');
    }

    const llmConfig = await this.aiAgentCredentialService.getActiveCredentials(user);

    if (!this.isDocxFile(file)) {
      throw new BadRequestException('Only DOCX files are supported');
    }

    if (file.size > this.getDocxMaxBytes()) {
      throw new BadRequestException(
        `DOCX file exceeds maximum size of ${this.getDocxMaxBytes()} bytes`,
      );
    }

    let sourceText: string;
    try {
      sourceText = (await extractDocxTextTool(file.buffer)).text;
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Could not extract text from DOCX',
      );
    }

    const job = this.jobStore.create(user.id);
    setImmediate(() => {
      void this.runTextJob(job.id, sourceText, llmConfig);
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
      failedStep: job.failedStep,
      cvId: job.cvId,
      previewData: job.previewData,
      discoveredProfilesCount: job.discoveredProfilesCount,
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

    const job = this.jobStore.create(user.id);
    setImmediate(() => {
      void this.runWebsiteJob(job.id, validated.toString(), llmConfig);
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

  /** Run a workflow with the account's model options (reasoning effort…) applied. */
  private withModelRun<T>(llm: ActiveAiAgentCredentials, action: () => Promise<T>): Promise<T> {
    return withModelRunContext({ providerOptions: llm.providerOptions }, action);
  }

  /** Output-token limit of the selected model, so long CVs are not cut off mid-JSON. */
  private resolveMaxOutputTokens(modelId: string): number | undefined {
    return getModelMaxOutputTokens(this.catalogService.getCatalog(), modelId);
  }

  private async runPdfJob(jobId: string, pdfBuffer: Buffer, llm: ActiveAiAgentCredentials) {
    const { modelId, apiKey } = llm;
    this.jobStore.update(jobId, { status: 'running', progress: 'extracting' });

    try {
      const result = await this.withModelRun(llm, async () => {
        return runPdfImportWorkflow({
          pdfBuffer,
          modelId,
          apiKey,
          firecrawlApiKey: this.firecrawlApiKey,
          webProviders: this.webProviders,
          maxOutputTokens: this.resolveMaxOutputTokens(modelId),
          onProgress: (progress: ImportJobProgress) => {
            this.jobStore.update(jobId, { progress });
          },
        });
      });

      this.finishPreviewJob(jobId, result);
    } catch (error) {
      this.failJob(jobId, error);
    }
  }

  private async runImageJob(
    jobId: string,
    imageBuffer: Buffer,
    imageMimeType: string,
    llm: ActiveAiAgentCredentials,
  ) {
    const { modelId, apiKey } = llm;
    this.jobStore.update(jobId, { status: 'running', progress: 'extracting' });

    try {
      const result = await this.withModelRun(llm, async () => {
        return runImageImportWorkflow({
          imageBuffer,
          imageMimeType,
          modelId,
          apiKey,
          webProviders: this.webProviders,
          maxOutputTokens: this.resolveMaxOutputTokens(modelId),
          onProgress: (progress: ImportJobProgress) => {
            this.jobStore.update(jobId, { progress });
          },
        });
      });

      this.finishPreviewJob(jobId, result);
    } catch (error) {
      this.failJob(jobId, error);
    }
  }

  private async runWebsiteJob(
    jobId: string,
    sourceUrl: string,
    llmConfig: ActiveAiAgentCredentials,
  ) {
    this.jobStore.update(jobId, { status: 'running', progress: 'extracting' });

    try {
      const result = await this.withModelRun(llmConfig, async () => {
        return runWebsiteImportWorkflow({
          sourceUrl,
          modelId: llmConfig.modelId,
          apiKey: llmConfig.apiKey,
          toolsConfig: { webProviders: this.webProviders },
          maxOutputTokens: this.resolveMaxOutputTokens(llmConfig.modelId),
          onProgress: (progress: ImportJobProgress) => {
            this.jobStore.update(jobId, { progress });
          },
        });
      });

      this.finishPreviewJob(jobId, result);
    } catch (error) {
      this.failJob(jobId, error);
    }
  }

  private finishPreviewJob(
    jobId: string,
    result: { draft?: Record<string, unknown>; errors: string[]; discoveredProfilesCount?: number },
  ) {
    if (result.errors.length > 0 || !result.draft) {
      const errors = result.errors.length ? result.errors : ['Import failed before preview'];
      this.jobStore.fail(jobId, errors);
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
      this.jobStore.fail(jobId, [message]);
      return;
    }

    this.jobStore.update(jobId, {
      status: 'succeeded',
      previewData: prepared,
      progress: 'finalizing',
      discoveredProfilesCount: result.discoveredProfilesCount,
    });
  }

  private async runTextJob(jobId: string, sourceText: string, llm: ActiveAiAgentCredentials) {
    const { modelId, apiKey } = llm;
    this.jobStore.update(jobId, { status: 'running', progress: 'drafting' });

    try {
      const result = await this.withModelRun(llm, async () => {
        return runTextImportWorkflow({
          sourceText,
          modelId,
          apiKey,
          webProviders: this.webProviders,
          maxOutputTokens: this.resolveMaxOutputTokens(modelId),
          onProgress: (progress: ImportJobProgress) => {
            this.jobStore.update(jobId, { progress });
          },
        });
      });

      this.finishPreviewJob(jobId, result);
    } catch (error) {
      this.failJob(jobId, error);
    }
  }

  private failJob(jobId: string, error: unknown) {
    const message = error instanceof Error ? error.message : 'Import failed';
    const errors = /auth|api key|401|403/i.test(message)
      ? ['Import failed. Update your AI agent settings and verify the API key.']
      : [message];
    this.jobStore.fail(jobId, errors);
  }

  private isDocxFile(file: Express.Multer.File): boolean {
    if (DOCX_IMPORT_MIME_TYPES.has(file.mimetype)) {
      return true;
    }

    return file.originalname?.toLowerCase().endsWith('.docx') ?? false;
  }
}
