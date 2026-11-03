import {
  CreateBucketCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { ObjectStorageService, readObjectStorageConfig } from './object-storage.service';

const config = (env: Record<string, string | undefined>) =>
  ({ get: (key: string) => env[key] }) as unknown as ConfigService;

const BASE_ENV = {
  S3_ENDPOINT: 'http://minio:9000',
  S3_ACCESS_KEY_ID: 'key',
  S3_SECRET_ACCESS_KEY: 'secret',
};

describe('readObjectStorageConfig', () => {
  it('returns null without credentials', () => {
    expect(readObjectStorageConfig(config({}))).toBeNull();
    expect(readObjectStorageConfig(config({ S3_ACCESS_KEY_ID: 'k' }))).toBeNull();
  });

  it('defaults region, public endpoint and path-style addressing', () => {
    expect(readObjectStorageConfig(config(BASE_ENV))).toEqual({
      endpoint: 'http://minio:9000',
      publicEndpoint: 'http://minio:9000',
      region: 'us-east-1',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
      forcePathStyle: true,
    });
  });

  it('uses virtual-hosted style for AWS (no endpoint) and honours explicit overrides', () => {
    expect(
      readObjectStorageConfig(
        config({ S3_ACCESS_KEY_ID: 'k', S3_SECRET_ACCESS_KEY: 's', S3_REGION: 'eu-west-1' }),
      ),
    ).toMatchObject({ endpoint: undefined, region: 'eu-west-1', forcePathStyle: false });
    expect(
      readObjectStorageConfig(
        config({
          ...BASE_ENV,
          S3_PUBLIC_ENDPOINT: 'http://localhost:9000',
          S3_FORCE_PATH_STYLE: 'false',
        }),
      ),
    ).toMatchObject({ publicEndpoint: 'http://localhost:9000', forcePathStyle: false });
  });
});

describe('ObjectStorageService', () => {
  let send: jest.SpyInstance;

  beforeEach(() => {
    send = jest.spyOn(S3Client.prototype, 'send');
  });

  afterEach(() => {
    send.mockRestore();
  });

  it('reports configuration and refuses to operate when unconfigured', async () => {
    const unconfigured = new ObjectStorageService(config({}));
    expect(unconfigured.isConfigured()).toBe(false);
    await expect(unconfigured.get('b', 'k')).rejects.toThrow(ServiceUnavailableException);
    expect(new ObjectStorageService(config(BASE_ENV)).isConfigured()).toBe(true);
  });

  it('put sends PutObject with the content type', async () => {
    send.mockResolvedValue({});
    const storage = new ObjectStorageService(config(BASE_ENV));
    await storage.put('media', 'u/1.png', Buffer.from([1]), 'image/png');

    const command = send.mock.calls[0][0] as PutObjectCommand;
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toMatchObject({
      Bucket: 'media',
      Key: 'u/1.png',
      ContentType: 'image/png',
    });
  });

  it('get returns bytes, or null for missing keys / empty bodies', async () => {
    const storage = new ObjectStorageService(config(BASE_ENV));
    send.mockResolvedValueOnce({
      Body: { transformToByteArray: async () => new Uint8Array([7, 8]) },
    });
    await expect(storage.get('media', 'k')).resolves.toEqual(Buffer.from([7, 8]));
    expect(send.mock.calls[0][0]).toBeInstanceOf(GetObjectCommand);

    send.mockRejectedValueOnce(Object.assign(new Error('missing'), { name: 'NoSuchKey' }));
    await expect(storage.get('media', 'k')).resolves.toBeNull();

    send.mockResolvedValueOnce({});
    await expect(storage.get('media', 'k')).resolves.toBeNull();

    send.mockRejectedValueOnce(Object.assign(new Error('denied'), { name: 'AccessDenied' }));
    await expect(storage.get('media', 'k')).rejects.toThrow('denied');
  });

  it('remove batches unique keys and counts deletions', async () => {
    const storage = new ObjectStorageService(config(BASE_ENV));
    await expect(storage.remove('media', [])).resolves.toBe(0);

    send.mockResolvedValueOnce({
      Deleted: [{ Key: 'a' }],
      Errors: [{ Key: 'b', Code: 'AccessDenied', Message: 'nope' }],
    });
    await expect(storage.remove('media', ['a', 'b', 'a', ''])).resolves.toBe(1);

    const command = send.mock.calls[0][0] as DeleteObjectsCommand;
    expect(command).toBeInstanceOf(DeleteObjectsCommand);
    expect(command.input.Delete?.Objects).toEqual([{ Key: 'a' }, { Key: 'b' }]);
  });

  it('presignGet signs against the public endpoint', async () => {
    const storage = new ObjectStorageService(
      config({ ...BASE_ENV, S3_PUBLIC_ENDPOINT: 'http://localhost:9000' }),
    );
    const url = await storage.presignGet('mcp-exports', 'u/cv/pdf/x.pdf', 120);
    expect(url).toMatch(/^http:\/\/localhost:9000\/mcp-exports\/u\/cv\/pdf\/x\.pdf\?/);
    expect(url).toContain('X-Amz-Expires=120');

    const sameHost = new ObjectStorageService(config(BASE_ENV));
    await expect(sameHost.presignGet('b', 'k', 60)).resolves.toMatch(
      /^http:\/\/minio:9000\/b\/k\?/,
    );
  });

  it('ensureBucket creates the bucket only when HeadBucket says it is missing', async () => {
    const storage = new ObjectStorageService(config(BASE_ENV));
    send.mockResolvedValueOnce({});
    await storage.ensureBucket('media');
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toBeInstanceOf(HeadBucketCommand);

    send
      .mockRejectedValueOnce(Object.assign(new Error('nf'), { $metadata: { httpStatusCode: 404 } }))
      .mockResolvedValueOnce({});
    await storage.ensureBucket('media');
    expect(send.mock.calls[2][0]).toBeInstanceOf(CreateBucketCommand);

    send.mockRejectedValueOnce(
      Object.assign(new Error('forbidden'), { $metadata: { httpStatusCode: 403 } }),
    );
    await expect(storage.ensureBucket('media')).rejects.toThrow('forbidden');
  });
});
