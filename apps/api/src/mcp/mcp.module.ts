import { Module } from '@nestjs/common';
import { ApplicationModule } from '../application/application.module';
import { AuthModule } from '../auth/auth.module';
import { CvModule } from '../cv/cv.module';
import { CvExportModule } from '../cv-export/cv-export.module';
import { ExportStorageModule } from '../export-storage/export-storage.module';
import { MediaModule } from '../media/media.module';
import { CvJsonResumeSwapService } from './cv-json-resume-swap.service';
import { McpController } from './mcp.controller';
import { McpAuthModule } from './mcp-auth.module';
import { McpExportService } from './mcp-export.service';
import { McpSettingsController } from './mcp-settings.controller';
import { McpSettingsService } from './mcp-settings.service';
import { McpToolsService } from './mcp-tools.service';

@Module({
  imports: [
    AuthModule,
    CvModule,
    CvExportModule,
    ApplicationModule,
    MediaModule,
    ExportStorageModule,
    McpAuthModule,
  ],
  controllers: [McpSettingsController, McpController],
  providers: [McpSettingsService, McpToolsService, CvJsonResumeSwapService, McpExportService],
  exports: [McpSettingsService, McpToolsService, McpExportService],
})
export class McpModule {}
