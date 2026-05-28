export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function normalizeUrl(url: string | undefined): string | null {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function formatIsoDate(value: string | undefined): string {
  if (!value) return '';
  const match = String(value).match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);
  if (!match) return escapeHtml(value);
  const [, year, month] = match;
  if (!month) return year ?? '';
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function formatDateRange(startDate: string | undefined, endDate: string | undefined): string {
  const start = formatIsoDate(startDate);
  const end = endDate ? formatIsoDate(endDate) : 'Present';
  if (!start && !endDate) return '';
  if (!start) return end;
  return `${start} – ${end}`;
}

export function hasItems<T>(array: T[] | undefined): array is T[] {
  return Array.isArray(array) && array.length > 0;
}
