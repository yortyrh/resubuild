import {
  HostedModelPool,
  HostedPoolExhaustedError,
  providerErrorStatus,
} from './hosted-model-pool';
import type { HostedModelEntry } from './hosted-models.config';

const entry = (id: string, monthlyTokenLimit = 1000): HostedModelEntry => ({
  id,
  modelId: `openai/${id}`,
  providerId: 'openai',
  apiKey: `sk-${id}`,
  monthlyTokenLimit,
  options: {},
});

function setup(totals: Record<string, number> = {}, start = Date.UTC(2026, 10, 5)) {
  let now = start;
  const usage = { poolTotals: jest.fn(async () => new Map(Object.entries(totals))) };
  const pool = new HostedModelPool('included', [entry('a'), entry('b'), entry('c')], usage, {
    now: () => now,
    cooldownMs: 1000,
    usageCacheMs: 500,
  });
  return { pool, usage, advance: (ms: number) => (now += ms) };
}

describe('HostedModelPool', () => {
  it('rotates round-robin over the entries', async () => {
    const { pool } = setup();
    const ids = [];
    for (let i = 0; i < 4; i += 1) ids.push((await pool.acquire()).id);
    expect(ids).toEqual(['a', 'b', 'c', 'a']);
  });

  it('skips entries that used their monthly budget', async () => {
    const { pool } = setup({ a: 1000, b: 999 });
    expect((await pool.acquire()).id).toBe('b');
    expect((await pool.acquire()).id).toBe('c');
    expect((await pool.acquire()).id).toBe('b');
  });

  it('is exhausted when no entry has budget left', async () => {
    const { pool } = setup({ a: 1000, b: 2000, c: 1000 });
    await expect(pool.hasCapacity()).resolves.toBe(false);
    await expect(pool.acquire()).rejects.toBeInstanceOf(HostedPoolExhaustedError);
  });

  it('cools an entry down after an auth or rate-limit error, then retries it', async () => {
    const { pool, advance } = setup();
    pool.reportFailure('a', { statusCode: 429 });
    pool.reportFailure('b', new Error('timeout'));
    expect((await pool.acquire()).id).toBe('b');
    expect((await pool.acquire()).id).toBe('c');
    expect((await pool.acquire()).id).toBe('b');
    advance(1001);
    expect((await pool.acquire()).id).toBe('c');
    expect((await pool.acquire()).id).toBe('a');
  });

  it('caches totals briefly and adds local usage meanwhile', async () => {
    const { pool, usage, advance } = setup({ a: 900 });
    await pool.hasCapacity();
    pool.noteUsage('a', 100);
    expect((await pool.entriesWithBudget()).map((e) => e.id)).toEqual(['b', 'c']);
    expect(usage.poolTotals).toHaveBeenCalledTimes(1);
    advance(600);
    await pool.hasCapacity();
    expect(usage.poolTotals).toHaveBeenCalledTimes(2);
    expect(usage.poolTotals).toHaveBeenLastCalledWith('included', '2026-11');
  });

  it('reads the HTTP status of nested provider errors', () => {
    expect(providerErrorStatus({ statusCode: 401 })).toBe(401);
    expect(providerErrorStatus({ cause: { cause: { status: 402 } } })).toBe(402);
    expect(providerErrorStatus(new Error('x'))).toBeUndefined();
    expect(providerErrorStatus('x')).toBeUndefined();
  });
});
