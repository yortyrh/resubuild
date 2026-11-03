import type { Database } from '@resubuild/db';
import { createTestDb, type TestDb } from '@resubuild/db/testing';
import type { AuthUser } from '../auth/auth-user.types';

export interface TestDbContext {
  /** Drizzle handle on the in-memory database (valid inside tests/hooks). */
  readonly db: Database;
  readonly testDb: TestDb;
  /** Creates a `user` row and returns an {@link AuthUser} for it. */
  createUser: (email?: string) => Promise<AuthUser>;
}

/**
 * Registers Jest hooks for a PGlite database shared by the spec file and
 * emptied before every test. Real Postgres semantics, no Docker.
 */
export function useTestDb(): TestDbContext {
  let testDb: TestDb | undefined;

  beforeAll(async () => {
    testDb = await createTestDb();
  }, 60_000);

  afterAll(async () => {
    await testDb?.close();
  });

  beforeEach(async () => {
    await testDb?.truncateAll();
  });

  const current = (): TestDb => {
    if (!testDb) throw new Error('useTestDb(): database not ready (use inside tests or hooks)');
    return testDb;
  };

  return {
    get db() {
      return current().db;
    },
    get testDb() {
      return current();
    },
    async createUser(email) {
      const id = await current().createUser(email);
      return { id, email: email ?? `${id}@test.local`, authMethod: 'jwt' };
    },
  };
}
