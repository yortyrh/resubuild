import {
  CreateBucketCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ObjectStorageConfig {
  /** Custom endpoint (MinIO, DigitalOcean Spaces, Railway Buckets…); omit for AWS S3. */
  endpoint?: string;
  /** Host used to sign URLs handed to clients; defaults to `endpoint`. */
  publicEndpoint?: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

/** Reads the `S3_*` env vars; returns null when credentials are missing. */
export function readObjectStorageConfig(config: ConfigService): ObjectStorageConfig | null {
  const accessKeyId = config.get<string>('S3_ACCESS_KEY_ID')?.trim();
  const secretAccessKey = config.get<string>('S3_SECRET_ACCESS_KEY')?.trim();
  if (!accessKeyId || !secretAccessKey) {
    return null;
  }

  const endpoint = config.get<string>('S3_ENDPOINT')?.trim() || undefined;
  const publicEndpoint = config.get<string>('S3_PUBLIC_ENDPOINT')?.trim() || endpoint;
  const pathStyleRaw = config.get<string>('S3_FORCE_PATH_STYLE')?.trim().toLowerCase();
  const forcePathStyle =
    pathStyleRaw === undefined || pathStyleRaw === ''
      ? Boolean(endpoint)
      : ['1', 'true', 'yes'].includes(pathStyleRaw);

  return {
    endpoint,
    publicEndpoint,
    region: config.get<string>('S3_REGION')?.trim() || 'us-east-1',
    accessKeyId,
    secretAccessKey,
    forcePathStyle,
  };
}

function isNotFound(error: unknown): boolean {
  const e = error as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
  return (
    e?.name === 'NoSuchKey' ||
    e?.name === 'NotFound' ||
    e?.Code === 'NoSuchKey' ||
    e?.$metadata?.httpStatusCode === 404
  );
}

/**
 * Thin wrapper over the S3 API. Works with any S3-compatible service; bucket
 * names are passed per call (`MEDIA_BUCKET`, `MCP_EXPORT_BUCKET`). Buckets are
 * private: clients only get bytes through the API or short-lived presigned URLs.
 */
@Injectable()
export class ObjectStorageService {
  private readonly logger = new Logger(ObjectStorageService.name);
  private readonly settings: ObjectStorageConfig | null;
  private client: S3Client | null = null;
  private presignClient: S3Client | null = null;

  constructor(configService: ConfigService) {
    this.settings = readObjectStorageConfig(configService);
  }

  isConfigured(): boolean {
    return this.settings !== null;
  }

  private clientConfig(endpoint: string | undefined): S3ClientConfig {
    const settings = this.requireSettings();
    return {
      region: settings.region,
      endpoint,
      forcePathStyle: settings.forcePathStyle,
      credentials: {
        accessKeyId: settings.accessKeyId,
        secretAccessKey: settings.secretAccessKey,
      },
      // Only send/verify checksums when the operation requires it; several
      // S3-compatible servers reject the newer default CRC32 headers.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    };
  }

  private requireSettings(): ObjectStorageConfig {
    if (!this.settings) {
      throw new ServiceUnavailableException(
        'Object storage is not configured. Set S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY (plus S3_ENDPOINT for non-AWS services).',
      );
    }
    return this.settings;
  }

  private s3(): S3Client {
    this.client ??= new S3Client(this.clientConfig(this.requireSettings().endpoint));
    return this.client;
  }

  private presigner(): S3Client {
    const settings = this.requireSettings();
    if (settings.publicEndpoint === settings.endpoint) {
      return this.s3();
    }
    this.presignClient ??= new S3Client(this.clientConfig(settings.publicEndpoint));
    return this.presignClient;
  }

  async put(bucket: string, key: string, body: Buffer, contentType: string): Promise<void> {
    await this.s3().send(
      new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }),
    );
  }

  /** Object bytes, or null when the key does not exist. */
  async get(bucket: string, key: string): Promise<Buffer | null> {
    try {
      const response = await this.s3().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      if (!response.Body) return null;
      const bytes = await response.Body.transformToByteArray();
      return Buffer.from(bytes);
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  /** Deletes the keys (missing keys are ignored). Returns how many were removed. */
  async remove(bucket: string, keys: string[]): Promise<number> {
    const unique = [...new Set(keys.filter(Boolean))];
    if (unique.length === 0) return 0;

    let removed = 0;
    for (let i = 0; i < unique.length; i += 1000) {
      const batch = unique.slice(i, i + 1000);
      const response = await this.s3().send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: false },
        }),
      );
      for (const error of response.Errors ?? []) {
        this.logger.warn(`Failed to delete ${error.Key}: ${error.Code} ${error.Message}`);
      }
      removed += response.Deleted?.length ?? 0;
    }
    return removed;
  }

  /** Time-limited GET URL signed for `S3_PUBLIC_ENDPOINT`. */
  presignGet(bucket: string, key: string, ttlSeconds: number): Promise<string> {
    return getSignedUrl(this.presigner(), new GetObjectCommand({ Bucket: bucket, Key: key }), {
      expiresIn: ttlSeconds,
    });
  }

  /** Creates the bucket when missing (local dev and tests; production buckets are provisioned). */
  async ensureBucket(bucket: string): Promise<void> {
    try {
      await this.s3().send(new HeadBucketCommand({ Bucket: bucket }));
    } catch (error) {
      if (!isNotFound(error)) throw error;
      await this.s3().send(new CreateBucketCommand({ Bucket: bucket }));
    }
  }
}
