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
} from '@resumind/import-agent';
import { InvalidImportedResumeError, prepareImportedResume } from '@resumind/types';
import { AiAgentCredentialService } from '../ai-agent/ai-agent-credential.service';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import { CvService } from '../cv/cv.service';
import { ImportModelsCatalogService } from '../import-models-catalog/import-models-catalog.service';
import { ResumeSchemaValidator } from '../validation/resume-schema.validator';
import { ImportJobStore } from './import-job.store';
import { resolveImportUrl, validateImportUrl } from './import-url.util';

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
      errors: job.errors,
    };
  }

  async importFromUrl(user: AuthenticatedRequest['user'], rawUrl: string) {
    const url = resolveImportUrl(validateImportUrl(rawUrl));

    let fetched: Response;
    try {
      fetched = await fetch(url.toString(), {
        signal: AbortSignal.timeout(10_000),
        headers: { Accept: 'application/json, text/plain' },
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
    if (!contentType.includes('json') && !contentType.includes('text/plain')) {
      throw new BadRequestException(
        `URL did not return JSON (Content-Type: ${contentType || 'none'}). Only JSON endpoints are supported.`,
      );
    }

    let parsed: unknown;
    try {
      parsed = await fetched.json();
    } catch {
      throw new BadRequestException('URL returned invalid JSON');
    }

    let prepared: Record<string, unknown>;
    try {
      prepared = prepareImportedResume(parsed);
    } catch (err) {
      if (err instanceof InvalidImportedResumeError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    try {
      this.schemaValidator.validate(prepared);
    } catch {
      throw new BadRequestException('URL returned data is not a valid JSON Resume');
    }

    return { data: prepared };
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
      const result = await this.withScopedApiKey(modelId, apiKey, async () => {
        return runPdfImportWorkflow({
          pdfBuffer,
          modelId,
          apiKey,
          searchApiKey: this.configService.get<string>('SEARCH_API_KEY'),
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

  private async runTextJob(
    user: AuthenticatedRequest['user'],
    jobId: string,
    sourceText: string,
    modelId: string,
    apiKey: string,
  ) {
    this.jobStore.update(jobId, { status: 'running', progress: 'drafting' });

    try {
      const result = await this.withScopedApiKey(modelId, apiKey, async () => {
        return runTextImportWorkflow({
          sourceText,
          modelId,
          apiKey,
          searchApiKey: this.configService.get<string>('SEARCH_API_KEY'),
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
