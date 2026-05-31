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

function slugifyExportFilenameSegment(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const slug = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || null;
}

/** Cover letter PDF filename: `{company}-{name}-{label}.pdf` with missing parts omitted. */
export function buildCoverLetterExportFilename(parts: {
  company?: string | null;
  name?: string | null;
  label?: string | null;
}): string {
  const segments = [
    slugifyExportFilenameSegment(parts.company),
    slugifyExportFilenameSegment(parts.name),
    slugifyExportFilenameSegment(parts.label),
  ].filter((segment): segment is string => segment != null);

  const base = segments.length > 0 ? segments.join('-') : 'cover-letter';
  return `${base}.pdf`;
}
