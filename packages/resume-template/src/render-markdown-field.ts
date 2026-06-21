import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'strong',
    'em',
    'b',
    'i',
    'ul',
    'ol',
    'li',
    'a',
    'code',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'rel'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
};

/** Render Markdown-authored CV field text to sanitized HTML for export. */
export function renderMarkdownField(value: string | undefined | null): string {
  if (!value?.trim()) return '';
  const parsed = marked.parse(value, { async: false });
  const raw = typeof parsed === 'string' ? parsed : '';
  return sanitizeHtml(raw, SANITIZE_OPTIONS);
}
