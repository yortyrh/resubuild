import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { McpExportEnvelope, McpExportRecord, McpExportScreenshotMode } from '@resubuild/types';
import type { AuthUser } from '../auth/auth-user.types';
import { CvService } from '../cv/cv.service';
import { CvExportService } from '../cv-export/cv-export.service';
import { ExportStorageService } from '../export-storage/export-storage.service';

/**
 * Thin orchestrator between `CvExportService` (renders HTML/PDF/PNG/JSON) and
 * `ExportStorageService` (uploads + signed URLs + sweep). Each `publish*` method
 * runs the existing render pipeline, packages the result with a filename and
 * `contentType`, hands the buffer to the storage service, and returns the
 * canonical `McpExportEnvelope` shape that MCP tool handlers send to the client.
 *
 * The envelope's `url` is the **Supabase Storage signed URL** for the artifact
 * — a self-contained URL with a `?token=…` query parameter that authenticates
 * the request at the storage layer. It is openable in a browser tab, usable
 * with `curl <url> -o cv.pdf`, and consumable via `fetch(url)` without any
 * additional API-host auth header. There is no separate API-host download
 * surface; the signed URL is the entire transport.
 */
@Injectable()
export class McpExportService {
  private readonly logger = new Logger(McpExportService.name);

  /** Lower / upper bounds for the optional TTL on `fetch_export_url`. */
  static readonly MIN_TTL_SECONDS = 60;
  static readonly MAX_TTL_SECONDS = 24 * 60 * 60; // 86400

  constructor(
    private readonly cvExportService: CvExportService,
    private readonly cvService: CvService,
    private readonly storage: ExportStorageService,
  ) {}

  async publishHtml(user: AuthUser, cvId: string, template?: string): Promise<McpExportEnvelope> {
    const html = await this.cvExportService.renderHtml(user, cvId, template);
    const record = await this.cvService.findOne(user, cvId);
    const templateId = template
      ? this.cvExportService.resolveTemplateId(record.templateId, template)
      : record.templateId;

    const {
      record: stored,
      signedUrl,
      expiresAt,
    } = await this.storage.uploadAndRegister({
      userId: user.id,
      cvId,
      kind: 'html',
      buffer: Buffer.from(html, 'utf8'),
      contentType: 'text/html; charset=utf-8',
      filename: this.buildFilename(record.title, 'html'),
      templateId,
    });

    return this.toEnvelope(stored, signedUrl, expiresAt);
  }

  async publishPdf(user: AuthUser, cvId: string, template?: string): Promise<McpExportEnvelope> {
    const { buffer, filename } = await this.cvExportService.renderPdf(user, cvId, template);
    const record = await this.cvService.findOne(user, cvId);
    const templateId = template
      ? this.cvExportService.resolveTemplateId(record.templateId, template)
      : record.templateId;

    const {
      record: stored,
      signedUrl,
      expiresAt,
    } = await this.storage.uploadAndRegister({
      userId: user.id,
      cvId,
      kind: 'pdf',
      buffer,
      contentType: 'application/pdf',
      filename,
      templateId,
    });

    return this.toEnvelope(stored, signedUrl, expiresAt);
  }

  async publishScreenshot(
    user: AuthUser,
    cvId: string,
    options: { template?: string; mode?: McpExportScreenshotMode } = {},
  ): Promise<McpExportEnvelope> {
    const mode = options.mode ?? 'first_page';
    const shot = await this.cvExportService.renderScreenshot(user, cvId, {
      template: options.template,
      mode,
    });

    const {
      record: stored,
      signedUrl,
      expiresAt,
    } = await this.storage.uploadAndRegister({
      userId: user.id,
      cvId,
      kind: 'screenshot',
      buffer: shot.buffer,
      contentType: 'image/png',
      filename: shot.filename,
      templateId: shot.templateId,
      mode,
    });

    return { ...this.toEnvelope(stored, signedUrl, expiresAt), mode };
  }

  async publishJsonResume(
    user: AuthUser,
    cvId: string,
  ): Promise<McpExportEnvelope & { document?: unknown }> {
    const { body, filename } = await this.cvExportService.renderJson(user, cvId);
    const record = await this.cvService.findOne(user, cvId);

    const {
      record: stored,
      signedUrl,
      expiresAt,
    } = await this.storage.uploadAndRegister({
      userId: user.id,
      cvId,
      kind: 'jsonresume',
      buffer: Buffer.from(body, 'utf8'),
      contentType: 'application/json; charset=utf-8',
      filename,
      templateId: record.templateId,
    });

    const envelope = this.toEnvelope(stored, signedUrl, expiresAt);
    let document: unknown;
    try {
      document = JSON.parse(body) as unknown;
    } catch (err) {
      this.logger.warn(
        `Failed to parse JSON Resume for inline document field: ${(err as Error).message}`,
      );
    }
    return { ...envelope, document };
  }

  /**
   * Re-issue a signed URL for a prior `exportId`. The signed URL always carries
   * the `?token=…` query parameter; the storage layer bumps `mcp_export.expires_at`
   * to the requested TTL (clamped to [60, 86400]) so the row stays reachable
   * for its new lifetime. Values outside the TTL range throw 400.
   */
  async refreshSignedUrl(
    user: AuthUser,
    exportId: string,
    ttlSeconds?: number,
  ): Promise<McpExportEnvelope> {
    const ttl = this.clampTtl(ttlSeconds);
    const { url, expiresAt, record } = await this.storage.createSignedUrl(exportId, user.id, ttl);
    return this.toEnvelope(record, url, expiresAt);
  }

  private clampTtl(ttlSeconds: number | undefined): number {
    if (ttlSeconds === undefined || ttlSeconds === null) {
      return this.storage.getDefaultTtlSeconds();
    }
    if (!Number.isFinite(ttlSeconds)) {
      throw new BadRequestException('ttlSeconds must be a finite integer');
    }
    if (!Number.isInteger(ttlSeconds)) {
      throw new BadRequestException('ttlSeconds must be an integer');
    }
    if (ttlSeconds < McpExportService.MIN_TTL_SECONDS) {
      throw new BadRequestException(`ttlSeconds must be >= ${McpExportService.MIN_TTL_SECONDS}`);
    }
    if (ttlSeconds > McpExportService.MAX_TTL_SECONDS) {
      throw new BadRequestException(`ttlSeconds must be <= ${McpExportService.MAX_TTL_SECONDS}`);
    }
    return ttlSeconds;
  }

  private toEnvelope(
    record: McpExportRecord,
    signedUrl: string,
    expiresAt: string,
  ): McpExportEnvelope {
    const expiresInSeconds = Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000));
    const base: McpExportEnvelope = {
      exportId: record.id,
      url: signedUrl,
      expiresAt,
      expiresInSeconds,
      filename: record.filename,
      contentType: record.contentType,
      sizeBytes: record.sizeBytes,
      kind: record.kind,
      templateId: record.templateId,
    };
    if (record.mode) {
      base.mode = record.mode;
    }
    return base;
  }

  private buildFilename(title: string, ext: string): string {
    const base = title?.trim() ? `${this.slugify(title)}.${ext}` : `export.${ext}`;
    return base;
  }

  private slugify(input: string): string {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  static notFound(): NotFoundException {
    return new NotFoundException('Export not found');
  }
}
