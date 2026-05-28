import { mitClassicTemplate } from './templates/capd-factory';
import { ALL_CAPD_TEMPLATES } from './templates/capd-templates';
import type { ResumeTemplate, ResumeTemplateMeta } from './types';

const BUILTIN_TEMPLATES: ResumeTemplate[] = [mitClassicTemplate, ...ALL_CAPD_TEMPLATES];

const registry = new Map<string, ResumeTemplate>();

for (const template of BUILTIN_TEMPLATES) {
  registry.set(template.id, template);
}

export const DEFAULT_TEMPLATE_ID = 'mit-classic';

export const TEMPLATE_IDS = Object.freeze([...registry.keys()] as string[]);

export function registerTemplate(template: ResumeTemplate): void {
  registry.set(template.id, template);
}

export function getTemplate(id: string): ResumeTemplate | undefined {
  return registry.get(id);
}

export function isValidTemplateId(id: string): boolean {
  return registry.has(id);
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
    capdPage: template.capdPage,
  };
}

export { mitClassicTemplate } from './templates/capd-factory';
