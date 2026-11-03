// Query helpers re-exported so consumers share this package's drizzle-orm instance.
export {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  not,
  or,
  type SQL,
  sql,
  type Table,
} from 'drizzle-orm';
export type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
export {
  type CreateDbOptions,
  createDb,
  type Database,
  type DbExecutor,
  type DbHandle,
  type Schema,
} from './client';
export { MIGRATIONS_FOLDER, runMigrations } from './migrate';
export * from './schema';
export {
  type SectionTable,
  type SectionTableName,
  sectionTable,
  sectionTablesByName,
} from './sections';
