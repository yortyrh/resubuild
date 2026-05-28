import { describe, expect, it } from 'vitest';
import {
  createQueryClient,
  DEFAULT_GC_TIME_MS,
  DEFAULT_STALE_TIME_MS,
} from '@/lib/queries/query-client';

describe('createQueryClient', () => {
  it('applies default stale and gc times', () => {
    const client = createQueryClient();
    const defaults = client.getDefaultOptions().queries;

    expect(defaults?.staleTime).toBe(DEFAULT_STALE_TIME_MS);
    expect(defaults?.gcTime).toBe(DEFAULT_GC_TIME_MS);
  });

  it('retries once for generic errors', () => {
    const client = createQueryClient();
    const retry = client.getDefaultOptions().queries?.retry;

    expect(typeof retry).toBe('function');
    expect((retry as (count: number, error: Error) => boolean)(0, new Error('network'))).toBe(true);
    expect((retry as (count: number, error: Error) => boolean)(1, new Error('network'))).toBe(
      false,
    );
  });

  it('does not retry auth errors', () => {
    const client = createQueryClient();
    const retry = client.getDefaultOptions().queries?.retry as (
      count: number,
      error: Error,
    ) => boolean;

    expect(retry(0, new Error('Request failed (401)'))).toBe(false);
    expect(retry(0, new Error('Request failed (403)'))).toBe(false);
  });
});
