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
  'fetch_export_url',
  'list_cv_designs',
  'get_cv_template_presentation',
  'update_cv_template_presentation',
  'list_applications',
  'get_application',
  'update_application',
  'update_application_letter',
  'list_media',
  'get_media_url',
  'delete_media',
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
      'Export canonical JSON Resume for LLMs and external tools. Returns a URL envelope { exportId, url, expiresAt, expiresInSeconds, filename, contentType, sizeBytes, kind: "jsonresume" } (default TTL: 1h). The `url` is a Supabase Storage signed URL with a `?token=…` query parameter that authenticates the request at the storage layer; open it in a browser tab, `curl <url> -o cv.json`, or `fetch(url).then(r => r.json())` — the response carries `Content-Type: application/json; charset=utf-8`. The envelope also includes a `document` field with the parsed JSON Resume (includes $schema and meta, strips Resumind-internal row ids) so you can reason about it inline without an extra fetch. Use `fetch_export_url` to refresh the URL before it expires. Treat the URL as a secret until it expires.',
    readOnlyHint: true,
  },
  export_cv_html: {
    description:
      'Export the full HTML document shown in the Resumind web preview for a template. Returns a URL envelope { exportId, url, expiresAt, expiresInSeconds, filename, contentType: "text/html; charset=utf-8", sizeBytes, kind: "html", templateId } (default TTL: 1h). The `url` is a Supabase Storage signed URL with a `?token=…` query parameter that authenticates the request at the storage layer; open it in a browser tab to render the complete CV, or `curl <url> -o cv.html` to save it locally. The HTML body is NOT returned inline. Use `fetch_export_url` to refresh the URL before it expires. Treat the URL as a secret until it expires.',
    readOnlyHint: true,
  },
  export_cv_screenshot: {
    description:
      'Export a PNG screenshot of the rendered CV. mode=first_page (default) captures one Letter-sized page; mode=full_document captures the entire document height. Returns a URL envelope { exportId, url, expiresAt, expiresInSeconds, filename, contentType: "image/png", sizeBytes, kind: "screenshot", templateId, mode } (default TTL: 1h). The `url` is a Supabase Storage signed URL with a `?token=…` query parameter that authenticates the request at the storage layer; open it in a browser to preview, or `curl <url> -o cv.png` to save the PNG locally. Use export_cv_pdf for print-ready PDF. Use `fetch_export_url` to refresh the URL. Treat the URL as a secret until it expires.',
    readOnlyHint: true,
  },
  export_cv_pdf: {
    description:
      'Export a PDF for the chosen template id (classic, modern, tabular, left) using saved presentation config. Returns a URL envelope { exportId, url, expiresAt, expiresInSeconds, filename, contentType: "application/pdf", sizeBytes, kind: "pdf", templateId } (default TTL: 1h). The `url` is a Supabase Storage signed URL with a `?token=…` query parameter that authenticates the request at the storage layer; open it in a browser/PDF viewer to preview, or `curl <url> -o cv.pdf` to save the PDF locally. Large exports return 413 if over 10 MiB. Use `fetch_export_url` to refresh the URL. Treat the URL as a secret until it expires.',
    readOnlyHint: true,
  },
  fetch_export_url: {
    description:
      'Re-issue a signed URL for a previously generated MCP export without re-rendering the CV. Accepts { exportId, ttlSeconds? } where ttlSeconds is clamped to [60, 86400] (default: MCP_EXPORT_TTL_SECONDS, typically 3600 = 1h). Returns the same envelope shape as the export_cv_* tools, with a fresh `url` (a new Supabase Storage signed URL with `?token=…`) and updated `expiresAt`. Returns 404 if the exportId is unknown or has already been swept. The fresh URL behaves identically to the original — browsers, curl, fetch, etc. can all consume it directly without any extra API-host auth header.',
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
  list_media: {
    description:
      'List all media files uploaded by the user. Returns id, contentType, createdAt, and viewer URL for each file. Use to find mediaId values.',
    readOnlyHint: true,
  },
  get_media_url: {
    description:
      'Get the viewer URL and metadata for a specific media file by its id. The URL can be used to embed the file (images, PDFs) in documents or responses.',
    readOnlyHint: true,
    destructiveHint: false,
  },
  delete_media: {
    description:
      'Permanently delete a media file and all its storage objects (original, cropped, thumbnail). This cannot be undone.',
    destructiveHint: true,
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
