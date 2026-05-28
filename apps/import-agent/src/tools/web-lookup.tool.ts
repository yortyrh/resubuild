export interface WebLookupInput {
  query: string;
  searchApiKey?: string;
}

export interface WebLookupResult {
  skipped: boolean;
  url?: string;
  summary?: string;
}

export type WebSearchFn = (
  query: string,
  apiKey: string,
) => Promise<{ url?: string; summary?: string }>;

const defaultSearch: WebSearchFn = async (query, apiKey) => {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: 1,
    }),
  });

  if (!response.ok) {
    throw new Error(`Web search failed (${response.status})`);
  }

  const body = (await response.json()) as {
    results?: Array<{ url?: string; content?: string }>;
  };

  const first = body.results?.[0];
  return {
    url: first?.url,
    summary: first?.content,
  };
};

export async function webLookupTool(
  input: WebLookupInput,
  searchFn: WebSearchFn = defaultSearch,
): Promise<WebLookupResult> {
  if (!input.searchApiKey?.trim()) {
    return { skipped: true };
  }

  const result = await searchFn(input.query, input.searchApiKey);
  return {
    skipped: false,
    url: result.url,
    summary: result.summary,
  };
}
