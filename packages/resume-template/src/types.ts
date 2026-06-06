import type { Resume } from '@resubuild/types';

export type TemplateCategory = 'default' | 'design' | 'tabular' | 'compact';

export type HeadingStyle = 'uppercase' | 'sentence';
export type HeaderStyle = 'centered' | 'tabular' | 'left' | 'icons' | 'design';

export type SectionKey =
  | 'summary'
  | 'work'
  | 'volunteer'
  | 'education'
  | 'skills'
  | 'projects'
  | 'awards'
  | 'certificates'
  | 'publications'
  | 'languages'
  | 'interests'
  | 'references';

import type { CvTemplatePresentationConfig } from './template-config';

export interface RenderOptions {
  /** Extra CSS class on the article wrapper. */
  articleClass?: string;
  /** Section order, visibility, labels, and per-field display toggles. */
  presentationConfig?: CvTemplatePresentationConfig;
}

export interface ResumeTemplate {
  id: string;
  label: string;
  description: string;
  category: TemplateCategory;
  capdPage?: number | string;
  render(resume: Resume, options?: RenderOptions): string;
}

export interface ResumeTemplateMeta {
  id: string;
  label: string;
  description: string;
  category: TemplateCategory;
  capdPage?: number | string;
}
