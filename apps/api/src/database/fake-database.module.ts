import { Global, Module } from '@nestjs/common';
import { DATABASE } from './database.tokens';

/**
 * Test-only stand-in for {@link DatabaseModule}: satisfies the `DATABASE`
 * injection token without opening a pool. Use in module-wiring specs that
 * compile modules but never query.
 */
@Global()
@Module({
  providers: [{ provide: DATABASE, useValue: {} }],
  exports: [DATABASE],
})
export class FakeDatabaseModule {}
