export function buildFallbackEmailSubject(
  jobTitle?: string | null,
  jobCompany?: string | null,
): string {
  const title = jobTitle?.trim() || 'Role';
  const company = jobCompany?.trim();
  if (company && company !== 'Company') {
    return `Application — ${title} at ${company}`;
  }
  return `Application — ${title}`;
}

export function resolveCoverLetterEmailSubject(
  storedSubject: string | null | undefined,
  jobTitle?: string | null,
  jobCompany?: string | null,
): string {
  const trimmed = storedSubject?.trim();
  if (trimmed) return trimmed;
  return buildFallbackEmailSubject(jobTitle, jobCompany);
}

export function formatCoverLetterPlainText(emailSubject: string, letter: string): string {
  return `Email subject: ${emailSubject}\n\n${letter}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Strip document wrapper so clipboard paste does not include the page title. */
export function extractLetterBodyHtml(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch?.[1]) {
    return bodyMatch[1].trim();
  }
  return html.trim();
}

export function formatCoverLetterHtmlForClipboard(emailSubject: string, html: string): string {
  const body = extractLetterBodyHtml(html);
  const subjectBlock = `<p><strong>Email subject:</strong> ${escapeHtml(emailSubject)}</p><hr style="border:none;border-top:1px solid #ccc;margin:1.5rem 0" />`;
  return `${subjectBlock}${body}`;
}
