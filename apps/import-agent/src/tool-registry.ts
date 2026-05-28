import { extractPdfTextTool } from './tools/extract-pdf-text.tool';
import { normalizeDatesTool } from './tools/normalize-dates.tool';
import { validateResumeSchemaTool } from './tools/validate-resume-schema.tool';
import { webLookupTool } from './tools/web-lookup.tool';

export const toolRegistry = {
  extractPdfText: extractPdfTextTool,
  validateResumeSchema: validateResumeSchemaTool,
  normalizeDates: normalizeDatesTool,
  webLookup: webLookupTool,
};

export type ToolRegistry = typeof toolRegistry;
