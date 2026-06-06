import type { Resume } from '@resubuild/types';
import { escapeHtml } from '../primitives/html';
import { getTemplate } from '../registry';
import type { ResumeTemplate } from '../types';

/** Shared sample resume for template tests. */
export const sampleResume: Resume = {
  basics: {
    name: 'Jane Doe',
    summary: 'Experienced engineer.',
  },
  work: [
    {
      name: 'Acme Corp',
      position: 'Senior Engineer',
      startDate: '2020-01',
      endDate: '2024-06',
    },
  ],
  education: [
    {
      institution: 'MIT',
      studyType: 'B.S.',
      area: 'Computer Science',
      startDate: '2014-09',
      endDate: '2018-06',
    },
  ],
  skills: [
    {
      name: 'Languages',
      keywords: ['TypeScript', 'Python'],
    },
  ],
};

export function assertTemplateRenders(template: ResumeTemplate): string {
  const html = template.render(sampleResume);
  if (!html.includes('<!DOCTYPE html>')) {
    throw new Error(`${template.id} did not produce a document`);
  }
  if (!html.includes(escapeHtml('Jane Doe'))) {
    throw new Error(`${template.id} missing basics name`);
  }
  return html;
}

export function assertTemplateIdRenders(templateId: string): string {
  const template = getTemplate(templateId);
  if (!template) {
    throw new Error(`Unknown template: ${templateId}`);
  }
  return assertTemplateRenders(template);
}
