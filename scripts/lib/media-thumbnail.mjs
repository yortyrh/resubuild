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

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} bucket
 * @param {string} mediaId
 */
/**
 * Writes only `thumbnail_storage_path`; never modifies `storage_path` or `cropped_storage_path`.
 */
export async function ensureMediaThumbnail(admin, bucket, mediaId) {
  const { data: row, error: rowError } = await admin
    .from('media')
    .select('user_id, storage_path, cropped_storage_path, thumbnail_storage_path')
    .eq('id', mediaId)
    .maybeSingle();

  if (rowError) {
    throw new Error(`Media lookup failed for thumbnail: ${rowError.message}`);
  }
  if (!row?.storage_path || !row.user_id) {
    throw new Error(`Media not found for thumbnail: ${mediaId}`);
  }

  const servePath = row.cropped_storage_path || row.storage_path;
  const { data: blob, error: downloadError } = await admin.storage.from(bucket).download(servePath);

  if (downloadError || !blob) {
    throw new Error(
      `Thumbnail source download failed for ${mediaId}: ${downloadError?.message ?? 'empty blob'}`,
    );
  }

  const sourceBuffer = Buffer.from(await blob.arrayBuffer());
  const thumbBuffer = await buildThumbnailBuffer(sourceBuffer);
  const thumbPath = thumbnailStoragePathFor(row.user_id, mediaId);

  if (row.thumbnail_storage_path) {
    await admin.storage
      .from(bucket)
      .remove([row.thumbnail_storage_path])
      .catch(() => {});
  }

  const { error: uploadError } = await admin.storage.from(bucket).upload(thumbPath, thumbBuffer, {
    contentType: 'image/webp',
    upsert: true,
  });

  if (uploadError) {
    throw new Error(`Thumbnail upload failed for ${mediaId}: ${uploadError.message}`);
  }

  const { error: updateError } = await admin
    .from('media')
    .update({ thumbnail_storage_path: thumbPath })
    .eq('id', mediaId);

  if (updateError) {
    throw new Error(`Thumbnail registry update failed for ${mediaId}: ${updateError.message}`);
  }
}
