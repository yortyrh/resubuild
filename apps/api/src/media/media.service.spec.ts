jest.mock('@supabase/supabase-js');
jest.mock('./media-remote-fetch.util', () => ({
  fetchRemoteImage: jest.fn(),
}));
jest.mock('node:crypto', () => ({
  ...jest.requireActual<typeof import('node:crypto')>('node:crypto'),
  randomUUID: jest.fn(() => 'aef8297a-2786-4575-9d6c-52d5c93c4c4c'),
}));
jest.mock('sharp', () => {
  const extractFn = jest.fn().mockReturnThis();
  const resizeFn = jest.fn().mockReturnThis();
  const webpFn = jest.fn().mockReturnThis();
  const toBufferFn = jest.fn().mockResolvedValue(Buffer.from([99]));
  const mockSharp = jest.fn(() => ({
    extract: extractFn,
    resize: resizeFn,
    webp: webpFn,
    toBuffer: toBufferFn,
  }));
  return { __esModule: true, default: mockSharp };
});

import {
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { createClient } from '@supabase/supabase-js';
import { MediaService } from './media.service';
import { fetchRemoteImage } from './media-remote-fetch.util';

const mockedFetchRemoteImage = jest.mocked(fetchRemoteImage);

const mockedCreateClient = jest.mocked(createClient);

/** Valid v4 UUID used across upload + download mocks. */
const FIXED_MEDIA_ID = 'aef8297a-2786-4575-9d6c-52d5c93c4c4c';

describe('MediaService', () => {
  const uploadFn = jest.fn();
  const insertFn = jest.fn();
  const removeFn = jest.fn().mockResolvedValue({ error: null });
  const downloadFn = jest.fn();
  const maybeSingleFn = jest.fn();
  const updateFn = jest.fn();
  const deleteFn = jest.fn();

  async function bootstrapModule(
    mode: boolean | 'bucket-only',
  ): Promise<{ service: MediaService; moduleRef: TestingModule }> {
    uploadFn.mockReset();
    uploadFn.mockResolvedValue({ error: null });
    insertFn.mockReset();
    insertFn.mockImplementation(() => Promise.resolve({ error: null }));
    downloadFn.mockReset();
    maybeSingleFn.mockReset();
    updateFn.mockReset();
    deleteFn.mockReset();
    maybeSingleFn.mockResolvedValue({
      data: {
        storage_path: `user-123/${FIXED_MEDIA_ID}.png`,
        content_type: 'image/png',
        user_id: 'user-123',
        crop: null,
        cropped_storage_path: null,
      },
      error: null,
    });
    downloadFn.mockResolvedValue({
      data: { arrayBuffer: async () => new Uint8Array([7, 8]) },
      error: null,
    });
    updateFn.mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });
    deleteFn.mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });

    mockedCreateClient.mockReset();
    if (mode === true) {
      mockedCreateClient.mockReturnValue({
        from: jest.fn((table: string) => {
          if (table === 'media') {
            return {
              insert: insertFn,
              update: updateFn,
              delete: deleteFn,
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: maybeSingleFn,
                }),
              }),
            };
          }
          throw new Error(`unexpected table ${table}`);
        }),
        storage: {
          from: jest.fn().mockReturnValue({
            upload: uploadFn,
            remove: removeFn,
            download: downloadFn,
          }),
        },
      } as unknown as ReturnType<typeof createClient>);
    }

    const configValues: Record<string, string | undefined> =
      mode === true
        ? {
            SUPABASE_URL: 'https://x.supabase.co',
            SUPABASE_SERVICE_ROLE_KEY: 'service-role-token',
            MEDIA_BUCKET: 'media',
            PORT: '3001',
          }
        : mode === 'bucket-only'
          ? { MEDIA_BUCKET: 'media' }
          : {};

    const moduleRef = await Test.createTestingModule({
      providers: [
        MediaService,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => configValues[key] },
        },
      ],
    }).compile();

    const service = moduleRef.get(MediaService);
    await moduleRef.init();
    return { service, moduleRef };
  }

  afterEach(() => {
    delete process.env.MEDIA_MAX_BYTES;
    jest.restoreAllMocks();
  });

  it('uploadObject stores PNG, inserts media row, returns API viewer URL', async () => {
    const { service, moduleRef } = await bootstrapModule(true);
    const file = {
      mimetype: 'image/png',
      buffer: Buffer.from([0]),
      size: 1,
    } as unknown as Express.Multer.File;

    await expect(service.uploadObject('user-123', file)).resolves.toEqual({
      id: FIXED_MEDIA_ID,
      url: `http://localhost:3001/media/${FIXED_MEDIA_ID}`,
      contentType: 'image/png',
    });

    expect(uploadFn).toHaveBeenCalledWith(
      `user-123/${FIXED_MEDIA_ID}.png`,
      file.buffer,
      expect.objectContaining({ contentType: 'image/png', upsert: false }),
    );
    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        id: FIXED_MEDIA_ID,
        user_id: 'user-123',
        storage_path: `user-123/${FIXED_MEDIA_ID}.png`,
        content_type: 'image/png',
        size_bytes: 1,
      }),
    );
    expect(uploadFn).toHaveBeenCalledWith(
      `user-123/${FIXED_MEDIA_ID}_thumb.webp`,
      expect.any(Buffer),
      expect.objectContaining({ contentType: 'image/webp', upsert: true }),
    );
    await moduleRef.close();
  });

  it('PUBLIC_API_URL overrides default viewer URL host', async () => {
    uploadFn.mockResolvedValue({ error: null });
    insertFn.mockImplementation(() => Promise.resolve({ error: null }));
    maybeSingleFn.mockResolvedValue({
      data: {
        storage_path: `u1/${FIXED_MEDIA_ID}.png`,
        content_type: 'image/png',
        user_id: 'u1',
        crop: null,
        cropped_storage_path: null,
      },
      error: null,
    });
    downloadFn.mockResolvedValue({
      data: { arrayBuffer: async () => new Uint8Array([7, 8]) },
      error: null,
    });
    updateFn.mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });

    mockedCreateClient.mockReturnValue({
      from: jest.fn(() => ({
        insert: insertFn,
        update: updateFn,
        delete: deleteFn,
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({ maybeSingle: maybeSingleFn }),
        }),
      })),
      storage: {
        from: jest.fn().mockReturnValue({
          upload: uploadFn,
          remove: removeFn,
          download: downloadFn,
        }),
      },
    } as unknown as ReturnType<typeof createClient>);

    const moduleRef = await Test.createTestingModule({
      providers: [
        MediaService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              (
                ({
                  SUPABASE_URL: 'https://x.supabase.co',
                  SUPABASE_SERVICE_ROLE_KEY: 'k',
                  MEDIA_BUCKET: 'media',
                  PUBLIC_API_URL: 'https://api.example.com',
                }) as Record<string, string>
              )[key],
          },
        },
      ],
    }).compile();
    const service = moduleRef.get(MediaService);
    await moduleRef.init();

    const file = {
      mimetype: 'image/png',
      buffer: Buffer.from([1]),
      size: 1,
    } as unknown as Express.Multer.File;

    await expect(service.uploadObject('u1', file)).resolves.toMatchObject({
      url: `https://api.example.com/media/${FIXED_MEDIA_ID}`,
    });

    await moduleRef.close();
  });

  it('rejects unsupported mime types before talking to Storage', async () => {
    const { service, moduleRef } = await bootstrapModule(true);
    const bad = {
      mimetype: 'application/pdf',
      buffer: Buffer.from([1]),
      size: 1,
    } as unknown as Express.Multer.File;

    await expect(service.uploadObject('user-123', bad)).rejects.toBeInstanceOf(BadRequestException);
    expect(uploadFn).not.toHaveBeenCalled();
    await moduleRef.close();
  });

  it('rejects empty buffers', async () => {
    const { service, moduleRef } = await bootstrapModule(true);
    const empty = {
      mimetype: 'image/png',
      buffer: Buffer.alloc(0),
      size: 0,
    } as unknown as Express.Multer.File;

    await expect(service.uploadObject('user-123', empty)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await moduleRef.close();
  });

  it('maps Storage quota errors into BadRequestException', async () => {
    const { service, moduleRef } = await bootstrapModule(true);
    uploadFn.mockResolvedValueOnce({ error: { message: 'quota exceeded' } });

    const file = {
      mimetype: 'image/jpeg',
      buffer: Buffer.from([2]),
      size: 1,
    } as unknown as Express.Multer.File;

    await expect(service.uploadObject('user-123', file)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(insertFn).not.toHaveBeenCalled();
    await moduleRef.close();
  });

  it('removes Storage object when media insert fails', async () => {
    const { service, moduleRef } = await bootstrapModule(true);
    insertFn.mockImplementationOnce(() => Promise.resolve({ error: { message: 'rls denied' } }));

    const file = {
      mimetype: 'image/webp',
      buffer: Buffer.from([3]),
      size: 1,
    } as unknown as Express.Multer.File;

    await expect(service.uploadObject('user-123', file)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(removeFn).toHaveBeenCalledWith([`user-123/${FIXED_MEDIA_ID}.webp`]);
    await moduleRef.close();
  });

  it('logs when rollback delete fails after media insert fails', async () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const { service, moduleRef } = await bootstrapModule(true);
    insertFn.mockImplementationOnce(() => Promise.resolve({ error: { message: 'rls denied' } }));
    removeFn.mockRejectedValueOnce(new Error('storage delete unavailable'));

    const file = {
      mimetype: 'image/webp',
      buffer: Buffer.from([3]),
      size: 1,
    } as unknown as Express.Multer.File;

    await expect(service.uploadObject('user-123', file)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(removeFn).toHaveBeenCalledWith([`user-123/${FIXED_MEDIA_ID}.webp`]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Rolling back orphaned object failed'),
    );
    warnSpy.mockRestore();
    await moduleRef.close();
  });

  it('rejects uploads when uploads are disabled (missing configuration)', async () => {
    const { service, moduleRef } = await bootstrapModule(false);
    const file = {
      mimetype: 'image/png',
      buffer: Buffer.from([9]),
      size: 1,
    } as unknown as Express.Multer.File;

    await expect(service.uploadObject('user-999', file)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );

    await moduleRef.close();
  });

  it('blocks upload via ensureClient when bucket is set but Supabase credentials are missing', async () => {
    const { service, moduleRef } = await bootstrapModule('bucket-only');
    const file = {
      mimetype: 'image/png',
      buffer: Buffer.from([1]),
      size: 1,
    } as unknown as Express.Multer.File;

    await expect(service.uploadObject('user-abc', file)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await moduleRef.close();
  });

  it('rejects whitespace-only user ids', async () => {
    const { service, moduleRef } = await bootstrapModule(true);
    const file = {
      mimetype: 'image/png',
      buffer: Buffer.from([1]),
      size: 1,
    } as unknown as Express.Multer.File;

    await expect(service.uploadObject('   ', file)).rejects.toBeInstanceOf(BadRequestException);
    await moduleRef.close();
  });

  it('rejects missing buffer payloads', async () => {
    const { service, moduleRef } = await bootstrapModule(true);
    const missingBuffer = {
      mimetype: 'image/png',
      size: 1,
    } as unknown as Express.Multer.File;

    await expect(service.uploadObject('user-z', missingBuffer)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await moduleRef.close();
  });

  it('importFromUrl returns null when remote image is missing', async () => {
    mockedFetchRemoteImage.mockResolvedValueOnce(null);
    const { service, moduleRef } = await bootstrapModule(true);

    await expect(
      service.importFromUrl('user-123', 'https://cdn.example.com/missing.png'),
    ).resolves.toBeNull();

    await moduleRef.close();
  });

  it('canImportImageFromUrl reflects remote fetch outcome', async () => {
    mockedFetchRemoteImage.mockResolvedValueOnce({
      buffer: Buffer.from([1]),
      contentType: 'image/png',
    });
    const { service, moduleRef } = await bootstrapModule(true);

    await expect(service.canImportImageFromUrl('https://cdn.example.com/ok.png')).resolves.toBe(
      true,
    );

    mockedFetchRemoteImage.mockResolvedValueOnce(null);
    await expect(
      service.canImportImageFromUrl('https://cdn.example.com/missing.png'),
    ).resolves.toBe(false);

    await moduleRef.close();
  });

  it('importFromGravatarEmail returns null for invalid email', async () => {
    mockedFetchRemoteImage.mockClear();
    const { service, moduleRef } = await bootstrapModule(true);

    await expect(service.importFromGravatarEmail('user-123', 'not-an-email')).resolves.toBeNull();
    expect(mockedFetchRemoteImage).not.toHaveBeenCalled();

    await moduleRef.close();
  });

  it('rolls back upload when thumbnail generation fails', async () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const { service, moduleRef } = await bootstrapModule(true);
    uploadFn
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: 'thumb upload failed' } });

    const file = {
      mimetype: 'image/png',
      buffer: Buffer.from([1]),
      size: 1,
    } as unknown as Express.Multer.File;

    await expect(service.uploadObject('user-123', file)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(removeFn).toHaveBeenCalledWith([`user-123/${FIXED_MEDIA_ID}.png`]);
    expect(deleteFn).toHaveBeenCalled();

    warnSpy.mockRestore();
    await moduleRef.close();
  });

  it('importFromGravatarEmail delegates to Gravatar URL import', async () => {
    mockedFetchRemoteImage.mockResolvedValueOnce({
      buffer: Buffer.from([0]),
      contentType: 'image/png',
    });
    const { service, moduleRef } = await bootstrapModule(true);

    await expect(
      service.importFromGravatarEmail('user-123', 'MyEmail@Example.com'),
    ).resolves.toMatchObject({
      id: FIXED_MEDIA_ID,
      contentType: 'image/png',
    });

    expect(mockedFetchRemoteImage).toHaveBeenCalledWith(
      'https://www.gravatar.com/avatar/60a6c20d49f49bc210ac98d7e47c74a0?s=512&d=404',
      expect.objectContaining({ maxBytes: expect.any(Number) }),
    );
    await moduleRef.close();
  });

  it('importFromUrl uploads fetched image bytes', async () => {
    mockedFetchRemoteImage.mockResolvedValueOnce({
      buffer: Buffer.from([0]),
      contentType: 'image/png',
    });
    const { service, moduleRef } = await bootstrapModule(true);

    await expect(
      service.importFromUrl('user-123', 'https://cdn.example.com/photo.png'),
    ).resolves.toEqual({
      id: FIXED_MEDIA_ID,
      url: `http://localhost:3001/media/${FIXED_MEDIA_ID}`,
      contentType: 'image/png',
    });

    expect(uploadFn).toHaveBeenCalledWith(
      `user-123/${FIXED_MEDIA_ID}.png`,
      expect.any(Buffer),
      expect.objectContaining({ contentType: 'image/png', upsert: false }),
    );
    expect(uploadFn).toHaveBeenCalledWith(
      `user-123/${FIXED_MEDIA_ID}_thumb.webp`,
      expect.any(Buffer),
      expect.objectContaining({ contentType: 'image/webp', upsert: true }),
    );
    await moduleRef.close();
  });

  it('rejects payloads over MEDIA_MAX_BYTES', async () => {
    process.env.MEDIA_MAX_BYTES = '10';
    const { service, moduleRef } = await bootstrapModule(true);
    const file = {
      mimetype: 'image/gif',
      buffer: Buffer.alloc(11),
      size: 11,
    } as unknown as Express.Multer.File;

    await expect(service.uploadObject('user-big', file)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await moduleRef.close();
  });

  it('loadMediaPayload loads row and downloads bytes', async () => {
    const { service, moduleRef } = await bootstrapModule(true);
    const out = await service.loadMediaPayload(FIXED_MEDIA_ID);
    expect(out.buffer.equals(Buffer.from([7, 8]))).toBe(true);
    expect(out.contentType).toBe('image/png');
    await moduleRef.close();
  });

  it('loadMediaPayload throws NotFound when row missing', async () => {
    const { service, moduleRef } = await bootstrapModule(true);
    maybeSingleFn.mockResolvedValueOnce({ data: null, error: null });
    await expect(service.loadMediaPayload(FIXED_MEDIA_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await moduleRef.close();
  });

  it('loadMediaPayload throws BadRequest when media lookup returns an error', async () => {
    const { service, moduleRef } = await bootstrapModule(true);
    maybeSingleFn.mockResolvedValueOnce({ data: null, error: { message: 'rpc failed' } });
    await expect(service.loadMediaPayload(FIXED_MEDIA_ID)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await moduleRef.close();
  });

  it('loadMediaPayload throws ServiceUnavailableException when MEDIA_BUCKET is not set', async () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const moduleRef = await Test.createTestingModule({
      providers: [
        MediaService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              (
                ({
                  SUPABASE_URL: 'https://x.supabase.co',
                  SUPABASE_SERVICE_ROLE_KEY: 'service-role-token',
                  PORT: '3001',
                }) as Record<string, string | undefined>
              )[key],
          },
        },
      ],
    }).compile();
    await moduleRef.init();

    await expect(
      moduleRef.get(MediaService).loadMediaPayload(FIXED_MEDIA_ID),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    warnSpy.mockRestore();
    await moduleRef.close();
  });

  it('loadMediaPayload throws NotFound when storage download fails', async () => {
    const { service, moduleRef } = await bootstrapModule(true);
    downloadFn.mockResolvedValueOnce({
      data: null,
      error: { message: 'object gone' },
    });
    await expect(service.loadMediaPayload(FIXED_MEDIA_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await moduleRef.close();
  });

  it('loadMediaPayload throws NotFound when storage returns no blob without error', async () => {
    const { service, moduleRef } = await bootstrapModule(true);
    downloadFn.mockResolvedValueOnce({ data: null, error: null });
    await expect(service.loadMediaPayload(FIXED_MEDIA_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await moduleRef.close();
  });

  it('loadMediaPayload maps empty MIME to application/octet-stream', async () => {
    const { service, moduleRef } = await bootstrapModule(true);
    maybeSingleFn.mockResolvedValueOnce({
      data: { storage_path: `user-x/${FIXED_MEDIA_ID}.png`, content_type: '   ' },
      error: null,
    });

    await expect(service.loadMediaPayload(FIXED_MEDIA_ID).then((x) => x.contentType)).resolves.toBe(
      'application/octet-stream',
    );
    await moduleRef.close();
  });

  it('warns when uploads are skipped in development (misconfiguration)', async () => {
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    const moduleRef = await Test.createTestingModule({
      providers: [
        MediaService,
        {
          provide: ConfigService,
          useValue: { get: () => undefined },
        },
      ],
    }).compile();

    await moduleRef.init();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Media uploads disabled (dev)'));

    await moduleRef.close();
    warnSpy.mockRestore();
    process.env.NODE_ENV = prevEnv;
  });

  it('throws from onModuleInit in production when media env is incomplete', () => {
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const service = new MediaService({
      get: () => undefined,
    } as unknown as ConfigService);

    expect(() => service.onModuleInit()).toThrow(/uploads are required in production/);

    process.env.NODE_ENV = prevEnv;
  });

  it('loadMediaPayload prefers cropped_storage_path when set', async () => {
    const { service, moduleRef } = await bootstrapModule(true);
    maybeSingleFn.mockResolvedValueOnce({
      data: {
        storage_path: `user-123/${FIXED_MEDIA_ID}.png`,
        cropped_storage_path: `user-123/${FIXED_MEDIA_ID}_cropped.webp`,
        content_type: 'image/png',
      },
      error: null,
    });
    await service.loadMediaPayload(FIXED_MEDIA_ID);
    expect(downloadFn).toHaveBeenCalledWith(`user-123/${FIXED_MEDIA_ID}_cropped.webp`);
    await moduleRef.close();
  });

  describe('cropMedia', () => {
    const crop = { x: 10, y: 20, width: 100, height: 100 };

    it('generates cropped derivative and updates row', async () => {
      const { service, moduleRef } = await bootstrapModule(true);
      const result = await service.cropMedia('user-123', FIXED_MEDIA_ID, crop);
      expect(result).toEqual({
        id: FIXED_MEDIA_ID,
        url: `http://localhost:3001/media/${FIXED_MEDIA_ID}`,
        contentType: 'image/webp',
      });
      expect(uploadFn).toHaveBeenCalledWith(
        `user-123/${FIXED_MEDIA_ID}_cropped.webp`,
        expect.any(Buffer),
        expect.objectContaining({ contentType: 'image/webp', upsert: true }),
      );
      await moduleRef.close();
    });

    it('rejects non-owner crop', async () => {
      const { service, moduleRef } = await bootstrapModule(true);
      await expect(service.cropMedia('other-user', FIXED_MEDIA_ID, crop)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await moduleRef.close();
    });

    it('throws NotFound for missing media', async () => {
      const { service, moduleRef } = await bootstrapModule(true);
      maybeSingleFn.mockResolvedValueOnce({ data: null, error: null });
      await expect(service.cropMedia('user-123', FIXED_MEDIA_ID, crop)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await moduleRef.close();
    });

    it('throws BadRequest when media lookup returns an error', async () => {
      const { service, moduleRef } = await bootstrapModule(true);
      maybeSingleFn.mockResolvedValueOnce({ data: null, error: { message: 'lookup failed' } });
      await expect(service.cropMedia('user-123', FIXED_MEDIA_ID, crop)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await moduleRef.close();
    });

    it('throws NotFound when original file download fails', async () => {
      const { service, moduleRef } = await bootstrapModule(true);
      downloadFn.mockResolvedValueOnce({ data: null, error: { message: 'missing object' } });
      await expect(service.cropMedia('user-123', FIXED_MEDIA_ID, crop)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await moduleRef.close();
    });

    it('removes previous cropped object before uploading replacement', async () => {
      const { service, moduleRef } = await bootstrapModule(true);
      maybeSingleFn.mockResolvedValueOnce({
        data: {
          user_id: 'user-123',
          storage_path: `user-123/${FIXED_MEDIA_ID}.png`,
          content_type: 'image/png',
          cropped_storage_path: `user-123/${FIXED_MEDIA_ID}_old.webp`,
        },
        error: null,
      });
      await service.cropMedia('user-123', FIXED_MEDIA_ID, crop);
      expect(removeFn).toHaveBeenCalledWith([`user-123/${FIXED_MEDIA_ID}_old.webp`]);
      await moduleRef.close();
    });

    it('throws BadRequest when cropped upload fails', async () => {
      const { service, moduleRef } = await bootstrapModule(true);
      uploadFn.mockResolvedValueOnce({ error: { message: 'upload rejected' } });
      await expect(service.cropMedia('user-123', FIXED_MEDIA_ID, crop)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await moduleRef.close();
    });

    it('throws BadRequest when crop metadata update fails', async () => {
      const { service, moduleRef } = await bootstrapModule(true);
      updateFn.mockReturnValueOnce({
        eq: jest.fn().mockResolvedValue({ error: { message: 'update denied' } }),
      });
      await expect(service.cropMedia('user-123', FIXED_MEDIA_ID, crop)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await moduleRef.close();
    });

    it('throws ServiceUnavailableException when MEDIA_BUCKET is not set', async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [
          MediaService,
          {
            provide: ConfigService,
            useValue: {
              get: (key: string) =>
                (
                  ({
                    SUPABASE_URL: 'https://x.supabase.co',
                    SUPABASE_SERVICE_ROLE_KEY: 'service-role-token',
                    PORT: '3001',
                  }) as Record<string, string | undefined>
                )[key],
            },
          },
        ],
      }).compile();
      await moduleRef.init();
      await expect(
        moduleRef.get(MediaService).cropMedia('user-123', FIXED_MEDIA_ID, crop),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      await moduleRef.close();
    });
  });

  describe('deleteMedia', () => {
    it('removes storage objects and row', async () => {
      const { service, moduleRef } = await bootstrapModule(true);
      await service.deleteMedia('user-123', FIXED_MEDIA_ID);
      expect(removeFn).toHaveBeenCalledWith([`user-123/${FIXED_MEDIA_ID}.png`]);
      await moduleRef.close();
    });

    it('removes cropped object when present', async () => {
      const { service, moduleRef } = await bootstrapModule(true);
      maybeSingleFn.mockResolvedValueOnce({
        data: {
          user_id: 'user-123',
          storage_path: `user-123/${FIXED_MEDIA_ID}.png`,
          cropped_storage_path: `user-123/${FIXED_MEDIA_ID}_cropped.webp`,
        },
        error: null,
      });
      await service.deleteMedia('user-123', FIXED_MEDIA_ID);
      expect(removeFn).toHaveBeenCalledWith([
        `user-123/${FIXED_MEDIA_ID}.png`,
        `user-123/${FIXED_MEDIA_ID}_cropped.webp`,
      ]);
      await moduleRef.close();
    });

    it('removes thumbnail object when present', async () => {
      const { service, moduleRef } = await bootstrapModule(true);
      maybeSingleFn.mockResolvedValueOnce({
        data: {
          user_id: 'user-123',
          storage_path: `user-123/${FIXED_MEDIA_ID}.png`,
          cropped_storage_path: null,
          thumbnail_storage_path: `user-123/${FIXED_MEDIA_ID}_thumb.webp`,
        },
        error: null,
      });
      await service.deleteMedia('user-123', FIXED_MEDIA_ID);
      expect(removeFn).toHaveBeenCalledWith([
        `user-123/${FIXED_MEDIA_ID}.png`,
        `user-123/${FIXED_MEDIA_ID}_thumb.webp`,
      ]);
      await moduleRef.close();
    });

    it('rejects non-owner delete', async () => {
      const { service, moduleRef } = await bootstrapModule(true);
      await expect(service.deleteMedia('other-user', FIXED_MEDIA_ID)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await moduleRef.close();
    });

    it('throws BadRequest when media lookup returns an error', async () => {
      const { service, moduleRef } = await bootstrapModule(true);
      maybeSingleFn.mockResolvedValueOnce({ data: null, error: { message: 'lookup failed' } });
      await expect(service.deleteMedia('user-123', FIXED_MEDIA_ID)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await moduleRef.close();
    });

    it('throws NotFound for missing media', async () => {
      const { service, moduleRef } = await bootstrapModule(true);
      maybeSingleFn.mockResolvedValueOnce({ data: null, error: null });
      await expect(service.deleteMedia('user-123', FIXED_MEDIA_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await moduleRef.close();
    });

    it('logs when storage cleanup fails but still deletes row', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      const { service, moduleRef } = await bootstrapModule(true);
      removeFn.mockRejectedValueOnce(new Error('storage unavailable'));
      await service.deleteMedia('user-123', FIXED_MEDIA_ID);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Storage cleanup failed'));
      warnSpy.mockRestore();
      await moduleRef.close();
    });

    it('throws BadRequest when media row delete fails', async () => {
      const { service, moduleRef } = await bootstrapModule(true);
      deleteFn.mockReturnValueOnce({
        eq: jest.fn().mockResolvedValue({ error: { message: 'delete denied' } }),
      });
      await expect(service.deleteMedia('user-123', FIXED_MEDIA_ID)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await moduleRef.close();
    });

    it('throws ServiceUnavailableException when MEDIA_BUCKET is not set', async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [
          MediaService,
          {
            provide: ConfigService,
            useValue: {
              get: (key: string) =>
                (
                  ({
                    SUPABASE_URL: 'https://x.supabase.co',
                    SUPABASE_SERVICE_ROLE_KEY: 'service-role-token',
                    PORT: '3001',
                  }) as Record<string, string | undefined>
                )[key],
            },
          },
        ],
      }).compile();
      await moduleRef.init();
      await expect(
        moduleRef.get(MediaService).deleteMedia('user-123', FIXED_MEDIA_ID),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      await moduleRef.close();
    });
  });

  describe('loadOriginalPayload', () => {
    it('always downloads storage_path even when cropped exists', async () => {
      const { service, moduleRef } = await bootstrapModule(true);
      maybeSingleFn.mockResolvedValueOnce({
        data: {
          storage_path: `user-123/${FIXED_MEDIA_ID}.png`,
          content_type: 'image/png',
        },
        error: null,
      });
      const payload = await service.loadOriginalPayload(FIXED_MEDIA_ID);
      expect(payload.contentType).toBe('image/png');
      expect(downloadFn).toHaveBeenCalled();
      await moduleRef.close();
    });

    it('throws NotFound when original object is missing', async () => {
      const { service, moduleRef } = await bootstrapModule(true);
      maybeSingleFn.mockResolvedValueOnce({ data: null, error: null });
      await expect(service.loadOriginalPayload(FIXED_MEDIA_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await moduleRef.close();
    });

    it('throws NotFound when original download fails', async () => {
      const { service, moduleRef } = await bootstrapModule(true);
      downloadFn.mockResolvedValueOnce({ data: null, error: { message: 'missing' } });
      await expect(service.loadOriginalPayload(FIXED_MEDIA_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await moduleRef.close();
    });
  });

  describe('ensureThumbnail', () => {
    it('uploads thumbnail and updates registry without touching original path', async () => {
      const { service, moduleRef } = await bootstrapModule(true);
      await service.ensureThumbnail(FIXED_MEDIA_ID);
      expect(uploadFn).toHaveBeenCalledWith(
        `user-123/${FIXED_MEDIA_ID}_thumb.webp`,
        expect.any(Buffer),
        expect.objectContaining({ contentType: 'image/webp', upsert: true }),
      );
      const updatePayload = updateFn.mock.calls.find((call) =>
        call[0]?.thumbnail_storage_path?.includes('_thumb.webp'),
      );
      expect(updatePayload).toBeDefined();
      expect(updatePayload?.[0]).not.toHaveProperty('storage_path');
      await moduleRef.close();
    });

    it('throws NotFound when media row is missing', async () => {
      const { service, moduleRef } = await bootstrapModule(true);
      maybeSingleFn.mockResolvedValueOnce({ data: null, error: null });
      await expect(service.ensureThumbnail(FIXED_MEDIA_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await moduleRef.close();
    });

    it('throws BadRequest when thumbnail upload fails', async () => {
      const { service, moduleRef } = await bootstrapModule(true);
      uploadFn.mockResolvedValueOnce({ error: { message: 'thumb upload failed' } });
      await expect(service.ensureThumbnail(FIXED_MEDIA_ID)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await moduleRef.close();
    });

    it('throws NotFound when source bytes are unavailable', async () => {
      const { service, moduleRef } = await bootstrapModule(true);
      downloadFn.mockResolvedValueOnce({ data: null, error: { message: 'missing' } });
      await expect(service.ensureThumbnail(FIXED_MEDIA_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await moduleRef.close();
    });
  });

  describe('loadThumbnailPayload', () => {
    it('returns thumbnail bytes when path is set', async () => {
      const { service, moduleRef } = await bootstrapModule(true);
      maybeSingleFn.mockResolvedValueOnce({
        data: { thumbnail_storage_path: `user-123/${FIXED_MEDIA_ID}_thumb.webp` },
        error: null,
      });
      const payload = await service.loadThumbnailPayload(FIXED_MEDIA_ID);
      expect(payload.contentType).toBe('image/webp');
      expect(payload.buffer).toEqual(Buffer.from([7, 8]));
      await moduleRef.close();
    });

    it('throws NotFound when thumbnail path is missing', async () => {
      const { service, moduleRef } = await bootstrapModule(true);
      maybeSingleFn.mockResolvedValueOnce({ data: { thumbnail_storage_path: null }, error: null });
      await expect(service.loadThumbnailPayload(FIXED_MEDIA_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await moduleRef.close();
    });

    it('throws NotFound when thumbnail download fails', async () => {
      const { service, moduleRef } = await bootstrapModule(true);
      maybeSingleFn.mockResolvedValueOnce({
        data: { thumbnail_storage_path: `user-123/${FIXED_MEDIA_ID}_thumb.webp` },
        error: null,
      });
      downloadFn.mockResolvedValueOnce({ data: null, error: { message: 'gone' } });
      await expect(service.loadThumbnailPayload(FIXED_MEDIA_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await moduleRef.close();
    });
  });

  describe('getMediaMeta', () => {
    it('returns crop metadata for owner', async () => {
      const { service, moduleRef } = await bootstrapModule(true);
      maybeSingleFn.mockResolvedValueOnce({
        data: {
          user_id: 'user-123',
          content_type: 'image/png',
          crop: { x: 0, y: 0, width: 50, height: 50 },
          cropped_storage_path: `user-123/${FIXED_MEDIA_ID}_cropped.webp`,
        },
        error: null,
      });
      const meta = await service.getMediaMeta('user-123', FIXED_MEDIA_ID);
      expect(meta).toEqual({
        id: FIXED_MEDIA_ID,
        contentType: 'image/png',
        crop: { x: 0, y: 0, width: 50, height: 50 },
        hasCropped: true,
      });
      await moduleRef.close();
    });

    it('returns null crop when not set', async () => {
      const { service, moduleRef } = await bootstrapModule(true);
      const meta = await service.getMediaMeta('user-123', FIXED_MEDIA_ID);
      expect(meta.crop).toBeNull();
      expect(meta.hasCropped).toBe(false);
      await moduleRef.close();
    });

    it('rejects non-owner', async () => {
      const { service, moduleRef } = await bootstrapModule(true);
      await expect(service.getMediaMeta('other-user', FIXED_MEDIA_ID)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await moduleRef.close();
    });

    it('throws BadRequest when media lookup returns an error', async () => {
      const { service, moduleRef } = await bootstrapModule(true);
      maybeSingleFn.mockResolvedValueOnce({ data: null, error: { message: 'lookup failed' } });
      await expect(service.getMediaMeta('user-123', FIXED_MEDIA_ID)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await moduleRef.close();
    });

    it('throws NotFound for missing media', async () => {
      const { service, moduleRef } = await bootstrapModule(true);
      maybeSingleFn.mockResolvedValueOnce({ data: null, error: null });
      await expect(service.getMediaMeta('user-123', FIXED_MEDIA_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await moduleRef.close();
    });
  });
});
