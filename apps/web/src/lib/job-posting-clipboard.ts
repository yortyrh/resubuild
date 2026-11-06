import type { JobApplicationSummary } from '@/lib/api';

export type JobPostingClipboardSource = Pick<
  JobApplicationSummary,
  'jobTitle' | 'jobCompany' | 'jobSourceUrl' | 'jobRawText'
>;

/**
 * Plain-text copy of the job posting, ready to paste into another chatbot:
 * `Position:` / `Company:` / `Source:` header lines (each only when set), a
 * blank line, then the posting text. Every value is trimmed; returns `''`
 * when there is nothing to copy.
 */
export function formatJobPostingPlainText(app: JobPostingClipboardSource): string {
  const headerLines: string[] = [];
  const title = app.jobTitle?.trim();
  const company = app.jobCompany?.trim();
  const sourceUrl = app.jobSourceUrl?.trim();
  if (title) headerLines.push(`Position: ${title}`);
  if (company) headerLines.push(`Company: ${company}`);
  if (sourceUrl) headerLines.push(`Source: ${sourceUrl}`);

  const header = headerLines.join('\n');
  const rawText = app.jobRawText?.trim() ?? '';

  if (!rawText) return header;
  if (!header) return rawText;
  return `${header}\n\n${rawText}`;
}
