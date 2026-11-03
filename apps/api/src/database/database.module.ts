import { Global, Inject, Logger, Module, type OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDb, type DbHandle } from '@resubuild/db';
import { DATABASE } from './database.tokens';

const DB_HANDLE = Symbol('DB_HANDLE');

/**
 * Global Postgres connection pool (node-postgres + Drizzle).
 *
 * Reads `DATABASE_URL`; any Postgres works (local Docker, Railway, DigitalOcean, RDS).
 * The API is the only process that talks to the database: user isolation is
 * enforced by explicit `user_id` filters in every repository (no RLS).
 */
@Global()
@Module({
  providers: [
    {
      provide: DB_HANDLE,
      inject: [ConfigService],
      useFactory: (config: ConfigService): DbHandle => {
        const url = config.get<string>('DATABASE_URL');
        if (!url) {
          throw new Error('DATABASE_URL is not configured');
        }
        const max = Number(config.get<string>('DATABASE_POOL_MAX') ?? 10);
        return createDb({ url, max: Number.isFinite(max) && max > 0 ? max : 10 });
      },
    },
    {
      provide: DATABASE,
      inject: [DB_HANDLE],
      useFactory: (handle: DbHandle) => handle.db,
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule implements OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(@Inject(DB_HANDLE) private readonly handle: DbHandle) {}

  async onApplicationShutdown(): Promise<void> {
    try {
      await this.handle.close();
    } catch (error) {
      this.logger.warn(`Failed to close database pool: ${String(error)}`);
    }
  }
}
