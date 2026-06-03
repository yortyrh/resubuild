import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AiAgentModule } from './ai-agent/ai-agent.module';
import { ApplicationModule } from './application/application.module';
import { AuthModule } from './auth/auth.module';
import { CvModule } from './cv/cv.module';
import { CvExportModule } from './cv-export/cv-export.module';
import { ExportStorageModule } from './export-storage/export-storage.module';
import { ImportModule } from './import/import.module';
import { ImportLlmConfigModule } from './import-llm-config/import-llm-config.module';
import { ImportModelsCatalogModule } from './import-models-catalog/import-models-catalog.module';
import { McpModule } from './mcp/mcp.module';
import { McpAuthModule } from './mcp/mcp-auth.module';
import { MediaModule } from './media/media.module';
import { WebScrapeModule } from './web-scrape/web-scrape.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
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
})
export class AppModule {}
