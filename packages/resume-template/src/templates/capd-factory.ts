import type { Resume } from '@resumind/types';
import { wrapDocument } from '../primitives/document';
import { escapeHtml } from '../primitives/html';
import { MIT_CLASSIC_SECTION_ORDER, renderSections } from '../primitives/sections';
import type { CapdTemplateConfig, RenderOptions, ResumeTemplate } from '../types';

export function createCapdTemplate(config: CapdTemplateConfig): ResumeTemplate {
  const extraStyles =
    config.headerStyle === 'design'
      ? '.font-resume { letter-spacing: 0.02em; } h2 { font-weight: 300; letter-spacing: 0.08em; }'
      : '';

  return {
    id: config.id,
    label: config.label,
    description: config.description,
    category: config.category,
    capdPage: config.capdPage,
    render(resume: Resume, options?: RenderOptions): string {
      const title = resume?.basics?.name ? `${resume.basics.name} — Resume` : 'Resume';
      const body = renderSections(
        resume,
        config.sectionOrder,
        {
          headingStyle: config.headingStyle,
          sectionLabels: config.sectionLabels,
          headerStyle: config.headerStyle,
          sidebarNote: config.sidebarNote,
          leadershipVolunteer: config.leadershipVolunteer,
        },
        { emphasizeInternational: config.id === 'capd-global' },
      );

      return wrapDocument({
        title,
        body,
        bodyClass: config.bodyClass,
        articleClass: [config.articleClass, options?.articleClass].filter(Boolean).join(' '),
        extraStyles,
        dataTemplate: config.id,
      });
    },
  };
}

export const mitClassicTemplate: ResumeTemplate = createCapdTemplate({
  id: 'mit-classic',
  label: 'MIT Classic',
  description: 'Centered header with ALL-CAPS ruled sections; experience before education.',
  category: 'default',
  sectionOrder: MIT_CLASSIC_SECTION_ORDER,
  headingStyle: 'uppercase',
  headerStyle: 'centered',
  sectionLabels: { summary: 'Summary' },
});

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
