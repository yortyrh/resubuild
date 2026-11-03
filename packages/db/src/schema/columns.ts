import { customType } from 'drizzle-orm/pg-core';

/**
 * `timestamp with time zone` exposed as an ISO-8601 string (`2026-05-23T10:00:00.123Z`).
 *
 * Keeps the row shape the API returned under PostgREST (string timestamps), so
 * `@resubuild/types` row types (`created_at: string`) stay valid.
 */
export const timestamptz = customType<{ data: string; driverData: string | Date }>({
  dataType() {
    return 'timestamp with time zone';
  },
  fromDriver(value) {
    return new Date(value).toISOString();
  },
  toDriver(value) {
    return value;
  },
});
