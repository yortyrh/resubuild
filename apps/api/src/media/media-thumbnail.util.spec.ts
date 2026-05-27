import sharp from 'sharp';
import { buildThumbnailBuffer, MEDIA_THUMBNAIL_MAX_PX } from './media-thumbnail.util';

jest.mock('sharp', () => {
  const resizeFn = jest.fn().mockReturnThis();
  const webpFn = jest.fn().mockReturnThis();
  const toBufferFn = jest.fn().mockResolvedValue(Buffer.from([1]));
  const mockSharp = jest.fn(() => ({ resize: resizeFn, webp: webpFn, toBuffer: toBufferFn }));
  return { __esModule: true, default: mockSharp };
});

describe('media-thumbnail.util', () => {
  it('buildThumbnailBuffer resizes inside 150×150 and outputs webp', async () => {
    const source = Buffer.from([9, 9]);
    await buildThumbnailBuffer(source);

    expect(sharp).toHaveBeenCalledWith(source);
    const instance = jest.mocked(sharp).mock.results[0]?.value as {
      resize: jest.Mock;
      webp: jest.Mock;
    };
    expect(instance.resize).toHaveBeenCalledWith(
      MEDIA_THUMBNAIL_MAX_PX,
      MEDIA_THUMBNAIL_MAX_PX,
      expect.objectContaining({ fit: 'inside', withoutEnlargement: true }),
    );
    expect(instance.webp).toHaveBeenCalledWith({ quality: 85 });
  });
});
