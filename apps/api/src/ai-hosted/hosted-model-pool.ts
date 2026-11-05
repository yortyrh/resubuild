import type { HostedModelEntry, HostedPoolName } from './hosted-models.config';
import { usagePeriod } from './usage-period';

/** Statuses that mean "this key cannot serve now" (bad/blocked key, no credit, rate limit). */
export const COOLDOWN_STATUSES = new Set([401, 402, 403, 429]);
export const DEFAULT_COOLDOWN_MS = 10 * 60 * 1000;
export const DEFAULT_USAGE_CACHE_MS = 30 * 1000;

export class HostedPoolExhaustedError extends Error {
  constructor(pool: HostedPoolName) {
    super(`No ${pool} AI model has budget left this month`);
    this.name = 'HostedPoolExhaustedError';
  }
}

export interface HostedPoolUsageSource {
  poolTotals(pool: HostedPoolName, period: string): Promise<Map<string, number>>;
}

export interface HostedModelPoolOptions {
  now?: () => number;
  cooldownMs?: number;
  /** How long monthly totals read from the database are reused. */
  usageCacheMs?: number;
}

/** HTTP status of a provider error (AI SDK `APICallError.statusCode`, or nested causes). */
export function providerErrorStatus(error: unknown): number | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === 'object'; depth += 1) {
    const candidate = current as { statusCode?: unknown; status?: unknown; cause?: unknown };
    const status = candidate.statusCode ?? candidate.status;
    if (typeof status === 'number') return status;
    current = candidate.cause;
  }
  return undefined;
}

/**
 * Round-robin over the entries of one app-funded pool, skipping entries that
 * used their monthly token budget or are cooling down after an auth, billing
 * or rate-limit error. Usage comes from the database (shared by replicas) and
 * is cached briefly; a job can overshoot a budget by at most its own tokens.
 * Cooldowns and the cursor are per process.
 */
export class HostedModelPool {
  private cursor = 0;
  private readonly cooldownUntil = new Map<string, number>();
  private cache: { period: string; fetchedAt: number; totals: Map<string, number> } | null = null;
  private readonly now: () => number;
  private readonly cooldownMs: number;
  private readonly usageCacheMs: number;

  constructor(
    readonly name: HostedPoolName,
    readonly entries: HostedModelEntry[],
    private readonly usage: HostedPoolUsageSource,
    options: HostedModelPoolOptions = {},
  ) {
    this.now = options.now ?? Date.now;
    this.cooldownMs = options.cooldownMs ?? DEFAULT_COOLDOWN_MS;
    this.usageCacheMs = options.usageCacheMs ?? DEFAULT_USAGE_CACHE_MS;
  }

  get configured(): boolean {
    return this.entries.length > 0;
  }

  /** Entries with budget left this month, ignoring cooldowns. */
  async entriesWithBudget(): Promise<HostedModelEntry[]> {
    const totals = await this.totals();
    return this.entries.filter((entry) => (totals.get(entry.id) ?? 0) < entry.monthlyTokenLimit);
  }

  /** Whether any entry still has budget this month. */
  async hasCapacity(): Promise<boolean> {
    return (await this.entriesWithBudget()).length > 0;
  }

  /** Next entry to use, or `HostedPoolExhaustedError` when none can serve. */
  async acquire(): Promise<HostedModelEntry> {
    const withBudget = new Set((await this.entriesWithBudget()).map((entry) => entry.id));
    const now = this.now();
    for (let offset = 0; offset < this.entries.length; offset += 1) {
      const index = (this.cursor + offset) % this.entries.length;
      const entry = this.entries[index];
      if (!withBudget.has(entry.id)) continue;
      if ((this.cooldownUntil.get(entry.id) ?? 0) > now) continue;
      this.cursor = (index + 1) % this.entries.length;
      return entry;
    }
    throw new HostedPoolExhaustedError(this.name);
  }

  /** Count tokens locally so the cached totals stay close until the next refresh. */
  noteUsage(entryId: string, totalTokens: number): void {
    if (!this.cache || this.cache.period !== usagePeriod(new Date(this.now()))) return;
    this.cache.totals.set(entryId, (this.cache.totals.get(entryId) ?? 0) + totalTokens);
  }

  /** Put an entry on cooldown when its provider rejected the key or rate-limited it. */
  reportFailure(entryId: string, error: unknown): void {
    const status = providerErrorStatus(error);
    if (status !== undefined && COOLDOWN_STATUSES.has(status)) {
      this.cooldownUntil.set(entryId, this.now() + this.cooldownMs);
    }
  }

  private async totals(): Promise<Map<string, number>> {
    const now = this.now();
    const period = usagePeriod(new Date(now));
    if (
      this.cache &&
      this.cache.period === period &&
      now - this.cache.fetchedAt < this.usageCacheMs
    ) {
      return this.cache.totals;
    }
    const totals = await this.usage.poolTotals(this.name, period);
    this.cache = { period, fetchedAt: now, totals };
    return totals;
  }
}
