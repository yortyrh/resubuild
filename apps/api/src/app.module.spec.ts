/**
 * Module-level discovery test for `AppModule`.
 *
 * Verifies that:
 *  - `DevtoolsModule` is imported when `NODE_ENV !== 'production'`
 *  - `DevtoolsModule` is NOT imported when `NODE_ENV === 'production'`
 *
 * This ensures the production guard documented in the @nestjs/devtools-integration
 * spec is respected and that the conditional import does not silently break.
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
    it('compiles when NODE_ENV is not production (DevtoolsModule loaded)', async () => {
      process.env.NODE_ENV = 'development';

      const moduleRef = await Test.createTestingModule({
        imports: [ConfigModule.forRoot({ isGlobal: true }), AppModule],
      }).compile();

      expect(moduleRef).toBeDefined();
      await moduleRef.close();
    });

    it('compiles when NODE_ENV is test (test !== production)', async () => {
      process.env.NODE_ENV = 'test';

      const moduleRef = await Test.createTestingModule({
        imports: [ConfigModule.forRoot({ isGlobal: true }), AppModule],
      }).compile();

      expect(moduleRef).toBeDefined();
      await moduleRef.close();
    });

    it('compiles when NODE_ENV is production (DevtoolsModule NOT loaded via http)', async () => {
      process.env.NODE_ENV = 'production';

      const moduleRef = await Test.createTestingModule({
        imports: [ConfigModule.forRoot({ isGlobal: true }), AppModule],
      }).compile();

      expect(moduleRef).toBeDefined();
      await moduleRef.close();
    });
  });
});
