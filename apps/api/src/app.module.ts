import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { DevtoolsModule } from '@nestjs/devtools-integration';
import { ScheduleModule } from '@nestjs/schedule';
import { AiAgentModule } from './ai-agent/ai-agent.module';
import { ApplicationModule } from './application/application.module';
import { AuthModule } from './auth/auth.module';
import { CvModule } from './cv/cv.module';
import { CvExportModule } from './cv-export/cv-export.module';
import { DatabaseModule } from './database/database.module';
import { DatabaseExceptionFilter } from './database/database-exception.filter';
import { ExportStorageModule } from './export-storage/export-storage.module';
import { HealthController } from './health/health.controller';
import { ImportModule } from './import/import.module';
import { ImportLlmConfigModule } from './import-llm-config/import-llm-config.module';
import { ImportModelsCatalogModule } from './import-models-catalog/import-models-catalog.module';
import { McpModule } from './mcp/mcp.module';
import { McpAuthModule } from './mcp/mcp-auth.module';
import { MediaModule } from './media/media.module';
import { StorageModule } from './storage/storage.module';
import { WebScrapeModule } from './web-scrape/web-scrape.module';

@Module({
  imports: [
    // DevtoolsModule is gated on the `development` environment per
    // @nestjs/devtools-integration docs. It is intentionally NOT registered under
    // `test`/`production`: its `onApplicationBootstrap` hook schedules an
    // unconditional `setTimeout(..., 1000)` that prints the sandbox session
    // token via `chalk`, which fails with
    // `ReferenceError: You are trying to 'require' a file after the Jest environment
    // has been torn down.` once Jest has closed the test module registry.
    // The snapshot (graph dump) is only useful for local dev debugging anyway.
    ...(process.env.NODE_ENV === 'development' ? [DevtoolsModule.register({ http: true })] : []),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    StorageModule,
    ImportModelsCatalogModule,
    AuthModule,
    CvModule,
    CvExportModule,
    ExportStorageModule,
    MediaModule,
    AiAgentModule,
    ImportLlmConfigModule,
    ImportModule,
    ApplicationModule,
    WebScrapeModule,
    McpAuthModule,
    McpModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: DatabaseExceptionFilter }],
})
export class AppModule {}
