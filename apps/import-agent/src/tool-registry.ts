import { discoverSocialProfilesTool } from './tools/discover-social-profiles.tool';
import { extractPdfTextTool } from './tools/extract-pdf-text.tool';
import { fetchHtmlTool } from './tools/fetch-html.tool';
import { normalizeDatesTool } from './tools/normalize-dates.tool';
import { validateResumeSchemaTool } from './tools/validate-resume-schema.tool';
import { webLookupTool } from './tools/web-lookup.tool';

export const toolRegistry = {
  extractPdfText: extractPdfTextTool,
  fetchHtml: fetchHtmlTool,
  validateResumeSchema: validateResumeSchemaTool,
  normalizeDates: normalizeDatesTool,
  webLookup: webLookupTool,
  discoverSocialProfiles: discoverSocialProfilesTool,
};

export type ToolRegistry = typeof toolRegistry;
