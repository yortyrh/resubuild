import type { Resume } from '@resumind/types';
import { DEFAULT_TEMPLATE_ID, getTemplate } from './registry';
import type { RenderOptions } from './types';

/** Render a full HTML document using the requested template, falling back to mit-classic. */
export function renderResumeHtml(
  resume: Resume,
  templateId: string = DEFAULT_TEMPLATE_ID,
  options?: RenderOptions,
): string {
  const template = getTemplate(templateId) ?? getTemplate(DEFAULT_TEMPLATE_ID);
  if (!template) {
    throw new Error('No resume templates registered');
  }
  return template.render(resume, options);
}

export { PDF_EXPORT_OPTIONS } from './primitives/document';
