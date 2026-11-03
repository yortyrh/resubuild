import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Database, desc, eq, media } from '@resubuild/db';
import sharp from 'sharp';
import { DATABASE } from '../database/database.tokens';
import { ObjectStorageService } from '../storage/object-storage.service';
import { buildGravatarImageUrl } from './gravatar.util';
import type { CropRect, MediaMetaDto } from './media-crop.dto';
import { fetchRemoteImage } from './media-remote-fetch.util';
import { buildThumbnailBuffer, thumbnailStoragePathFor } from './media-thumbnail.util';
import {
  RESUME_UPLOAD_MAX_BYTES_DEFAULT,
  RESUME_UPLOAD_MIME_EXTENSIONS,
} from './media-upload.types';

export interface UploadMediaResultDto {
  id: string;
  /** Absolute URL backed by GET /media/:id (opaque id; usable in Markdown & basics.image). */
  url: string;
  contentType: string;
}

type MediaRow = typeof media.$inferSelect;

@Injectable()
export class MediaService implements OnModuleInit {
  private readonly logger = new Logger(MediaService.name);
  private readonly maxBytes: number;

  constructor(
    private readonly configService: ConfigService,
    @Inject(DATABASE) private readonly db: Database,
    private readonly storage: ObjectStorageService,
  ) {
    this.maxBytes =
      Number(process.env.MEDIA_MAX_BYTES ?? RESUME_UPLOAD_MAX_BYTES_DEFAULT) ||
      RESUME_UPLOAD_MAX_BYTES_DEFAULT;
  }

  onModuleInit(): void {
    const bucket = this.configService.get<string>('MEDIA_BUCKET');
    if (this.storage.isConfigured() && bucket) {
      return;
    }

    const hint =
      'Set S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY (and S3_ENDPOINT) and MEDIA_BUCKET to enable uploads.';
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`[MediaService] uploads are required in production: ${hint}`);
    }
    this.logger.warn(`Media uploads disabled (dev): ${hint}`);
  }

  private bucket(): string {
    const bucket = this.configService.get<string>('MEDIA_BUCKET');
    if (!bucket) {
      throw new ServiceUnavailableException('MEDIA_BUCKET is not set');
    }
    if (!this.storage.isConfigured()) {
      throw new ServiceUnavailableException(
        'File uploads are not configured. Set MEDIA_BUCKET and the S3_* storage settings.',
      );
    }
    return bucket;
  }

  private async findRow(mediaId: string): Promise<MediaRow | null> {
    const rows = await this.db.select().from(media).where(eq(media.id, mediaId)).limit(1);
    return rows[0] ?? null;
  }

  private async findOwnedRow(userId: string, mediaId: string): Promise<MediaRow> {
    const row = await this.findRow(mediaId);
    if (!row) {
      throw new NotFoundException('Media not found');
    }
    if (row.user_id !== userId) {
      throw new ForbiddenException('Not the owner of this media');
    }
    return row;
  }

  private async removeQuietly(bucket: string, keys: string[], context: string): Promise<void> {
    try {
      await this.storage.remove(bucket, keys);
    } catch (err) {
      this.logger.warn(`${context}: ${(err as Error).message}`);
    }
  }

  /** Public base for absolute media viewer URLs returned to clients (Markdown <img src>, etc.). */
  viewerBaseUrl(): string {
    const explicit = this.configService.get<string>('PUBLIC_API_URL')?.trim();
    if (explicit) {
      return explicit.replace(/\/$/, '');
    }
    const port = this.configService.get<string>('PORT') ?? process.env.PORT ?? '3001';
    return `http://localhost:${port}`;
  }

  public viewerUrlForId(mediaId: string): string {
    return `${this.viewerBaseUrl()}/media/${mediaId}`;
  }

  /**
   * Upload file to object storage, insert `media` row, return API-only viewer URL (no direct storage URL).
   */
  async uploadObject(userId: string, file: Express.Multer.File): Promise<UploadMediaResultDto> {
    if (!file.buffer?.length) {
      throw new BadRequestException('Empty upload');
    }
    if (file.size > this.maxBytes) {
      throw new BadRequestException(`File exceeds max size (${this.maxBytes} bytes)`);
    }

    return this.uploadBuffer(userId, file.buffer, file.mimetype);
  }

  async uploadBuffer(
    userId: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<UploadMediaResultDto> {
    if (!userId?.trim()) {
      throw new BadRequestException('User id missing');
    }
    const ext = RESUME_UPLOAD_MIME_EXTENSIONS[contentType];
    if (!ext) {
      throw new BadRequestException(
        `Unsupported file type (${contentType}). Allowed: ${Object.keys(
          RESUME_UPLOAD_MIME_EXTENSIONS,
        ).join(', ')}`,
      );
    }
    if (!buffer.length) {
      throw new BadRequestException('Empty upload');
    }
    if (buffer.length > this.maxBytes) {
      throw new BadRequestException(`File exceeds max size (${this.maxBytes} bytes)`);
    }

    const bucket = this.bucket();
    const mediaId = randomUUID();
    const objectPath = `${userId}/${mediaId}.${ext}`;

    try {
      await this.storage.put(bucket, objectPath, buffer, contentType);
    } catch (error) {
      const message = (error as Error).message;
      this.logger.error(`Storage upload failed: ${message}`);
      throw new BadRequestException(message);
    }

    try {
      await this.db.insert(media).values({
        id: mediaId,
        user_id: userId,
        storage_path: objectPath,
        content_type: contentType,
        size_bytes: buffer.length,
      });
    } catch (dbError) {
      this.logger.error(`Media registry insert failed: ${(dbError as Error).message}`);
      await this.removeQuietly(bucket, [objectPath], 'Rolling back orphaned object failed');
      throw dbError;
    }

    try {
      await this.ensureThumbnail(mediaId);
    } catch (thumbnailError) {
      await this.removeQuietly(
        bucket,
        [objectPath, thumbnailStoragePathFor(userId, mediaId)],
        'Rolling back object after thumbnail failed',
      );
      await this.db
        .delete(media)
        .where(eq(media.id, mediaId))
        .catch((err: unknown) =>
          this.logger.warn(
            `Rolling back media row after thumbnail failed: ${(err as Error).message}`,
          ),
        );
      throw thumbnailError;
    }

    return {
      id: mediaId,
      url: this.viewerUrlForId(mediaId),
      contentType,
    };
  }

  /** Whether the URL can be fetched for import (host checks + image validation; no upload). */
  async canImportImageFromUrl(url: string): Promise<boolean> {
    const remote = await fetchRemoteImage(url, { maxBytes: this.maxBytes });
    return remote !== null;
  }

  /**
   * Fetches a remote profile image when it exists and stores it as owned media.
   * Returns null when the URL is unreachable or not a supported image (caller may omit basics.image).
   */
  async importFromUrl(userId: string, url: string): Promise<UploadMediaResultDto | null> {
    const remote = await fetchRemoteImage(url, { maxBytes: this.maxBytes });
    if (!remote) {
      return null;
    }
    return this.uploadBuffer(userId, remote.buffer, remote.contentType);
  }

  /** Imports a Gravatar when one exists for the email (`d=404` probe). */
  async importFromGravatarEmail(
    userId: string,
    email: string,
  ): Promise<UploadMediaResultDto | null> {
    const gravatarUrl = buildGravatarImageUrl(email);
    if (!gravatarUrl) {
      return null;
    }
    return this.importFromUrl(userId, gravatarUrl);
  }

  private contentTypeOf(row: Pick<MediaRow, 'content_type'>): string {
    return typeof row.content_type === 'string' && row.content_type.trim()
      ? row.content_type
      : 'application/octet-stream';
  }

  /**
   * Display bytes for GET /media/:id — cropped derivative when present, else the original upload.
   * Never reads or writes `storage_path` except via {@link loadOriginalPayload}.
   */
  async loadMediaPayload(mediaId: string): Promise<{ buffer: Buffer; contentType: string }> {
    const bucket = this.bucket();
    const row = await this.findRow(mediaId);
    if (!row?.storage_path) {
      throw new NotFoundException('Media not found');
    }

    const servePath = row.cropped_storage_path || row.storage_path;
    const buffer = await this.storage.get(bucket, servePath);
    if (!buffer) {
      this.logger.error('Storage returned no object for stored media reference');
      throw new NotFoundException('Media file unavailable');
    }

    return { buffer, contentType: this.contentTypeOf(row) };
  }

  /** Original upload bytes for GET /media/:id/original (crop editor source of truth). */
  async loadOriginalPayload(mediaId: string): Promise<{ buffer: Buffer; contentType: string }> {
    const bucket = this.bucket();
    const row = await this.findRow(mediaId);
    if (!row?.storage_path) {
      throw new NotFoundException('Media not found');
    }

    const buffer = await this.storage.get(bucket, row.storage_path);
    if (!buffer) {
      throw new NotFoundException('Media file unavailable');
    }

    return { buffer, contentType: this.contentTypeOf(row) };
  }

  /**
   * Apply a crop rectangle to an existing media upload. Generates a cropped derivative
   * using sharp, uploads it to storage, and updates the media row.
   */
  async cropMedia(userId: string, mediaId: string, crop: CropRect): Promise<UploadMediaResultDto> {
    const bucket = this.bucket();
    const row = await this.findOwnedRow(userId, mediaId);

    const originalBuffer = await this.storage.get(bucket, row.storage_path);
    if (!originalBuffer) {
      throw new NotFoundException('Media file unavailable');
    }

    const croppedBuffer = await sharp(originalBuffer)
      .extract({ left: crop.x, top: crop.y, width: crop.width, height: crop.height })
      .webp({ quality: 90 })
      .toBuffer();

    const croppedPath = row.storage_path.replace(/\.[^.]+$/, '_cropped.webp');

    if (row.cropped_storage_path && row.cropped_storage_path !== croppedPath) {
      await this.removeQuietly(bucket, [row.cropped_storage_path], 'Old crop cleanup failed');
    }

    try {
      await this.storage.put(bucket, croppedPath, croppedBuffer, 'image/webp');
    } catch (error) {
      const message = (error as Error).message;
      this.logger.error(`Cropped upload failed: ${message}`);
      throw new BadRequestException(message);
    }

    await this.db
      .update(media)
      .set({
        crop: { x: crop.x, y: crop.y, width: crop.width, height: crop.height },
        cropped_storage_path: croppedPath,
      })
      .where(eq(media.id, mediaId));

    await this.ensureThumbnail(mediaId);

    return {
      id: mediaId,
      url: this.viewerUrlForId(mediaId),
      contentType: 'image/webp',
    };
  }

  /**
   * Generate or refresh ≤150×150 WebP preview in `thumbnail_storage_path` only.
   * Does not modify `storage_path` (original) or `cropped_storage_path`.
   */
  async ensureThumbnail(mediaId: string): Promise<void> {
    const bucket = this.bucket();
    const row = await this.findRow(mediaId);
    if (!row?.storage_path || !row.user_id) {
      throw new NotFoundException('Media not found');
    }

    const servePath = row.cropped_storage_path || row.storage_path;
    const sourceBuffer = await this.storage.get(bucket, servePath);
    if (!sourceBuffer) {
      throw new NotFoundException('Media file unavailable');
    }

    const thumbBuffer = await buildThumbnailBuffer(sourceBuffer);
    const thumbPath = thumbnailStoragePathFor(row.user_id, mediaId);

    if (row.thumbnail_storage_path && row.thumbnail_storage_path !== thumbPath) {
      await this.removeQuietly(
        bucket,
        [row.thumbnail_storage_path],
        'Old thumbnail cleanup failed',
      );
    }

    try {
      await this.storage.put(bucket, thumbPath, thumbBuffer, 'image/webp');
    } catch (error) {
      const message = (error as Error).message;
      this.logger.error(`Thumbnail upload failed: ${message}`);
      throw new BadRequestException(message);
    }

    await this.db
      .update(media)
      .set({ thumbnail_storage_path: thumbPath })
      .where(eq(media.id, mediaId));
  }

  /** Loads thumbnail bytes for GET /media/:id/thumbnail. */
  async loadThumbnailPayload(mediaId: string): Promise<{ buffer: Buffer; contentType: string }> {
    const bucket = this.bucket();
    const row = await this.findRow(mediaId);
    if (!row?.thumbnail_storage_path) {
      throw new NotFoundException('Media thumbnail not found');
    }

    const buffer = await this.storage.get(bucket, row.thumbnail_storage_path);
    if (!buffer) {
      throw new NotFoundException('Media thumbnail unavailable');
    }

    return { buffer, contentType: 'image/webp' };
  }

  /** Delete a media entry and all storage objects (original, cropped, thumbnail). Owner-only. */
  async deleteMedia(userId: string, mediaId: string): Promise<void> {
    const bucket = this.bucket();
    const row = await this.findOwnedRow(userId, mediaId);

    const pathsToRemove = [row.storage_path];
    if (row.cropped_storage_path) {
      pathsToRemove.push(row.cropped_storage_path);
    }
    if (row.thumbnail_storage_path) {
      pathsToRemove.push(row.thumbnail_storage_path);
    }

    await this.removeQuietly(bucket, pathsToRemove, 'Storage cleanup failed');
    await this.db.delete(media).where(eq(media.id, mediaId));
  }

  /** Return crop metadata for the crop editor UI. Owner-only. */
  async getMediaMeta(userId: string, mediaId: string): Promise<MediaMetaDto> {
    const row = await this.findOwnedRow(userId, mediaId);

    return {
      id: mediaId,
      contentType: row.content_type,
      crop: (row.crop as MediaMetaDto['crop']) ?? null,
      hasCropped: !!row.cropped_storage_path,
    };
  }

  /**
   * List all media rows for a given user (for MCP resource listing).
   */
  async listMediaForUser(
    userId: string,
  ): Promise<Array<{ id: string; contentType: string; createdAt: string }>> {
    const rows = await this.db
      .select({ id: media.id, content_type: media.content_type, created_at: media.created_at })
      .from(media)
      .where(eq(media.user_id, userId))
      .orderBy(desc(media.created_at));

    return rows.map((row) => ({
      id: row.id,
      contentType: row.content_type ?? 'application/octet-stream',
      createdAt: row.created_at ?? '',
    }));
  }
}
