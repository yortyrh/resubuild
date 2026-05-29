import {
  getDefaultPresentationConfig,
  isKnownTemplateId,
  LEGACY_TO_CANONICAL_TEMPLATE,
  resolveCanonicalTemplateId,
} from './template-config';
import type { ResumeTemplate, ResumeTemplateMeta } from './types';
import { VISUAL_TEMPLATES } from './visual-templates';

const registry = new Map<string, ResumeTemplate>();

for (const template of VISUAL_TEMPLATES) {
  registry.set(template.id, template);
}

export const DEFAULT_TEMPLATE_ID = 'classic';

export const TEMPLATE_IDS = Object.freeze([...registry.keys()] as string[]);

export function registerTemplate(template: ResumeTemplate): void {
  registry.set(template.id, template);
}

export function getTemplate(id: string): ResumeTemplate | undefined {
  const canonical = resolveCanonicalTemplateId(id);
  return registry.get(canonical);
}

export function isValidTemplateId(id: string): boolean {
  return isKnownTemplateId(id);
}

export function listTemplates(): ResumeTemplateMeta[] {
  return [...registry.values()].map(toMeta);
}

export function toMeta(template: ResumeTemplate): ResumeTemplateMeta {
  return {
    id: template.id,
    label: template.label,
    description: template.description,
    category: template.category,
  };
}

export { getDefaultPresentationConfig, LEGACY_TO_CANONICAL_TEMPLATE, resolveCanonicalTemplateId };
