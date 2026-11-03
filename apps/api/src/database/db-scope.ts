import type { DbExecutor } from '@resubuild/db';

import { getTableColumns, type Table } from '@resubuild/db';

/**
 * Per-request data-access scope: the database handle (or open transaction)
 * plus the id of the user every query must be restricted to.
 *
 * Replaces the per-user Supabase client: there is no RLS, so repositories
 * must add `user_id = scope.userId` (directly or through the owning `cv`)
 * to every read and write.
 */
export interface DbScope {
  readonly db: DbExecutor;
  readonly userId: string;
}

/**
 * Keeps only keys that are real columns of `table` and whose value is not
 * `undefined`, so dynamic payloads (e.g. `resumeItemToDbPayload`) can be
 * passed to `update().set()` safely.
 */
export function pickColumns<T extends Table>(
  table: T,
  payload: Record<string, unknown>,
  omit: readonly string[] = [],
): Record<string, unknown> {
  const columns = getTableColumns(table);
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || omit.includes(key) || !(key in columns)) continue;
    result[key] = value;
  }
  return result;
}
