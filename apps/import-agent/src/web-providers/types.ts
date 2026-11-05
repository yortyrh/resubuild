export type SearchProviderId = 'brave' | 'tavily' | 'firecrawl';
export type ExtractProviderId = 'firecrawl' | 'tavily';
export type WebProviderId = SearchProviderId | ExtractProviderId;

/** Deployment-wide API keys (server env). A provider without a key never takes part. */
export interface WebProviderKeys {
  tavily?: string;
  firecrawl?: string;
  brave?: string;
}

export interface SearchHit {
  url?: string;
  title?: string;
  summary?: string;
}

export interface ExtractedPage {
  url: string;
  format: 'markdown';
  content: string;
}

export type ProviderSearchFn = (
  query: string,
  apiKey: string,
  maxResults: number,
) => Promise<SearchHit[]>;

export type ProviderExtractFn = (url: string, apiKey: string) => Promise<{ content: string }>;

/** Non-2xx reply from a provider; `status` decides whether the provider is put on cooldown. */
export class ProviderHttpError extends Error {
  constructor(
    readonly provider: WebProviderId,
    readonly status: number,
    detail?: string,
  ) {
    super(`${provider} request failed (${status})${detail ? `: ${detail.slice(0, 200)}` : ''}`);
    this.name = 'ProviderHttpError';
  }
}

export async function throwProviderHttpError(
  provider: WebProviderId,
  response: Response,
): Promise<never> {
  const detail = await response.text().catch(() => '');
  throw new ProviderHttpError(provider, response.status, detail);
}

export const SEARCH_TIMEOUT_MS = 8_000;
export const EXTRACT_TIMEOUT_MS = 60_000;
