/** Collapse runs of spaces/tabs without touching newlines. */
function collapseHorizontalSpaces(text: string): string {
  return text.replace(/[^\S\n]+/g, ' ');
}

/**
 * Normalize common LLM typography (em dashes, curly quotes, ellipsis, etc.)
 * to plain ASCII-friendly punctuation for stored user-facing text.
 */
export function sanitizeAiTypography(text: string): string {
  if (!text) return text;

  return collapseHorizontalSpaces(
    text
      .replace(/[\u2014\u2015]/g, ' - ')
      .replace(/\u2013/g, '-')
      .replace(/[\u2012\u2212]/g, '-')
      .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
      .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
      .replace(/[\u00AB\u00BB]/g, '"')
      .replace(/\u2026/g, '...')
      .replace(/[\u00A0\u202F]/g, ' ')
      .replace(/[\u200B-\u200D\uFEFF]/g, ''),
  );
}

/** Recursively sanitize every string in JSON-like LLM output (e.g. resume drafts). */
export function sanitizeAiTypographyDeep<T>(value: T): T {
  if (typeof value === 'string') {
    return sanitizeAiTypography(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAiTypographyDeep(item)) as T;
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      result[key] = sanitizeAiTypographyDeep(entry);
    }
    return result as T;
  }

  return value;
}
