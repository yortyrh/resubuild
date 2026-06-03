import { Module } from '@nestjs/common';
import { ExportStorageService } from './export-storage.service';

/**
 * Owns the Supabase Storage I/O for the `mcp-exports` bucket and the matching
 * `public.mcp_export` registry table. The 5-minute expiry sweep is registered
 * via `@Cron` on the service itself (no separate provider required because
 * `ScheduleModule.forRoot()` is global in `AppModule`).
 */
@Module({
  providers: [ExportStorageService],
  exports: [ExportStorageService],
})
export class ExportStorageModule {}
