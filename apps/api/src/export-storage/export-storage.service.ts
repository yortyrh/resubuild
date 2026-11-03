import { Buffer as NodeBuffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { and, type Database, eq, lt, mcpExport } from '@resubuild/db';
import type {
  McpExportKind,
  McpExportRecord,
  McpExportScreenshotMode,
  McpExportUploadInput,
} from '@resubuild/types';
import { DATABASE } from '../database/database.tokens';
import { ObjectStorageService } from '../storage/object-storage.service';

/**
 * Single source of truth for object-storage I/O on the dedicated `mcp-exports`
 * bucket. The four `export_cv_*` MCP tools (and the `fetch_export_url` refresh
 * tool) funnel their upload / signed-URL operations through this service so the
 * lifecycle (namespaced object paths, owner-scoped row inserts, expiry sweep) is
 * enforced in one place. The presigned URL is the entire transport — there is no
 * API-host download endpoint; clients paste the URL into a browser, `curl`, or
 * `fetch` and the S3-compatible storage host serves the artifact directly.
 */
@Injectable()
export class ExportStorageService {
  private readonly logger = new Logger(ExportStorageService.name);
  private readonly maxBytes: number;
  private readonly defaultTtlSeconds: number;
  constructor(
    private readonly configService: ConfigService,
    @Inject(DATABASE) private readonly db: Database,
    private readonly storage: ObjectStorageService,
  ) {
    this.maxBytes = this.readPositiveInt('MCP_EXPORT_MAX_BYTES', 10 * 1024 * 1024);
    this.defaultTtlSeconds = this.readPositiveInt('MCP_EXPORT_TTL_SECONDS', 3600);
  }

  private readPositiveInt(envName: string, fallback: number): number {
    const raw = this.configService.get<string>(envName);
    if (raw === undefined || raw === null || raw === '') {
      return fallback;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  /**
   * Returns the bucket name. Throws 503 if `MCP_EXPORT_BUCKET` is unset so callers
   * fail fast rather than silently producing no URL.
   */
  private getBucket(): string {
    const bucket = this.configService.get<string>('MCP_EXPORT_BUCKET');
    if (!bucket) {
      throw new ServiceUnavailableException(
        'MCP export storage is not configured. Set MCP_EXPORT_BUCKET.',
      );
    }
    if (!this.storage.isConfigured()) {
      throw new ServiceUnavailableException(
        'Object storage is not configured. Set the S3_* storage settings.',
      );
    }
    return bucket;
  }

  /**
   * Max bytes the service will accept on upload. Mirrors the legacy base64 cap so
   * the new transport doesn't widen what the MCP protocol can carry.
   */
  getMaxBytes(): number {
    return this.maxBytes;
  }

  /**
   * Default signed-URL TTL in seconds.
   */
  getDefaultTtlSeconds(): number {
    return this.defaultTtlSeconds;
  }

  /**
   * Build the namespaced object path for a new export.
   * `kind` and `ext` are validated by the caller before this is invoked.
   */
  private buildObjectPath(input: {
    userId: string;
    cvId: string;
    kind: McpExportKind;
    exportId: string;
    ext: string;
  }): string {
    return `${input.userId}/${input.cvId}/${input.kind}/${input.exportId}.${input.ext}`;
  }

  /**
   * Map a `McpExportKind` to its file extension. Centralized so the bucket
   * layout and the `Content-Type` choice share a single source of truth.
   */
  private extForKind(kind: McpExportKind): string {
    switch (kind) {
      case 'html':
        return 'html';
      case 'pdf':
        return 'pdf';
      case 'screenshot':
        return 'png';
      case 'jsonresume':
        return 'json';
      default: {
        const exhaustive: never = kind;
        throw new Error(`Unknown export kind: ${exhaustive as string}`);
      }
    }
  }

  /**
   * Reduce a Content-Type value to its bare type/subtype, dropping any
   * parameters (e.g. `; charset=utf-8`, `; boundary=…`). Used for the
   * stored object's `Content-Type`, so presigned downloads carry a plain
   * media type. The full descriptive value is preserved on the `mcp_export`
   * row and the response envelope.
   */
  private stripMimeParameters(contentType: string): string {
    const semicolonIndex = contentType.indexOf(';');
    if (semicolonIndex === -1) {
      return contentType.trim();
    }
    return contentType.slice(0, semicolonIndex).trim();
  }

  /**
   * Upload a rendered artifact to Storage, register a matching `mcp_export` row,
   * and issue a short-lived presigned URL for the new object in a single call.
   * The presigned URL is the canonical handoff for MCP clients — it points at
   * the storage host (`S3_PUBLIC_ENDPOINT`) with `X-Amz-*` query parameters and
   * is openable in a browser, `curl`-able, and `fetch`-able directly.
   *
   * Flow: storage upload first, then DB insert, then signed-URL issuance. On
   * any failure after the upload, the uploaded object is removed best-effort so
   * we don't leak orphan storage objects (mirrors the `MediaService.uploadBuffer`
   * pattern). The signed-URL issuance reuses the same `defaultTtlSeconds` and
   * updates the row's `expires_at` so the row and the URL share one lifetime.
   */
  async uploadAndRegister(
    input: McpExportUploadInput,
  ): Promise<{ record: McpExportRecord; signedUrl: string; expiresAt: string }> {
    if (!input.userId?.trim()) {
      throw new ServiceUnavailableException('Missing user id for MCP export upload');
    }
    if (!input.buffer?.length) {
      throw new PayloadTooLargeException('Empty export payload');
    }
    if (input.buffer.length > this.maxBytes) {
      throw new PayloadTooLargeException(
        `Export exceeds the ${Math.floor(this.maxBytes / (1024 * 1024))} MiB limit. Reduce content or hide sections via template presentation.`,
      );
    }

    const bucket = this.getBucket();
    const exportId = randomUUID();
    const ext = this.extForKind(input.kind);
    const storagePath = this.buildObjectPath({
      userId: input.userId,
      cvId: input.cvId,
      kind: input.kind,
      exportId,
      ext,
    });
    const ttlSeconds = this.defaultTtlSeconds;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const uploadContentType = this.stripMimeParameters(input.contentType);

    try {
      await this.storage.put(bucket, storagePath, NodeBuffer.from(input.buffer), uploadContentType);
    } catch (error) {
      const message = (error as Error).message;
      this.logger.error(`MCP export upload failed: ${message}`);
      throw new ServiceUnavailableException(message);
    }

    let inserted: typeof mcpExport.$inferSelect | undefined;
    try {
      [inserted] = await this.db
        .insert(mcpExport)
        .values({
          id: exportId,
          user_id: input.userId,
          cv_id: input.cvId,
          kind: input.kind,
          storage_path: storagePath,
          content_type: input.contentType,
          size_bytes: input.buffer.length,
          filename: input.filename,
          template_id: input.templateId ?? null,
          mode: input.mode ?? null,
          expires_at: expiresAt.toISOString(),
        })
        .returning();
    } catch (error) {
      this.logger.error(`MCP export row insert failed: ${(error as Error).message}`);
    }

    if (!inserted) {
      await this.storage
        .remove(bucket, [storagePath])
        .catch((err) =>
          this.logger.warn(
            `Rolling back orphaned MCP export object failed: ${(err as Error).message}`,
          ),
        );
      throw new ServiceUnavailableException('Failed to register MCP export row');
    }

    const record = this.toRecord(inserted as unknown as Record<string, unknown>);

    let signedUrl: string;
    try {
      signedUrl = await this.storage.presignGet(bucket, storagePath, ttlSeconds);
    } catch (error) {
      const message = (error as Error).message;
      this.logger.error(`MCP export signed URL failed (post-insert): ${message}`);
      // The object and the row are now both live; surface 503 so the caller can retry.
      throw new ServiceUnavailableException(message);
    }

    return { record, signedUrl, expiresAt: expiresAt.toISOString() };
  }

  /**
   * Issue a signed URL for a row and update `expires_at` so re-issued URLs extend
   * the row's lifetime by the same window.
   */
  async createSignedUrl(
    exportId: string,
    userId: string,
    ttlSeconds: number,
  ): Promise<{ url: string; expiresAt: string; record: McpExportRecord }> {
    if (!exportId?.trim() || !userId?.trim()) {
      throw new NotFoundException('Export not found');
    }

    const rows = await this.db
      .select()
      .from(mcpExport)
      .where(and(eq(mcpExport.id, exportId), eq(mcpExport.user_id, userId)))
      .limit(1);
    const row = rows[0];
    if (!row) {
      throw new NotFoundException('Export not found');
    }

    if (this.isExpired(row.expires_at)) {
      throw new NotFoundException('Export not found');
    }

    const bucket = this.getBucket();
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    let url: string;
    try {
      url = await this.storage.presignGet(bucket, row.storage_path, ttlSeconds);
    } catch (error) {
      const message = (error as Error).message;
      this.logger.error(`MCP export signed URL failed: ${message}`);
      throw new ServiceUnavailableException(message);
    }

    try {
      await this.db
        .update(mcpExport)
        .set({ expires_at: expiresAt.toISOString() })
        .where(and(eq(mcpExport.id, exportId), eq(mcpExport.user_id, userId)));
    } catch (error) {
      this.logger.warn(
        `MCP export expires_at update failed: ${(error as Error).message} (URL is still valid for its TTL)`,
      );
    }

    const record = this.toRecord({
      ...(row as unknown as Record<string, unknown>),
      expires_at: expiresAt.toISOString(),
    });
    return { url, expiresAt: expiresAt.toISOString(), record };
  }

  /**
   * Cron entry point. Scheduled every 5 minutes; both arguments are optional so
   * tests can invoke it directly with a fixed clock.
   */
  @Cron('*/5 * * * *')
  async sweepExpired(
    now: Date = new Date(),
  ): Promise<{ rowsDeleted: number; objectsDeleted: number }> {
    return this.runSweep(now);
  }

  /**
   * Delete rows past `expires_at` and best-effort remove their storage objects.
   * Idempotent: a second invocation against an empty set is a no-op.
   */
  async runSweep(now: Date = new Date()): Promise<{ rowsDeleted: number; objectsDeleted: number }> {
    const bucket = this.getBucket();
    const cutoff = now.toISOString();

    const rows = await this.db
      .select({ id: mcpExport.id, storage_path: mcpExport.storage_path })
      .from(mcpExport)
      .where(lt(mcpExport.expires_at, cutoff));

    if (rows.length === 0) {
      return { rowsDeleted: 0, objectsDeleted: 0 };
    }

    let objectsDeleted = 0;
    try {
      objectsDeleted = await this.storage.remove(
        bucket,
        rows.map((r) => r.storage_path),
      );
    } catch (err) {
      this.logger.warn(`MCP export sweep threw during storage remove: ${(err as Error).message}`);
    }

    const deleted = await this.db
      .delete(mcpExport)
      .where(lt(mcpExport.expires_at, cutoff))
      .returning({ id: mcpExport.id });

    return { rowsDeleted: deleted.length, objectsDeleted };
  }

  private isExpired(expiresAt: string | null | undefined): boolean {
    if (!expiresAt) {
      return true;
    }
    const ts = Date.parse(expiresAt);
    if (!Number.isFinite(ts)) {
      return true;
    }
    return ts <= Date.now();
  }

  private toRecord(row: Record<string, unknown>): McpExportRecord {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      cvId: row.cv_id as string,
      kind: row.kind as McpExportKind,
      storagePath: row.storage_path as string,
      contentType: row.content_type as string,
      sizeBytes: Number(row.size_bytes ?? 0),
      filename: row.filename as string,
      templateId: (row.template_id as string | null) ?? null,
      mode: (row.mode as McpExportScreenshotMode | null) ?? null,
      createdAt: (row.created_at as string) ?? new Date().toISOString(),
      expiresAt: (row.expires_at as string) ?? new Date().toISOString(),
    };
  }
}
