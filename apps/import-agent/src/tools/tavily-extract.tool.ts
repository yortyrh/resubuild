import { validateScrapeUrl } from '../utils/validate-scrape-url';

export interface TavilyExtractInput {
  url: string;
  apiKey: string;
}

export interface TavilyExtractResult {
  url: string;
  format: 'markdown';
  content: string;
}

export type TavilyExtractFn = (url: string, apiKey: string) => Promise<{ content: string }>;

const defaultExtract: TavilyExtractFn = async (url, apiKey) => {
  const response = await fetch('https://api.tavily.com/extract', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      urls: [url],
      format: 'markdown',
      extract_depth: 'advanced',
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Tavily extract failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`,
    );
  }

  const body = (await response.json()) as {
    results?: Array<{ url?: string; raw_content?: string }>;
    failed_results?: Array<{ url?: string; error?: string }>;
  };

  const first = body.results?.[0];
  const content = first?.raw_content?.trim();
  if (!content) {
    const failed = body.failed_results?.[0];
    throw new Error(failed?.error ?? 'Tavily returned no content for this URL');
  }

  return { content };
};

export async function tavilyExtractTool(
  input: TavilyExtractInput,
  extractFn: TavilyExtractFn = defaultExtract,
): Promise<TavilyExtractResult> {
  const url = validateScrapeUrl(input.url);
  const { content } = await extractFn(url.toString(), input.apiKey);

  return {
    url: url.toString(),
    format: 'markdown',
    content,
  };
}
