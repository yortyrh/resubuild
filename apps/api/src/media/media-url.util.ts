const MEDIA_ID_FROM_URL =
  /\/media\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?:[/?#]|$)/i;

export function parseMediaIdFromViewerUrl(url: unknown): string | null {
  if (typeof url !== 'string' || !url.trim()) {
    return null;
  }
  const match = url.match(MEDIA_ID_FROM_URL);
  return match ? match[1] : null;
}
