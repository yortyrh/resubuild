import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type ImportJobProgress, runPdfImportWorkflow } from '@resumind/import-agent';
import catalog from '@resumind/import-models/catalog.json';
import { prepareImportedResume } from '@resumind/types';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import { CvService } from '../cv/cv.service';
import { AiAgentCredentialService } from '../ai-agent/ai-agent-credential.service';
import { ImportJobStore } from './import-job.store';

export const PDF_IMPORT_MAX_BYTES_DEFAULT = 5 * 1024 * 1024;

@Injectable()
export class ImportService {
  private readonly jobStore = new ImportJobStore();
  private readonly importCatalog = catalog as {
    providers: Array<{ apiKeyEnvVar: string; models: Array<{ id: string }> }>;
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly aiAgentCredentialService: AiAgentCredentialService,
    private readonly cvService: CvService,
  ) {}

  isEnabled(): boolean {
    return this.configService.get<string>('PDF_IMPORT_ENABLED', 'true') !== 'false';
  }

  getMaxBytes(): number {
    return Number(
      this.configService.get<string>('PDF_IMPORT_MAX_BYTES') ?? PDF_IMPORT_MAX_BYTES_DEFAULT,
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
      void this.runJob(user, job.id, file.buffer, llmConfig.modelId, llmConfig.apiKey);
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

  private resolveApiKeyEnvVar(modelId: string): string | null {
    for (const provider of this.importCatalog.providers) {
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

  private async runJob(
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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed';
      const errors = /auth|api key|401|403/i.test(message)
        ? ['Import failed. Update your AI agent settings and verify the API key.']
        : [message];
      this.jobStore.update(jobId, { status: 'failed', errors });
    }
  }
}
