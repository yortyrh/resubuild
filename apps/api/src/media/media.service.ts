import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
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

@Injectable()
export class MediaService implements OnModuleInit {
  private readonly logger = new Logger(MediaService.name);
  private readonly maxBytes: number;
  private client: SupabaseClient | null = null;

  constructor(private readonly configService: ConfigService) {
    this.maxBytes =
      Number(process.env.MEDIA_MAX_BYTES ?? RESUME_UPLOAD_MAX_BYTES_DEFAULT) ||
      RESUME_UPLOAD_MAX_BYTES_DEFAULT;
  }

  onModuleInit(): void {
    const url = this.configService.get<string>('SUPABASE_URL');
    const serviceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    const bucket = this.configService.get<string>('MEDIA_BUCKET');

    if (url && serviceRoleKey && bucket) {
      this.client = createClient(url, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });
      return;
    }

    const hint = 'Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and MEDIA_BUCKET to enable uploads.';
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`[MediaService] uploads are required in production: ${hint}`);
    }
    this.logger.warn(`Media uploads disabled (dev): ${hint}`);
  }

  private ensureClient(): SupabaseClient {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'File uploads are not configured. Set MEDIA_BUCKET and SUPABASE_SERVICE_ROLE_KEY.',
      );
    }
    return this.client;
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

  private viewerUrlForId(mediaId: string): string {
    return `${this.viewerBaseUrl()}/media/${mediaId}`;
  }

  /**
   * Upload file to Storage, insert `public.media` row, return API-only viewer URL (no direct Storage URL).
   */
  async uploadObject(userId: string, file: Express.Multer.File): Promise<UploadMediaResultDto> {
    if (!userId?.trim()) {
      throw new BadRequestException('User id missing');
    }
    const ext = RESUME_UPLOAD_MIME_EXTENSIONS[file.mimetype];
    if (!ext) {
      throw new BadRequestException(
        `Unsupported file type (${file.mimetype}). Allowed: ${Object.keys(
          RESUME_UPLOAD_MIME_EXTENSIONS,
        ).join(', ')}`,
      );
    }
    if (!file.buffer?.length) {
      throw new BadRequestException('Empty upload');
    }
    if (file.size > this.maxBytes) {
      throw new BadRequestException(`File exceeds max size (${this.maxBytes} bytes)`);
    }

    const bucket = this.configService.get<string>('MEDIA_BUCKET');
    if (!bucket) {
      throw new ServiceUnavailableException('MEDIA_BUCKET is not set');
    }

    const mediaId = randomUUID();
    const objectPath = `${userId}/${mediaId}.${ext}`;
    const supabase = this.ensureClient();

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(objectPath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      this.logger.error(`Storage upload failed: ${uploadError.message}`);
      throw new BadRequestException(uploadError.message);
    }

    const { error: dbError } = await supabase.from('media').insert({
      id: mediaId,
      user_id: userId,
      storage_path: objectPath,
      content_type: file.mimetype,
      size_bytes: file.size,
    });

    if (dbError) {
      this.logger.error(`Media registry insert failed: ${dbError.message}`);
      await supabase.storage
        .from(bucket)
        .remove([objectPath])
        .catch((err) =>
          this.logger.warn(`Rolling back orphaned object failed: ${(err as Error).message}`),
        );
      throw new BadRequestException(dbError.message);
    }

    return {
      id: mediaId,
      url: this.viewerUrlForId(mediaId),
      contentType: file.mimetype,
    };
  }

  /** Loads bytes + content type for GET /media/:id. */
  async loadMediaPayload(mediaId: string): Promise<{ buffer: Buffer; contentType: string }> {
    const bucket = this.configService.get<string>('MEDIA_BUCKET');
    if (!bucket) {
      throw new ServiceUnavailableException('MEDIA_BUCKET is not set');
    }

    const supabase = this.ensureClient();

    const { data: row, error: rowError } = await supabase
      .from('media')
      .select('storage_path, content_type')
      .eq('id', mediaId)
      .maybeSingle();

    if (rowError) {
      this.logger.error(`Media lookup failed: ${rowError.message}`);
      throw new BadRequestException(rowError.message);
    }
    if (!row?.storage_path) {
      throw new NotFoundException('Media not found');
    }

    const { data: blob, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(row.storage_path);

    if (downloadError || !blob) {
      this.logger.error(
        downloadError?.message ?? 'Storage returned empty blob for stored media reference',
      );
      throw new NotFoundException('Media file unavailable');
    }

    const ab = await blob.arrayBuffer();
    const contentType =
      typeof row.content_type === 'string' && row.content_type.trim()
        ? row.content_type
        : 'application/octet-stream';

    return { buffer: Buffer.from(ab), contentType };
  }
}
