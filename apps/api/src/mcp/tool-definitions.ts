/** MCP tool catalog metadata (descriptions + JSON-schema-shaped inputs for agents). */

export const MCP_TOOL_NAMES = [
  'list_cvs',
  'get_cv',
  'delete_cv',
  'create_cv_from_jsonresume',
  'replace_cv_from_jsonresume',
  'export_cv_jsonresume',
  'export_cv_html',
  'export_cv_screenshot',
  'export_cv_pdf',
  'list_cv_designs',
  'get_cv_template_presentation',
  'update_cv_template_presentation',
  'list_applications',
  'get_application',
  'update_application',
  'update_application_letter',
] as const;

export type McpToolName = (typeof MCP_TOOL_NAMES)[number];

export const MCP_EXCLUDED_TOOL_PATTERNS = [
  'update_cv',
  'ai_agent',
  'import',
  'search',
  'scrape',
  'prepare_application',
] as const;

const SECTION_KEYS_DOC =
  'Allowed section keys: summary, work, volunteer, education, awards, certificates, publications, skills, languages, interests, references, projects.';

export const MCP_TOOL_DEFINITIONS: Record<
  McpToolName,
  { description: string; destructiveHint?: boolean; readOnlyHint?: boolean }
> = {
  list_cvs: {
    description:
      'List primary CVs in the user library (newest first). Excludes application clones and in-progress import staging rows. Call this before choosing a cvId for other tools.',
    readOnlyHint: true,
  },
  get_cv: {
    description:
      'Load one CV in Resumind editor shape (basics + normalized sections with internal row ids). Use before tailoring content or to compare with export_cv_jsonresume. Does not return canonical JSON Resume.',
    readOnlyHint: true,
  },
  delete_cv: {
    description:
      'Permanently delete a primary CV and all of its sections. This cannot be undone. Prefer replace_cv_from_jsonresume when you want to swap content while keeping a single library entry flow.',
    destructiveHint: true,
  },
  create_cv_from_jsonresume: {
    description:
      'Create a new primary CV from a full JSON Resume document (https://jsonresume.org/schema/). The document is normalized and schema-validated. Returns the new cvId. Use export_cv_jsonresume on the result to verify canonical output.',
  },
  replace_cv_from_jsonresume: {
    description:
      'Replace an existing primary CV with a new JSON Resume document using an atomic staging swap (old id is removed; a new id is promoted). There is no per-section merge in MCP v1—provide the full document. Target must be kind=primary.',
    destructiveHint: true,
  },
  export_cv_jsonresume: {
    description:
      'Export canonical JSON Resume for LLMs and external tools: includes $schema and meta, strips Resumind-internal row ids. Prefer this over get_cv when reasoning about career content. Does not include rendered layout.',
    readOnlyHint: true,
  },
  export_cv_html: {
    description:
      'Export the full HTML document shown in the Resumind web preview (iframe srcDoc) for a template. Use for visual review or vision models. Differs from export_cv_jsonresume (rendered layout vs structured data). Respects saved template presentation.',
    readOnlyHint: true,
  },
  export_cv_screenshot: {
    description:
      'Export a PNG screenshot of the rendered CV. mode=first_page (default) captures one Letter-sized page; mode=full_document captures the entire document height. Use export_cv_pdf for print-ready PDF. Respects template presentation.',
    readOnlyHint: true,
  },
  export_cv_pdf: {
    description:
      'Export a PDF for the chosen template id (classic, modern, tabular, left) using saved presentation config. Returns base64-encoded PDF. Large exports may return 413 if over 10 MiB.',
    readOnlyHint: true,
  },
  list_cv_designs: {
    description:
      'List available CV template designs (classic, modern, tabular, left) with labels and metadata. Use before export_cv_pdf, export_cv_html, or presentation tools.',
    readOnlyHint: true,
  },
  get_cv_template_presentation: {
    description: `Read per-template presentation config: sectionOrder, hiddenSections, sectionLabels, and field visibility. ${SECTION_KEYS_DOC}`,
    readOnlyHint: true,
  },
  update_cv_template_presentation: {
    description: `Update per-template presentation (show/hide/reorder sections and field toggles). ${SECTION_KEYS_DOC} Changes affect subsequent HTML, screenshot, and PDF exports for that template.`,
  },
  list_applications: {
    description:
      'List job applications visible in the dashboard (active rows only; hidden update drafts are excluded).',
    readOnlyHint: true,
  },
  get_application: {
    description:
      'Load one job application with cover letter, job text, linked CV ids, and status. Read-only.',
    readOnlyHint: true,
  },
  update_application: {
    description:
      'Patch job application metadata fields (job title, company, job text, selection rationale, email subject, user message). Does not run AI refresh—use the web UI for prepare/update flows with LLM.',
  },
  update_application_letter: {
    description:
      'Update the cover letter markdown for a job application. Use get_application first to read the current letter. Does not trigger AI rewrites—only replaces stored markdown.',
  },
};

export const cvIdProperty = {
  cvId: {
    type: 'string',
    format: 'uuid',
    description: 'Primary CV id from list_cvs.',
  },
} as const;

export const templateProperty = {
  template: {
    type: 'string',
    description: 'Template id: classic, modern, tabular, or left.',
  },
} as const;
