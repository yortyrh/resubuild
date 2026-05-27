import sharp from 'sharp';

export const MEDIA_THUMBNAIL_MAX_PX = 150;

export function thumbnailStoragePathFor(userId: string, mediaId: string): string {
  return `${userId}/${mediaId}_thumb.webp`;
}

export function buildThumbnailBuffer(source: Buffer): Promise<Buffer> {
  return sharp(source)
    .resize(MEDIA_THUMBNAIL_MAX_PX, MEDIA_THUMBNAIL_MAX_PX, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 85 })
    .toBuffer();
}
