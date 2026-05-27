import { createHash } from 'node:crypto';

const GRAVATAR_SIZE_PX = 512;

/**
 * Gravatar avatar URL with `d=404` so missing avatars return HTTP 404.
 * @see https://docs.gravatar.com/api/avatars/images/
 */
export function buildGravatarImageUrl(email: string, size = GRAVATAR_SIZE_PX): string | null {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) {
    return null;
  }

  const hash = createHash('md5').update(normalized, 'utf8').digest('hex');
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=404`;
}
