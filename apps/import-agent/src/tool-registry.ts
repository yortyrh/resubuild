import { extractPdfTextTool } from './tools/extract-pdf-text.tool';
import { fetchHtmlTool } from './tools/fetch-html.tool';
import { firecrawlScrapeTool } from './tools/firecrawl-scrape.tool';
import { normalizeDatesTool } from './tools/normalize-dates.tool';
import { tavilyExtractTool } from './tools/tavily-extract.tool';
import { validateResumeSchemaTool } from './tools/validate-resume-schema.tool';
import { webLookupTool } from './tools/web-lookup.tool';
import { discoverSocialProfilesTool } from './tools/discover-social-profiles.tool';

export const toolRegistry = {
  extractPdfText: extractPdfTextTool,
  fetchHtml: fetchHtmlTool,
  firecrawlScrape: firecrawlScrapeTool,
  tavilyExtract: tavilyExtractTool,
  validateResumeSchema: validateResumeSchemaTool,
  normalizeDates: normalizeDatesTool,
  webLookup: webLookupTool,
  discoverSocialProfiles: discoverSocialProfilesTool,
};

export type ToolRegistry = typeof toolRegistry;
