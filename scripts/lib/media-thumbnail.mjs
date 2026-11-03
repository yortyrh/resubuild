import sharp from 'sharp';

export const MEDIA_THUMBNAIL_MAX_PX = 150;

/**
 * @param {string} userId
 * @param {string} mediaId
 */
export function thumbnailStoragePathFor(userId, mediaId) {
  return `${userId}/${mediaId}_thumb.webp`;
}

/**
 * @param {Buffer} source
 * @returns {Promise<Buffer>}
 */
export function buildThumbnailBuffer(source) {
  return sharp(source)
    .resize(MEDIA_THUMBNAIL_MAX_PX, MEDIA_THUMBNAIL_MAX_PX, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 85 })
    .toBuffer();
}
