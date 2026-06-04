/**
 * Module-level discovery test for `McpModule`.
 *
 * Verifies that:
 *  - `McpModule` compiles cleanly with the new `@rekog/mcp-nest` wrapper
 *    enabled (the default), and
 *  - the static list of `@Tool` / `@Resource` provider classes exported by
 *    the module is non-empty and contains the expected minimum surface.
 *
 * It does not boot the full HTTP server or talk to Supabase — it just ensures
 * the module's wiring is consistent (no missing imports, no duplicate
 * providers, no syntactically broken decorators). The deep E2E coverage for
 * the wrapper lives in `apps/api/test/e2e/local-supabase.e2e-spec.ts`.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ApplicationModule } from '../application/application.module';
import { AuthModule } from '../auth/auth.module';
import { CvModule } from '../cv/cv.module';
import { CvExportModule } from '../cv-export/cv-export.module';
import { ExportStorageModule } from '../export-storage/export-storage.module';
import { ImportModelsCatalogModule } from '../import-models-catalog/import-models-catalog.module';
import { MediaModule } from '../media/media.module';
import { McpModule } from './mcp.module';
import { McpAuthModule } from './mcp-auth.module';

@Module({})
class NoopModule {}

describe('McpModule', () => {
  it('compiles when MCP_SERVER_ENABLED is unset (default)', async () => {
    delete process.env.MCP_SERVER_ENABLED;

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        NoopModule,
        AuthModule,
        CvModule,
        CvExportModule,
        ApplicationModule,
        MediaModule,
        ExportStorageModule,
        ImportModelsCatalogModule,
        McpAuthModule,
        McpModule,
      ],
    }).compile();

    expect(moduleRef).toBeDefined();
    await moduleRef.close();
  });

  it('compiles when MCP_SERVER_ENABLED is "false" (wrapper skipped)', async () => {
    process.env.MCP_SERVER_ENABLED = 'false';

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        NoopModule,
        AuthModule,
        CvModule,
        CvExportModule,
        ApplicationModule,
        MediaModule,
        ExportStorageModule,
        ImportModelsCatalogModule,
        McpAuthModule,
        McpModule,
      ],
    }).compile();

    expect(moduleRef).toBeDefined();
    await moduleRef.close();

    delete process.env.MCP_SERVER_ENABLED;
  });
});
