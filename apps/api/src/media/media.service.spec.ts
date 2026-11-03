jest.mock('./media-remote-fetch.util', () => ({
  fetchRemoteImage: jest.fn(),
}));

import {
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { media } from '@resubuild/db';
import sharp from 'sharp';
import type { AuthUser } from '../auth/auth-user.types';
import { useTestDb } from '../database/test-db.helpers';
import { InMemoryObjectStorage } from '../storage/in-memory-object-storage';
import { MediaService } from './media.service';
import { fetchRemoteImage } from './media-remote-fetch.util';

const mockedFetchRemoteImage = jest.mocked(fetchRemoteImage);
const BUCKET = 'media';
const MISSING_ID = '00000000-0000-0000-0000-000000000000';

function png(width = 40, height = 30): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: '#c33' } })
    .png()
    .toBuffer();
}

describe('MediaService', () => {
  const ctx = useTestDb();
  let storage: InMemoryObjectStorage;
  let env: Record<string, string | undefined>;
  let service: MediaService;
  let user: AuthUser;
  let other: AuthUser;

  function createService(): MediaService {
    const config = { get: (key: string) => env[key] } as unknown as ConfigService;
    return new MediaService(config, ctx.db, storage.asService());
  }

  beforeEach(async () => {
    mockedFetchRemoteImage.mockReset();
    storage = new InMemoryObjectStorage();
    env = { MEDIA_BUCKET: BUCKET };
    service = createService();
    user = await ctx.createUser();
    other = await ctx.createUser();
  });

  async function upload(owner = user) {
    return service.uploadBuffer(owner.id, await png(), 'image/png');
  }

  async function rowFor(id: string) {
    const rows = await ctx.db.select().from(media);
    return rows.find((r) => r.id === id);
  }

  describe('configuration', () => {
    it('warns in development when uploads are not configured', () => {
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      env = {};

      createService().onModuleInit();

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Media uploads disabled (dev)'));
      warnSpy.mockRestore();
      process.env.NODE_ENV = prevEnv;
    });

    it('throws from onModuleInit in production when storage is not configured', () => {
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      storage.configured = false;
      expect(() => createService().onModuleInit()).toThrow(/uploads are required in production/);
      process.env.NODE_ENV = prevEnv;
    });

    it('accepts a complete configuration silently', () => {
      expect(() => service.onModuleInit()).not.toThrow();
    });

    it('rejects storage operations when MEDIA_BUCKET or storage is missing', async () => {
      env = {};
      await expect(createService().loadMediaPayload(MISSING_ID)).rejects.toThrow(
        ServiceUnavailableException,
      );
      env = { MEDIA_BUCKET: BUCKET };
      storage.configured = false;
      await expect(upload()).rejects.toThrow(ServiceUnavailableException);
    });

    it('PUBLIC_API_URL overrides the default viewer URL host', () => {
      expect(service.viewerUrlForId('x')).toBe('http://localhost:3001/media/x');
      env.PUBLIC_API_URL = 'https://api.example.com/';
      expect(service.viewerUrlForId('x')).toBe('https://api.example.com/media/x');
      env = { MEDIA_BUCKET: BUCKET, PORT: '4000' };
      expect(service.viewerBaseUrl()).toBe('http://localhost:4000');
    });
  });

  describe('upload', () => {
    it('stores the object and a thumbnail, inserts the media row, returns the API viewer URL', async () => {
      const file = { mimetype: 'image/png', buffer: await png(), size: 10 } as Express.Multer.File;

      const result = await service.uploadObject(user.id, file);

      expect(result).toEqual({
        id: expect.any(String),
        url: `http://localhost:3001/media/${result.id}`,
        contentType: 'image/png',
      });
      expect(storage.keys(BUCKET)).toEqual(
        [`${user.id}/${result.id}.png`, `${user.id}/${result.id}_thumb.webp`].sort(),
      );
      expect(await rowFor(result.id)).toMatchObject({
        user_id: user.id,
        storage_path: `${user.id}/${result.id}.png`,
        content_type: 'image/png',
        size_bytes: file.buffer.length,
        thumbnail_storage_path: `${user.id}/${result.id}_thumb.webp`,
      });
    });

    it('rejects missing user ids, empty or oversize payloads and unsupported types', async () => {
      const image = await png();
      await expect(service.uploadBuffer('', image, 'image/png')).rejects.toThrow('User id missing');
      await expect(service.uploadBuffer('   ', image, 'image/png')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.uploadBuffer(user.id, Buffer.alloc(0), 'image/png')).rejects.toThrow(
        'Empty upload',
      );
      await expect(service.uploadBuffer(user.id, image, 'application/pdf')).rejects.toThrow(
        'Unsupported file type',
      );
      await expect(
        service.uploadObject(user.id, { buffer: undefined } as unknown as Express.Multer.File),
      ).rejects.toThrow('Empty upload');
      await expect(
        service.uploadObject(user.id, {
          buffer: image,
          size: 999_999_999,
        } as Express.Multer.File),
      ).rejects.toThrow('exceeds max size');
      expect(storage.objects.size).toBe(0);
    });

    it('honours MEDIA_MAX_BYTES', async () => {
      const prev = process.env.MEDIA_MAX_BYTES;
      process.env.MEDIA_MAX_BYTES = '10';
      const small = createService();
      await expect(small.uploadBuffer(user.id, await png(), 'image/png')).rejects.toThrow(
        'exceeds max size (10 bytes)',
      );
      process.env.MEDIA_MAX_BYTES = prev;
    });

    it('maps storage failures to BadRequest and writes no row', async () => {
      jest.spyOn(storage, 'put').mockRejectedValueOnce(new Error('quota exceeded'));
      await expect(upload()).rejects.toThrow(new BadRequestException('quota exceeded'));
      expect(await ctx.db.select().from(media)).toEqual([]);
    });

    it('removes the stored object when the media insert fails', async () => {
      jest.spyOn(ctx.db, 'insert').mockImplementationOnce(() => {
        throw new Error('insert failed');
      });
      await expect(upload()).rejects.toThrow('insert failed');
      expect(storage.objects.size).toBe(0);
    });

    it('rolls back object, thumbnail and row when thumbnail generation fails', async () => {
      await expect(
        service.uploadBuffer(user.id, Buffer.from('not an image'), 'image/png'),
      ).rejects.toThrow();
      expect(storage.objects.size).toBe(0);
      expect(await ctx.db.select().from(media)).toEqual([]);
    });
  });

  describe('remote imports', () => {
    it('importFromUrl uploads fetched bytes or returns null', async () => {
      mockedFetchRemoteImage.mockResolvedValueOnce(null);
      await expect(service.importFromUrl(user.id, 'https://x.test/a.png')).resolves.toBeNull();

      mockedFetchRemoteImage.mockResolvedValueOnce({
        buffer: await png(),
        contentType: 'image/png',
      });
      const result = await service.importFromUrl(user.id, 'https://x.test/a.png');
      expect(result?.contentType).toBe('image/png');
    });

    it('canImportImageFromUrl reflects the remote fetch outcome', async () => {
      mockedFetchRemoteImage.mockResolvedValueOnce(null);
      await expect(service.canImportImageFromUrl('https://x.test')).resolves.toBe(false);
      mockedFetchRemoteImage.mockResolvedValueOnce({
        buffer: Buffer.from([1]),
        contentType: 'image/png',
      });
      await expect(service.canImportImageFromUrl('https://x.test')).resolves.toBe(true);
    });

    it('importFromGravatarEmail ignores invalid emails and delegates otherwise', async () => {
      await expect(service.importFromGravatarEmail(user.id, 'not-an-email')).resolves.toBeNull();
      mockedFetchRemoteImage.mockResolvedValueOnce(null);
      await expect(service.importFromGravatarEmail(user.id, 'a@b.com')).resolves.toBeNull();
      expect(mockedFetchRemoteImage).toHaveBeenCalledWith(
        expect.stringContaining('gravatar.com'),
        expect.anything(),
      );
    });
  });

  describe('payloads', () => {
    it('loadMediaPayload returns the original until a crop exists, then the crop', async () => {
      const { id } = await upload();
      const original = await service.loadMediaPayload(id);
      expect(original.contentType).toBe('image/png');

      await service.cropMedia(user.id, id, { x: 0, y: 0, width: 10, height: 10 });
      const cropped = await service.loadMediaPayload(id);
      expect((await sharp(cropped.buffer).metadata()).width).toBe(10);

      const stillOriginal = await service.loadOriginalPayload(id);
      expect((await sharp(stillOriginal.buffer).metadata()).width).toBe(40);
    });

    it('throws NotFound for missing rows or missing objects', async () => {
      await expect(service.loadMediaPayload(MISSING_ID)).rejects.toThrow(NotFoundException);
      await expect(service.loadOriginalPayload(MISSING_ID)).rejects.toThrow(NotFoundException);
      await expect(service.loadThumbnailPayload(MISSING_ID)).rejects.toThrow(
        'Media thumbnail not found',
      );

      const { id } = await upload();
      storage.objects.clear();
      await expect(service.loadMediaPayload(id)).rejects.toThrow('Media file unavailable');
      await expect(service.loadOriginalPayload(id)).rejects.toThrow('Media file unavailable');
      await expect(service.loadThumbnailPayload(id)).rejects.toThrow('Media thumbnail unavailable');
      await expect(service.ensureThumbnail(id)).rejects.toThrow('Media file unavailable');
    });

    it('maps an empty content type to application/octet-stream', async () => {
      const { id } = await upload();
      await ctx.db.update(media).set({ content_type: ' ' });
      await expect(service.loadMediaPayload(id)).resolves.toMatchObject({
        contentType: 'application/octet-stream',
      });
    });

    it('loadThumbnailPayload returns the WebP thumbnail', async () => {
      const { id } = await upload();
      const thumb = await service.loadThumbnailPayload(id);
      expect(thumb.contentType).toBe('image/webp');
      expect((await sharp(thumb.buffer).metadata()).format).toBe('webp');
    });
  });

  describe('cropMedia', () => {
    it('stores a cropped derivative, records the crop and refreshes the thumbnail', async () => {
      const { id } = await upload();
      const result = await service.cropMedia(user.id, id, { x: 1, y: 2, width: 20, height: 10 });

      expect(result).toEqual({ id, url: service.viewerUrlForId(id), contentType: 'image/webp' });
      expect(await rowFor(id)).toMatchObject({
        crop: { x: 1, y: 2, width: 20, height: 10 },
        cropped_storage_path: `${user.id}/${id}_cropped.webp`,
      });
      expect(storage.keys(BUCKET)).toContain(`${user.id}/${id}_cropped.webp`);

      // Re-cropping overwrites the same derivative.
      await service.cropMedia(user.id, id, { x: 0, y: 0, width: 5, height: 5 });
      expect(storage.keys(BUCKET)).toHaveLength(3);
    });

    it('rejects non-owners and missing media', async () => {
      const { id } = await upload();
      const crop = { x: 0, y: 0, width: 5, height: 5 };
      await expect(service.cropMedia(other.id, id, crop)).rejects.toThrow(ForbiddenException);
      await expect(service.cropMedia(user.id, MISSING_ID, crop)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFound when the original is gone and BadRequest when the upload fails', async () => {
      const { id } = await upload();
      const crop = { x: 0, y: 0, width: 5, height: 5 };
      jest.spyOn(storage, 'put').mockRejectedValueOnce(new Error('upload failed'));
      await expect(service.cropMedia(user.id, id, crop)).rejects.toThrow(
        new BadRequestException('upload failed'),
      );

      storage.objects.clear();
      await expect(service.cropMedia(user.id, id, crop)).rejects.toThrow('Media file unavailable');
    });

    it('removes a stale cropped object stored under a different path', async () => {
      const { id } = await upload();
      await storage.put(BUCKET, 'legacy/crop.webp', Buffer.from([1]), 'image/webp');
      await ctx.db.update(media).set({ cropped_storage_path: 'legacy/crop.webp' });

      await service.cropMedia(user.id, id, { x: 0, y: 0, width: 5, height: 5 });

      expect(storage.keys(BUCKET)).not.toContain('legacy/crop.webp');
    });
  });

  describe('ensureThumbnail', () => {
    it('throws NotFound for missing media and BadRequest when the upload fails', async () => {
      await expect(service.ensureThumbnail(MISSING_ID)).rejects.toThrow(NotFoundException);
      const { id } = await upload();
      jest.spyOn(storage, 'put').mockRejectedValueOnce(new Error('thumb failed'));
      await expect(service.ensureThumbnail(id)).rejects.toThrow(
        new BadRequestException('thumb failed'),
      );
    });

    it('replaces a thumbnail stored under a legacy path without touching the original', async () => {
      const { id } = await upload();
      await storage.put(BUCKET, 'legacy/thumb.webp', Buffer.from([1]), 'image/webp');
      await ctx.db.update(media).set({ thumbnail_storage_path: 'legacy/thumb.webp' });

      await service.ensureThumbnail(id);

      const row = await rowFor(id);
      expect(row?.thumbnail_storage_path).toBe(`${user.id}/${id}_thumb.webp`);
      expect(row?.storage_path).toBe(`${user.id}/${id}.png`);
      expect(storage.keys(BUCKET)).not.toContain('legacy/thumb.webp');
    });
  });

  describe('deleteMedia', () => {
    it('removes original, cropped and thumbnail objects plus the row', async () => {
      const { id } = await upload();
      await service.cropMedia(user.id, id, { x: 0, y: 0, width: 5, height: 5 });

      await service.deleteMedia(user.id, id);

      expect(storage.objects.size).toBe(0);
      expect(await rowFor(id)).toBeUndefined();
    });

    it('still deletes the row when storage cleanup fails', async () => {
      const { id } = await upload();
      const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      jest.spyOn(storage, 'remove').mockRejectedValueOnce(new Error('storage down'));

      await service.deleteMedia(user.id, id);

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('storage down'));
      expect(await rowFor(id)).toBeUndefined();
      warn.mockRestore();
    });

    it('rejects non-owners and missing media', async () => {
      const { id } = await upload();
      await expect(service.deleteMedia(other.id, id)).rejects.toThrow(ForbiddenException);
      await expect(service.deleteMedia(user.id, MISSING_ID)).rejects.toThrow(NotFoundException);
      expect(await rowFor(id)).toBeDefined();
    });
  });

  describe('getMediaMeta / listMediaForUser', () => {
    it('returns crop metadata for the owner only', async () => {
      const { id } = await upload();
      await expect(service.getMediaMeta(user.id, id)).resolves.toEqual({
        id,
        contentType: 'image/png',
        crop: null,
        hasCropped: false,
      });

      await service.cropMedia(user.id, id, { x: 0, y: 0, width: 5, height: 5 });
      await expect(service.getMediaMeta(user.id, id)).resolves.toMatchObject({
        crop: { x: 0, y: 0, width: 5, height: 5 },
        hasCropped: true,
      });

      await expect(service.getMediaMeta(other.id, id)).rejects.toThrow(ForbiddenException);
      await expect(service.getMediaMeta(user.id, MISSING_ID)).rejects.toThrow(NotFoundException);
    });

    it('lists the user’s media newest first', async () => {
      const first = await upload();
      const second = await upload();
      await upload(other);

      const list = await service.listMediaForUser(user.id);

      expect(list.map((m) => m.id).sort()).toEqual([first.id, second.id].sort());
      expect(list[0]).toMatchObject({ contentType: 'image/png', createdAt: expect.any(String) });
    });
  });
});
