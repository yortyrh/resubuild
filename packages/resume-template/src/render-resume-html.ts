import type { Resume } from '@resumind/types';
import { DEFAULT_TEMPLATE_ID, getTemplate } from './registry';
import {
  getDefaultPresentationConfig,
  mergePresentationConfig,
  resolveCanonicalTemplateId,
} from './template-config';
import type { RenderOptions } from './types';

/** Render a full HTML document using the requested template, falling back to classic. */
export function renderResumeHtml(
  resume: Resume,
  templateId: string = DEFAULT_TEMPLATE_ID,
  options?: RenderOptions,
): string {
  const canonicalId = resolveCanonicalTemplateId(templateId);
  const template = getTemplate(canonicalId) ?? getTemplate(DEFAULT_TEMPLATE_ID);
  if (!template) {
    throw new Error('No resume templates registered');
  }
  const defaults = getDefaultPresentationConfig(templateId);
  const presentationConfig = mergePresentationConfig(defaults, options?.presentationConfig);
  return template.render(resume, { ...options, presentationConfig });
}

export { PDF_EXPORT_OPTIONS } from './primitives/document';
