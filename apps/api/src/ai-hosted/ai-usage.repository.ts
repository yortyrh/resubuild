import { Inject, Injectable } from '@nestjs/common';
import { aiPoolUsageMonthly, aiUserUsageMonthly, and, type Database, eq, sql } from '@resubuild/db';
import type { ModelTokenUsage } from '@resubuild/import-agent';
import { DATABASE } from '../database/database.tokens';
import type { HostedPoolName } from './hosted-models.config';

/**
 * Monthly token counters for the app-funded models. Increments are atomic
 * upserts, so concurrent jobs never lose counts. User rows are always read and
 * written by `user_id`.
 */
@Injectable()
export class AiUsageRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** Add one model call's tokens to a pool entry and, when given, to the user. */
  async record(
    usage: ModelTokenUsage,
    target: { pool: HostedPoolName; entryId: string; period: string; userId?: string },
  ): Promise<void> {
    const tokens = {
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      total_tokens: usage.totalTokens,
    };
    await this.db.transaction(async (tx) => {
      await tx
        .insert(aiPoolUsageMonthly)
        .values({ pool: target.pool, entry_id: target.entryId, period: target.period, ...tokens })
        .onConflictDoUpdate({
          target: [aiPoolUsageMonthly.pool, aiPoolUsageMonthly.entry_id, aiPoolUsageMonthly.period],
          set: {
            input_tokens: sql`${aiPoolUsageMonthly.input_tokens} + excluded.input_tokens`,
            output_tokens: sql`${aiPoolUsageMonthly.output_tokens} + excluded.output_tokens`,
            total_tokens: sql`${aiPoolUsageMonthly.total_tokens} + excluded.total_tokens`,
            updated_at: sql`now()`,
          },
        });

      if (target.userId) {
        await tx
          .insert(aiUserUsageMonthly)
          .values({ user_id: target.userId, period: target.period, ...tokens })
          .onConflictDoUpdate({
            target: [aiUserUsageMonthly.user_id, aiUserUsageMonthly.period],
            set: {
              input_tokens: sql`${aiUserUsageMonthly.input_tokens} + excluded.input_tokens`,
              output_tokens: sql`${aiUserUsageMonthly.output_tokens} + excluded.output_tokens`,
              total_tokens: sql`${aiUserUsageMonthly.total_tokens} + excluded.total_tokens`,
              updated_at: sql`now()`,
            },
          });
      }
    });
  }

  /** Total tokens per entry of `pool` in `period` (entries with no usage are absent). */
  async poolTotals(pool: HostedPoolName, period: string): Promise<Map<string, number>> {
    const rows = await this.db
      .select({ entryId: aiPoolUsageMonthly.entry_id, total: aiPoolUsageMonthly.total_tokens })
      .from(aiPoolUsageMonthly)
      .where(and(eq(aiPoolUsageMonthly.pool, pool), eq(aiPoolUsageMonthly.period, period)));
    return new Map(rows.map((row) => [row.entryId, Number(row.total)]));
  }

  /** Tokens `userId` spent on included models in `period`. */
  async userTotal(userId: string, period: string): Promise<number> {
    const rows = await this.db
      .select({ total: aiUserUsageMonthly.total_tokens })
      .from(aiUserUsageMonthly)
      .where(and(eq(aiUserUsageMonthly.user_id, userId), eq(aiUserUsageMonthly.period, period)))
      .limit(1);
    return Number(rows[0]?.total ?? 0);
  }
}
