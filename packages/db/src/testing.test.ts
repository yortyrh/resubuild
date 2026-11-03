import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cv } from './schema';
import { createTestDb, type TestDb } from './testing';

describe('createTestDb', () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createTestDb();
  });

  afterAll(async () => {
    await testDb.close();
  });

  it('applies the migrations and round-trips a CV with ISO timestamps', async () => {
    const userId = await testDb.createUser();
    const [row] = await testDb.db.insert(cv).values({ user_id: userId }).returning();

    expect(row.kind).toBe('primary');
    expect(row.template_id).toBe('classic');
    expect(row.location).toEqual({});
    expect(row.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('maintains updated_at through the trigger', async () => {
    const userId = await testDb.createUser();
    const [row] = await testDb.db
      .insert(cv)
      .values({ user_id: userId, updated_at: '2000-01-01T00:00:00.000Z' })
      .returning();
    const [updated] = await testDb.db
      .update(cv)
      .set({ name: 'x' })
      .where(eq(cv.id, row.id))
      .returning();
    expect(updated.updated_at > row.updated_at).toBe(true);
  });

  it('truncates every table', async () => {
    await testDb.truncateAll();
    expect(await testDb.db.select().from(cv)).toEqual([]);
  });
});
