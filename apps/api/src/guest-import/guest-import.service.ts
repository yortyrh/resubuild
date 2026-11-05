import { createHash, randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ActiveAiAgentCredentials } from '../ai-agent/ai-agent-credential.service';
import { HostedModelsService } from '../ai-hosted/hosted-models.service';
import { type ImportOwner, ImportService } from '../import/import.service';
import { GuestImportConfig } from './guest-import.config';
import { GuestRateLimiter } from './guest-rate-limiter';
import { TurnstileService } from './turnstile.service';

export const GUEST_IMPORT_UNAVAILABLE = 'GUEST_IMPORT_UNAVAILABLE';
export const GUEST_IMPORT_RATE_LIMITED = 'GUEST_IMPORT_RATE_LIMITED';

export interface GuestImportStatus {
  /** The wizard can take an import right now (switched on and guest budget left). */
  enabled: boolean;
  /** Cloudflare Turnstile site key when the challenge is required. */
  turnstileSiteKey?: string;
}

export interface GuestRequestContext {
  ip: string;
  turnstileToken?: string;
}

const PDF = 'application/pdf';
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const IMAGES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MARKDOWN = new Set(['text/markdown', 'text/plain', 'text/x-markdown']);

/**
 * Anonymous CV import for the sign-up wizard: runs the regular import
 * pipeline on the app-funded guest models, behind Turnstile and a per-IP daily
 * limit. The job belongs to a random guest token only the caller knows; the
 * result is a JSON Resume preview the web app saves after the user signs up.
 * When every guest model used its monthly budget the wizard switches off.
 */
@Injectable()
export class GuestImportService {
  private readonly limiter: GuestRateLimiter;

  constructor(
    private readonly config: GuestImportConfig,
    private readonly hostedModels: HostedModelsService,
    private readonly importService: ImportService,
    private readonly turnstile: TurnstileService,
  ) {
    this.limiter = new GuestRateLimiter(config.importsPerIpPerDay);
  }

  async getStatus(): Promise<GuestImportStatus> {
    const enabled = await this.isAvailable();
    return {
      enabled,
      ...(enabled && this.config.turnstileSiteKey
        ? { turnstileSiteKey: this.config.turnstileSiteKey }
        : {}),
    };
  }

  async startFileImport(file: Express.Multer.File, context: GuestRequestContext) {
    await this.admit(context);
    const { owner, guestToken } = this.newOwner();
    const start = this.fileStarter(file.mimetype, file.originalname);
    const { jobId } = await start(owner, file);
    this.limiter.consume(context.ip);
    return { jobId, guestToken };
  }

  async startUrlImport(url: string, context: GuestRequestContext) {
    await this.admit(context);
    const { owner, guestToken } = this.newOwner();
    const result = await this.importService.importFromUrlAs(owner, url);
    if (result.kind === 'json') {
      // Plain JSON Resume: no AI used, nothing to count.
      return result;
    }
    this.limiter.consume(context.ip);
    return { ...result, guestToken };
  }

  getJob(jobId: string, guestToken: string | undefined) {
    if (!guestToken?.trim()) {
      throw new NotFoundException('Import job not found');
    }
    return this.importService.getJobFor(ownerIdFor(guestToken.trim()), jobId);
  }

  private async isAvailable(): Promise<boolean> {
    return this.config.enabled && (await this.hostedModels.guestHasCapacity());
  }

  private async admit(context: GuestRequestContext): Promise<void> {
    if (!(await this.isAvailable())) {
      throw new ServiceUnavailableException({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        code: GUEST_IMPORT_UNAVAILABLE,
        message: 'Free import is not available right now. Create an account to import your CV.',
      });
    }
    if (!this.limiter.allows(context.ip)) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          code: GUEST_IMPORT_RATE_LIMITED,
          message:
            'You reached the number of free imports for today. Create an account to continue.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (!(await this.turnstile.verify(context.turnstileToken, context.ip))) {
      throw new ForbiddenException('Please complete the verification challenge and try again.');
    }
  }

  private newOwner(): { owner: ImportOwner; guestToken: string } {
    const guestToken = randomBytes(32).toString('base64url');
    return {
      guestToken,
      owner: {
        id: ownerIdFor(guestToken),
        resolveCredentials: async (): Promise<ActiveAiAgentCredentials> => {
          const hosted = await this.hostedModels.acquireGuest();
          return {
            source: 'included',
            modelId: hosted.modelId,
            apiKey: hosted.apiKey,
            providerOptions: hosted.providerOptions,
            usageMeter: hosted.usageMeter,
            onRunError: hosted.onRunError,
          };
        },
      },
    };
  }

  private fileStarter(
    mimetype: string,
    filename: string,
  ): (owner: ImportOwner, file: Express.Multer.File) => Promise<{ jobId: string }> {
    if (mimetype === PDF) return (owner, file) => this.importService.startPdfImportAs(owner, file);
    if (mimetype === DOCX || filename.toLowerCase().endsWith('.docx')) {
      return (owner, file) => this.importService.startDocxImportAs(owner, file);
    }
    if (IMAGES.has(mimetype)) {
      return (owner, file) => this.importService.startImageImportAs(owner, file);
    }
    if (MARKDOWN.has(mimetype)) {
      return (owner, file) => this.importService.startMarkdownImportAs(owner, file);
    }
    throw new BadRequestException('Upload a PDF, Word (.docx), Markdown or image file');
  }
}

/** Job owner key for a guest token (the token itself is never stored). */
export function ownerIdFor(guestToken: string): string {
  return `guest:${createHash('sha256').update(guestToken).digest('hex')}`;
}
