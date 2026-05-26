import {
  BadRequestException,
  type CanActivate,
  type ExecutionContext,
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
  const cropMedia = jest.fn();
  const deleteMedia = jest.fn();
  const getMediaMeta = jest.fn();

  beforeEach(async () => {
    uploadObject.mockReset();
    loadMediaPayload.mockReset();
    cropMedia.mockReset();
    deleteMedia.mockReset();
    getMediaMeta.mockReset();

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
          useValue: { uploadObject, loadMediaPayload, cropMedia, deleteMedia, getMediaMeta },
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
