/** Allowed MIME types for resume-owned uploads (Nest validates before forwarding to Storage). */
export const RESUME_UPLOAD_MIME_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export const RESUME_UPLOAD_MAX_BYTES_DEFAULT = 10 * 1024 * 1024;
