/** Rewrite relative API media paths to absolute URLs for headless PDF rendering. */
export function toAbsoluteMediaUrl(
  image: string | undefined | null,
  apiOrigin: string,
): string | undefined {
  if (!image?.trim()) return undefined;
  const trimmed = image.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const base = apiOrigin.replace(/\/$/, '');
  if (trimmed.startsWith('/')) return `${base}${trimmed}`;
  return `${base}/${trimmed}`;
}

/** Filesystem-safe slug for PDF download filenames. */
export function slugifyExportFilename(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'resume';
}
