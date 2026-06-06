import { validateScrapeUrl } from '../utils/validate-scrape-url';

export const MAX_HTML_BYTES = 512 * 1024;

export interface FetchHtmlInput {
  url: string;
}

export interface FetchHtmlResult {
  url: string;
  format: 'html';
  content: string;
  truncated: boolean;
}

export async function fetchHtmlTool(input: FetchHtmlInput): Promise<FetchHtmlResult> {
  const url = validateScrapeUrl(input.url);

  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(15_000),
    headers: {
      Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'ResubuildWebsiteImport/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch page (${response.status} ${response.statusText})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const truncated = buffer.length > MAX_HTML_BYTES;
  const slice = truncated ? buffer.subarray(0, MAX_HTML_BYTES) : buffer;

  return {
    url: url.toString(),
    format: 'html',
    content: slice.toString('utf8'),
    truncated,
  };
}
