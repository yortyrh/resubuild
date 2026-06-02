import { Module } from '@nestjs/common';
import { ApplicationModule } from '../application/application.module';
import { AuthModule } from '../auth/auth.module';
import { CvModule } from '../cv/cv.module';
import { CvExportModule } from '../cv-export/cv-export.module';
import { MediaModule } from '../media/media.module';
import { CvJsonResumeSwapService } from './cv-json-resume-swap.service';
import { McpController } from './mcp.controller';
import { McpApiKeyGuard } from './mcp-api-key.guard';
import { McpKeyRepository } from './mcp-key.repository';
import { McpSettingsController } from './mcp-settings.controller';
import { McpSettingsService } from './mcp-settings.service';
import { McpToolsService } from './mcp-tools.service';

@Module({
  imports: [AuthModule, CvModule, CvExportModule, ApplicationModule, MediaModule],
  controllers: [McpSettingsController, McpController],
  providers: [
    McpKeyRepository,
    McpSettingsService,
    McpApiKeyGuard,
    McpToolsService,
    CvJsonResumeSwapService,
  ],
  exports: [McpKeyRepository, McpSettingsService, McpToolsService],
})
export class McpModule {}
