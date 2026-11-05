import type { SearchHit } from '../web-providers/types';

export interface WebLookupInput {
  query: string;
  /** Web search (the deployment's provider pool). The lookup is skipped without it. */
  search?: (query: string, maxResults: number) => Promise<SearchHit[]>;
}

export interface WebLookupResult {
  skipped: boolean;
  url?: string;
  summary?: string;
}

export async function webLookupTool(input: WebLookupInput): Promise<WebLookupResult> {
  if (!input.search) {
    return { skipped: true };
  }

  const [first] = await input.search(input.query, 1);
  return {
    skipped: false,
    url: first?.url,
    summary: first?.summary,
  };
}
