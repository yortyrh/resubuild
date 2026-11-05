import type { AuthUser } from '../auth/auth-user.types';
import { useTestDb } from '../database/test-db.helpers';
import { AiUsageRepository } from './ai-usage.repository';

describe('AiUsageRepository', () => {
  const ctx = useTestDb();
  let repository: AiUsageRepository;
  let user: AuthUser;
  let other: AuthUser;

  beforeEach(async () => {
    repository = new AiUsageRepository(ctx.db);
    user = await ctx.createUser();
    other = await ctx.createUser();
  });

  const tokens = (total: number) => ({
    inputTokens: total - 1,
    outputTokens: 1,
    totalTokens: total,
  });

  it('adds usage to the pool entry and the user for the period', async () => {
    const target = {
      pool: 'included' as const,
      entryId: 'oa-1',
      period: '2026-11',
      userId: user.id,
    };
    await repository.record(tokens(100), target);
    await repository.record(tokens(50), target);

    await expect(repository.poolTotals('included', '2026-11')).resolves.toEqual(
      new Map([['oa-1', 150]]),
    );
    await expect(repository.userTotal(user.id, '2026-11')).resolves.toBe(150);
  });

  it('keeps periods, pools and users apart', async () => {
    await repository.record(tokens(10), {
      pool: 'included',
      entryId: 'oa-1',
      period: '2026-10',
      userId: user.id,
    });
    await repository.record(tokens(20), { pool: 'guest', entryId: 'oa-1', period: '2026-11' });
    await repository.record(tokens(30), {
      pool: 'included',
      entryId: 'oa-1',
      period: '2026-11',
      userId: other.id,
    });

    await expect(repository.userTotal(user.id, '2026-11')).resolves.toBe(0);
    await expect(repository.userTotal(user.id, '2026-10')).resolves.toBe(10);
    await expect(repository.userTotal(other.id, '2026-11')).resolves.toBe(30);
    await expect(repository.poolTotals('guest', '2026-11')).resolves.toEqual(
      new Map([['oa-1', 20]]),
    );
    await expect(repository.poolTotals('included', '2026-11')).resolves.toEqual(
      new Map([['oa-1', 30]]),
    );
  });

  it('counts concurrent records without losing any', async () => {
    const target = {
      pool: 'included' as const,
      entryId: 'oa-1',
      period: '2026-11',
      userId: user.id,
    };
    await Promise.all(Array.from({ length: 10 }, () => repository.record(tokens(5), target)));
    await expect(repository.userTotal(user.id, '2026-11')).resolves.toBe(50);
  });
});
