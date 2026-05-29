import type { Resume } from '@resumind/types';
import { wrapDocument } from './primitives/document';
import { renderSections } from './primitives/sections';
import {
  type CvTemplatePresentationConfig,
  getDefaultPresentationConfig,
  mergePresentationConfig,
  visibleSectionOrder,
} from './template-config';
import type { HeaderStyle, HeadingStyle, RenderOptions, ResumeTemplate } from './types';

interface VisualTemplateDefinition {
  id: string;
  label: string;
  description: string;
  category: 'default' | 'design' | 'tabular' | 'compact';
  headingStyle: HeadingStyle;
  headerStyle: HeaderStyle;
  articlePadding?: string;
  extraStyles?: string;
}

const VISUAL_DEFINITIONS: VisualTemplateDefinition[] = [
  {
    id: 'classic',
    label: 'Classic',
    description: 'Centered header with ruled ALL-CAPS sections.',
    category: 'default',
    headingStyle: 'uppercase',
    headerStyle: 'centered',
  },
  {
    id: 'modern',
    label: 'Modern',
    description: 'Light typography with relaxed spacing for creative roles.',
    category: 'design',
    headingStyle: 'sentence',
    headerStyle: 'design',
    articlePadding: '0.6in',
    extraStyles:
      '.font-resume { letter-spacing: 0.02em; } h2 { font-weight: 300; letter-spacing: 0.08em; }',
  },
  {
    id: 'tabular',
    label: 'Tabular',
    description: 'Two-column header with sentence-case section titles.',
    category: 'tabular',
    headingStyle: 'sentence',
    headerStyle: 'tabular',
  },
  {
    id: 'left',
    label: 'Left aligned',
    description: 'Left-aligned header with uppercase section titles.',
    category: 'compact',
    headingStyle: 'uppercase',
    headerStyle: 'left',
  },
];

function renderWithDefinition(
  definition: VisualTemplateDefinition,
  resume: Resume,
  templateId: string,
  options?: RenderOptions,
): string {
  const title = resume?.basics?.name ? `${resume.basics.name} — Resume` : 'Resume';
  const defaults = getDefaultPresentationConfig(templateId);
  const presentation = mergePresentationConfig(defaults, options?.presentationConfig);
  const sectionOrder = visibleSectionOrder(presentation);

  const body = renderSections(
    resume,
    sectionOrder,
    {
      headingStyle: definition.headingStyle,
      headerStyle: definition.headerStyle,
      sectionLabels: presentation.sectionLabels,
      sidebarNote: presentation.sidebarNote,
      leadershipVolunteer: presentation.leadershipVolunteer,
      presentation,
    },
    { emphasizeInternational: presentation.sectionLabels?.education?.includes('Study Abroad') },
  );

  return wrapDocument({
    title,
    body,
    articleClass: [
      'resume-article max-w-[8.5in] mx-auto my-6 print:my-0 bg-white text-neutral-900 font-resume text-[11pt] leading-snug shadow-sm print:shadow-none text-pretty',
      options?.articleClass,
    ]
      .filter(Boolean)
      .join(' '),
    extraStyles: definition.extraStyles,
    dataTemplate: definition.id,
    articlePadding: definition.articlePadding,
  });
}

export const VISUAL_TEMPLATES: ResumeTemplate[] = VISUAL_DEFINITIONS.map((definition) => ({
  id: definition.id,
  label: definition.label,
  description: definition.description,
  category: definition.category,
  render(resume: Resume, options?: RenderOptions) {
    return renderWithDefinition(definition, resume, definition.id, options);
  },
}));

export function getPresentationConfigSchema(): {
  sectionKeys: string[];
  defaults: CvTemplatePresentationConfig;
} {
  return {
    sectionKeys: getDefaultPresentationConfig('classic').sectionOrder,
    defaults: getDefaultPresentationConfig('classic'),
  };
}
