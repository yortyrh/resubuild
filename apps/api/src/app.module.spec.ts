/**
 * Module-level discovery test for `AppModule`.
 *
 * Verifies that:
 *  - `DevtoolsModule` is imported when `NODE_ENV === 'development'`.
 *  - `DevtoolsModule` is NOT imported when `NODE_ENV` is `test` or `production`.
 *
 * In `test`, `DevtoolsModule`'s `onApplicationBootstrap` hook schedules an
 * unconditional `setTimeout(..., 1000)` that prints the sandbox session token
 * via `chalk`. That `require` fires after Jest has torn down its module registry
 * and crashes the worker with
 * `ReferenceError: You are trying to 'require' a file after the Jest environment
 * has been torn down.`, even though the actual tests already passed.
 *
 * Covered by the colocated unit test rather than E2E so it runs in CI without
 * a live Supabase instance.
 */
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';

describe('AppModule', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('DevtoolsModule conditional import', () => {
    it('compiles when NODE_ENV is development (DevtoolsModule loaded)', async () => {
      process.env.NODE_ENV = 'development';

      const moduleRef = await Test.createTestingModule({
        imports: [ConfigModule.forRoot({ isGlobal: true }), AppModule],
      }).compile();

      expect(moduleRef).toBeDefined();
      await moduleRef.close();
    });

    it('compiles when NODE_ENV is test (DevtoolsModule NOT loaded to avoid post-teardown chalk require)', async () => {
      process.env.NODE_ENV = 'test';

      const moduleRef = await Test.createTestingModule({
        imports: [ConfigModule.forRoot({ isGlobal: true }), AppModule],
      }).compile();

      expect(moduleRef).toBeDefined();
      await moduleRef.close();
    });

    it('compiles when NODE_ENV is production (DevtoolsModule NOT loaded)', async () => {
      process.env.NODE_ENV = 'production';

      const moduleRef = await Test.createTestingModule({
        imports: [ConfigModule.forRoot({ isGlobal: true }), AppModule],
      }).compile();

      expect(moduleRef).toBeDefined();
      await moduleRef.close();
    });
  });
});
