export {
  DEFAULT_TEMPLATE_ID,
  getDefaultPresentationConfig,
  getTemplate,
  isValidTemplateId,
  LEGACY_TO_CANONICAL_TEMPLATE,
  listTemplates,
  registerTemplate,
  resolveCanonicalTemplateId,
  TEMPLATE_IDS,
  toMeta,
} from './registry';
export { renderMarkdownField } from './render-markdown-field';
export { PDF_EXPORT_OPTIONS, renderResumeHtml } from './render-resume-html';
export type {
  BasicsFieldVisibility,
  CanonicalTemplateId,
  CvTemplatePresentationConfig,
  EducationFieldVisibility,
  ProjectFieldVisibility,
  WorkFieldVisibility,
} from './template-config';
export {
  ALL_SECTION_KEYS,
  CANONICAL_TEMPLATE_IDS,
  createDefaultPresentationConfig,
  mergePresentationConfig,
  visibleSectionOrder,
} from './template-config';
export { assertTemplateRenders, sampleResume } from './templates/capd-factory';
export type {
  HeaderStyle,
  HeadingStyle,
  RenderOptions,
  ResumeTemplate,
  ResumeTemplateMeta,
  SectionKey,
  TemplateCategory,
} from './types';
