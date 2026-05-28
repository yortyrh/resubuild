import type { Resume } from '@resumind/types';

export type TemplateCategory =
  | 'default'
  | 'first-year'
  | 'undergraduate'
  | 'design'
  | 'global'
  | 'masters'
  | 'phd'
  | 'alum';

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
  | 'references'
  | 'additionalInfo';

export interface RenderOptions {
  /** Extra CSS class on the article wrapper. */
  articleClass?: string;
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

export interface CapdTemplateConfig {
  id: string;
  label: string;
  description: string;
  category: TemplateCategory;
  capdPage?: number | string;
  sectionOrder: SectionKey[];
  headingStyle: HeadingStyle;
  headerStyle: HeaderStyle;
  sectionLabels?: Partial<Record<SectionKey, string>>;
  articleClass?: string;
  bodyClass?: string;
  sidebarNote?: string;
  /** When true, volunteer section uses "Leadership Experiences" label. */
  leadershipVolunteer?: boolean;
}
