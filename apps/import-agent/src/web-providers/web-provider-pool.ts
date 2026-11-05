import { validateScrapeUrl } from '../utils/validate-scrape-url';
import { braveSearch } from './brave';
import { firecrawlScrape, firecrawlSearch } from './firecrawl';
import { tavilyExtract, tavilySearch } from './tavily';
import {
  type ExtractedPage,
  type ExtractProviderId,
  type ProviderExtractFn,
  ProviderHttpError,
  type ProviderSearchFn,
  type SearchHit,
  type SearchProviderId,
  type WebProviderId,
  type WebProviderKeys,
} from './types';

/** Statuses that mean "no credit / rate-limited / key rejected": skip the provider for a while. */
const COOLDOWN_STATUSES = new Set([401, 402, 403, 429, 432, 433]);
export const DEFAULT_PROVIDER_COOLDOWN_MS = 10 * 60 * 1000;

const SEARCH_ORDER: SearchProviderId[] = ['brave', 'tavily', 'firecrawl'];
const EXTRACT_ORDER: ExtractProviderId[] = ['firecrawl', 'tavily'];

const DEFAULT_SEARCH_FNS: Record<SearchProviderId, ProviderSearchFn> = {
  brave: braveSearch,
  tavily: tavilySearch,
  firecrawl: firecrawlSearch,
};

const DEFAULT_EXTRACT_FNS: Record<ExtractProviderId, ProviderExtractFn> = {
  firecrawl: firecrawlScrape,
  tavily: tavilyExtract,
};

export interface WebProviderPoolLogger {
  log?(message: string): void;
  warn?(message: string): void;
}

export interface WebProviderPoolOptions {
  now?: () => number;
  cooldownMs?: number;
  searchFns?: Partial<Record<SearchProviderId, ProviderSearchFn>>;
  extractFns?: Partial<Record<ExtractProviderId, ProviderExtractFn>>;
  logger?: WebProviderPoolLogger;
}

export interface WebProviderPool {
  readonly searchProviders: readonly SearchProviderId[];
  readonly extractProviders: readonly ExtractProviderId[];
  readonly hasSearch: boolean;
  readonly hasExtract: boolean;
  /** Search the web with the next provider in the rotation, falling back to the others. */
  search(query: string, maxResults: number): Promise<SearchHit[]>;
  /** Extract a page as markdown with the next provider in the rotation, falling back to the others. */
  extract(url: string): Promise<ExtractedPage>;
}

export class NoWebProviderAvailableError extends Error {
  constructor(capability: 'search' | 'extract') {
    super(`No web ${capability} provider is available (none configured or all out of credit)`);
    this.name = 'NoWebProviderAvailableError';
  }
}

/**
 * Round-robin pool over the deployment's web providers. Each call starts at
 * the next configured provider, so spend is spread across every account; a
 * failing provider hands over to the next one, and a provider that reports
 * no credit or a rate limit is skipped until its cooldown ends.
 */
export function createWebProviderPool(
  keys: WebProviderKeys,
  options: WebProviderPoolOptions = {},
): WebProviderPool {
  const now = options.now ?? Date.now;
  const cooldownMs = options.cooldownMs ?? DEFAULT_PROVIDER_COOLDOWN_MS;
  const searchFns = { ...DEFAULT_SEARCH_FNS, ...options.searchFns };
  const extractFns = { ...DEFAULT_EXTRACT_FNS, ...options.extractFns };
  const logger = options.logger;

  const keyFor = (provider: WebProviderId) => keys[provider]?.trim() || undefined;
  const searchProviders = SEARCH_ORDER.filter((provider) => keyFor(provider));
  const extractProviders = EXTRACT_ORDER.filter((provider) => keyFor(provider));

  const cooldownUntil = new Map<WebProviderId, number>();
  const cursors = { search: 0, extract: 0 };

  function nextRotation<P extends WebProviderId>(
    capability: 'search' | 'extract',
    providers: readonly P[],
  ): P[] {
    const start = cursors[capability] % Math.max(providers.length, 1);
    cursors[capability] = start + 1;
    const rotated = [...providers.slice(start), ...providers.slice(0, start)];
    return rotated.filter((provider) => (cooldownUntil.get(provider) ?? 0) <= now());
  }

  async function runWithFallback<P extends WebProviderId, T>(
    capability: 'search' | 'extract',
    providers: readonly P[],
    call: (provider: P, apiKey: string) => Promise<T>,
  ): Promise<T> {
    const candidates = nextRotation(capability, providers);
    if (candidates.length === 0) {
      throw new NoWebProviderAvailableError(capability);
    }

    let lastError: unknown;
    for (const provider of candidates) {
      try {
        const result = await call(provider, keyFor(provider)!);
        logger?.log?.(`web ${capability} served by ${provider}`);
        return result;
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        if (error instanceof ProviderHttpError && COOLDOWN_STATUSES.has(error.status)) {
          cooldownUntil.set(provider, now() + cooldownMs);
          logger?.warn?.(`web ${capability}: ${provider} on cooldown (${message})`);
        } else {
          logger?.warn?.(`web ${capability}: ${provider} failed (${message})`);
        }
      }
    }

    throw lastError;
  }

  return {
    searchProviders,
    extractProviders,
    hasSearch: searchProviders.length > 0,
    hasExtract: extractProviders.length > 0,
    search: (query, maxResults) =>
      runWithFallback('search', searchProviders, (provider, apiKey) =>
        searchFns[provider](query, apiKey, maxResults),
      ),
    extract: async (rawUrl) => {
      const url = validateScrapeUrl(rawUrl).toString();
      const { content } = await runWithFallback('extract', extractProviders, (provider, apiKey) =>
        extractFns[provider](url, apiKey),
      );
      return { url, format: 'markdown', content };
    },
  };
}
