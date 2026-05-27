import {
  BadRequestException,
  type CanActivate,
  type ExecutionContext,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

describe('MediaController', () => {
  let controller: MediaController;
  const uploadObject = jest.fn();
  const loadMediaPayload = jest.fn();
  const loadThumbnailPayload = jest.fn();
  const loadOriginalPayload = jest.fn();
  const cropMedia = jest.fn();
  const deleteMedia = jest.fn();
  const getMediaMeta = jest.fn();
  const importFromUrl = jest.fn();
  const importFromGravatarEmail = jest.fn();
  const canImportImageFromUrl = jest.fn();

  beforeEach(async () => {
    uploadObject.mockReset();
    loadMediaPayload.mockReset();
    loadThumbnailPayload.mockReset();
    loadOriginalPayload.mockReset();
    cropMedia.mockReset();
    deleteMedia.mockReset();
    getMediaMeta.mockReset();
    importFromUrl.mockReset();
    importFromGravatarEmail.mockReset();
    canImportImageFromUrl.mockReset();

    const alwaysAuthGuard: CanActivate = {
      canActivate: (ctx: ExecutionContext) => {
        const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
        req.user = { id: 'user-test-1', accessToken: 't', email: 'example@example.com' };
        return true;
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [
        {
          provide: MediaService,
          useValue: {
            uploadObject,
            loadMediaPayload,
            loadThumbnailPayload,
            loadOriginalPayload,
            cropMedia,
            deleteMedia,
            getMediaMeta,
            importFromUrl,
            importFromGravatarEmail,
            canImportImageFromUrl,
          },
        },
      ],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue(alwaysAuthGuard)
      .compile();

    controller = module.get(MediaController);
  });

  const sampleFile = {
    fieldname: 'file',
    originalname: 'a.png',
    encoding: '7bit',
    mimetype: 'image/png',
    buffer: Buffer.from([1, 2, 3]),
    size: 3,
  } as unknown as Express.Multer.File;

  it('delegates multipart file to MediaService.uploadObject', async () => {
    uploadObject.mockResolvedValue({
      id: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
      url: 'https://api.example.com/media/aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
      contentType: 'image/png',
    });

    const req = {
      user: { id: 'user-test-1', accessToken: 't', email: 'example@example.com' },
    } as AuthenticatedRequest;

    await expect(controller.upload(req, sampleFile)).resolves.toEqual({
      id: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
      url: 'https://api.example.com/media/aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
      contentType: 'image/png',
    });

    expect(uploadObject).toHaveBeenCalledWith('user-test-1', sampleFile);
  });

  it('delegates import-url body to MediaService.importFromUrl', async () => {
    importFromUrl.mockResolvedValue({
      id: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
      url: 'https://api.example.com/media/aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
      contentType: 'image/png',
    });

    const req = {
      user: { id: 'user-test-1', accessToken: 't', email: 'example@example.com' },
    } as AuthenticatedRequest;

    await expect(
      controller.importFromUrl(req, { url: 'https://cdn.example.com/photo.png' }),
    ).resolves.toEqual({
      id: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
      url: 'https://api.example.com/media/aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
      contentType: 'image/png',
    });

    expect(importFromUrl).toHaveBeenCalledWith('user-test-1', 'https://cdn.example.com/photo.png');
  });

  it('returns 404 when import-url finds no image', async () => {
    importFromUrl.mockResolvedValue(null);
    const req = {
      user: { id: 'user-test-1', accessToken: 't', email: 'example@example.com' },
    } as AuthenticatedRequest;

    await expect(
      controller.importFromUrl(req, { url: 'https://cdn.example.com/missing.png' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('delegates import-url check to MediaService.canImportImageFromUrl', async () => {
    canImportImageFromUrl.mockResolvedValue(true);

    await expect(
      controller.checkImportUrl({ url: 'https://cdn.example.com/photo.png' }),
    ).resolves.toEqual({ importable: true });

    expect(canImportImageFromUrl).toHaveBeenCalledWith('https://cdn.example.com/photo.png');
  });

  it('returns 404 when import-gravatar finds no avatar', async () => {
    importFromGravatarEmail.mockResolvedValue(null);
    const req = {
      user: { id: 'user-test-1', accessToken: 't', email: 'example@example.com' },
    } as AuthenticatedRequest;

    await expect(
      controller.importFromGravatar(req, { email: 'jane@example.com' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('delegates import-gravatar body to MediaService.importFromGravatarEmail', async () => {
    importFromGravatarEmail.mockResolvedValue({
      id: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
      url: 'https://api.example.com/media/aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
      contentType: 'image/png',
    });

    const req = {
      user: { id: 'user-test-1', accessToken: 't', email: 'example@example.com' },
    } as AuthenticatedRequest;

    await expect(
      controller.importFromGravatar(req, { email: 'jane@example.com' }),
    ).resolves.toMatchObject({ contentType: 'image/png' });

    expect(importFromGravatarEmail).toHaveBeenCalledWith('user-test-1', 'jane@example.com');
  });

  it('streams media by id via MediaService.loadMediaPayload', async () => {
    const buffer = Buffer.from([9, 8, 7]);
    loadMediaPayload.mockResolvedValue({
      buffer,
      contentType: 'image/jpeg',
    });

    const id = '123e4567-e89b-12d3-a456-426614174000';

    await expect(controller.stream(id)).resolves.toBeInstanceOf(StreamableFile);
    expect(loadMediaPayload).toHaveBeenCalledWith(id);
  });

  it('rejects upload when file part is missing', () => {
    const req = {
      user: { id: 'user-test-1', accessToken: 't', email: 'example@example.com' },
    } as AuthenticatedRequest;

    expect(() => controller.upload(req)).toThrow(BadRequestException);
    expect(uploadObject).not.toHaveBeenCalled();
  });

  it('delegates crop body to MediaService.cropMedia', async () => {
    const id = '123e4567-e89b-12d3-a456-426614174000';
    const crop = { x: 0, y: 0, width: 100, height: 100 };
    cropMedia.mockResolvedValue({
      id,
      url: `https://api.example.com/media/${id}`,
      contentType: 'image/webp',
    });

    const req = {
      user: { id: 'user-test-1', accessToken: 't', email: 'example@example.com' },
    } as AuthenticatedRequest;

    await expect(controller.crop(req, id, crop)).resolves.toMatchObject({ id });
    expect(cropMedia).toHaveBeenCalledWith('user-test-1', id, crop);
  });

  it('delegates delete to MediaService.deleteMedia', async () => {
    const id = '123e4567-e89b-12d3-a456-426614174000';
    deleteMedia.mockResolvedValue(undefined);

    const req = {
      user: { id: 'user-test-1', accessToken: 't', email: 'example@example.com' },
    } as AuthenticatedRequest;

    await expect(controller.delete(req, id)).resolves.toBeUndefined();
    expect(deleteMedia).toHaveBeenCalledWith('user-test-1', id);
  });

  it('streams original bytes via MediaService.loadOriginalPayload', async () => {
    const id = '123e4567-e89b-12d3-a456-426614174000';
    loadOriginalPayload.mockResolvedValue({
      buffer: Buffer.from([9, 8, 7]),
      contentType: 'image/png',
    });

    const result = await controller.streamOriginal(id);

    expect(result).toBeInstanceOf(StreamableFile);
    expect(loadOriginalPayload).toHaveBeenCalledWith(id);
  });

  it('streams thumbnail bytes via MediaService.loadThumbnailPayload', async () => {
    const id = '123e4567-e89b-12d3-a456-426614174000';
    loadThumbnailPayload.mockResolvedValue({
      buffer: Buffer.from([1, 2, 3]),
      contentType: 'image/webp',
    });

    const result = await controller.streamThumbnail(id);

    expect(result).toBeInstanceOf(StreamableFile);
    expect(loadThumbnailPayload).toHaveBeenCalledWith(id);
  });

  it('delegates meta lookup to MediaService.getMediaMeta', async () => {
    const id = '123e4567-e89b-12d3-a456-426614174000';
    getMediaMeta.mockResolvedValue({
      id,
      contentType: 'image/png',
      crop: null,
      hasCropped: false,
    });

    const req = {
      user: { id: 'user-test-1', accessToken: 't', email: 'example@example.com' },
    } as AuthenticatedRequest;

    await expect(controller.meta(req, id)).resolves.toMatchObject({ id, hasCropped: false });
    expect(getMediaMeta).toHaveBeenCalledWith('user-test-1', id);
  });
});
