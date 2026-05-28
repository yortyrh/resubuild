export {
  DEFAULT_TEMPLATE_ID,
  getTemplate,
  isValidTemplateId,
  listTemplates,
  registerTemplate,
  TEMPLATE_IDS,
  toMeta,
} from './registry';
export { renderMarkdownField } from './render-markdown-field';
export { PDF_EXPORT_OPTIONS, renderResumeHtml } from './render-resume-html';
export type {
  CapdTemplateConfig,
  HeaderStyle,
  HeadingStyle,
  RenderOptions,
  ResumeTemplate,
  ResumeTemplateMeta,
  SectionKey,
  TemplateCategory,
} from './types';
