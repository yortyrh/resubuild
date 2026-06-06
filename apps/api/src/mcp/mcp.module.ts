import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { McpTransportType, McpModule as RekogMcpModule } from '@rekog/mcp-nest';
import { ApplicationModule } from '../application/application.module';
import { AuthModule } from '../auth/auth.module';
import { CvModule } from '../cv/cv.module';
import { CvExportModule } from '../cv-export/cv-export.module';
import { ExportStorageModule } from '../export-storage/export-storage.module';
import { MediaModule } from '../media/media.module';
import { CvJsonResumeSwapService } from './cv-json-resume-swap.service';
import { McpApiKeyGuard } from './mcp-api-key.guard';
import { McpAuthModule } from './mcp-auth.module';
import { McpAuthRequestBridge } from './mcp-auth-request-bridge.interceptor';
import { McpExportService } from './mcp-export.service';
import { McpSettingsController } from './mcp-settings.controller';
import { McpSettingsService } from './mcp-settings.service';
import { ApplicationResource } from './resources/application.resource';
import { CvResource } from './resources/cv.resource';
import { MediaResource } from './resources/media.resource';
import { GetApplicationTool } from './tools/applications/get-application.tool';
import { ListApplicationsTool } from './tools/applications/list-applications.tool';
import { UpdateApplicationTool } from './tools/applications/update-application.tool';
import { UpdateApplicationLetterTool } from './tools/applications/update-application-letter.tool';
import { CreateCvFromJsonresumeTool } from './tools/cv/create-cv-from-jsonresume.tool';
import { DeleteCvTool } from './tools/cv/delete-cv.tool';
import { GetCvTool } from './tools/cv/get-cv.tool';
import { GetJsonresumeSchemaTool } from './tools/cv/get-jsonresume-schema.tool';
import { ListCvsTool } from './tools/cv/list-cvs.tool';
import { ReplaceCvFromJsonresumeTool } from './tools/cv/replace-cv-from-jsonresume.tool';
import { ExportCvHtmlTool } from './tools/export/export-cv-html.tool';
import { ExportCvJsonresumeTool } from './tools/export/export-cv-jsonresume.tool';
import { ExportCvPdfTool } from './tools/export/export-cv-pdf.tool';
import { ExportCvScreenshotTool } from './tools/export/export-cv-screenshot.tool';
import { FetchExportUrlTool } from './tools/export/fetch-export-url.tool';
import { ListCvDesignsTool } from './tools/export/list-cv-designs.tool';
import { DeleteMediaTool } from './tools/media/delete-media.tool';
import { GetMediaUrlTool } from './tools/media/get-media-url.tool';
import { ListMediaTool } from './tools/media/list-media.tool';
import { GetCvTemplatePresentationTool } from './tools/presentation/get-cv-template-presentation.tool';
import { UpdateCvTemplatePresentationTool } from './tools/presentation/update-cv-template-presentation.tool';

/**
 * Returns true when the `MCP_SERVER_ENABLED` env gate is in its "disabled"
 * state. Mirrors the prior controller's `assertEnabled` check so the same env
 * values disable the new wrapper. When disabled, the `@rekog/mcp-nest` root
 * module is NOT registered and the `/mcp` route returns 404 (the wrapper is
 * the only controller mounted there).
 *
 * Read at module-construction time (not at module-load time) so a test can
 * mutate `process.env.MCP_SERVER_ENABLED` between two `createE2eApp()` calls
 * without having to bust the entire Jest module cache — which would also
 * re-evaluate `@nestjs/core` and surface "Nest can't resolve dependencies
 * of the DiscoveryService" because the test harness has its own
 * `ModulesContainer` instance.
 */
function isMcpServerDisabled(): boolean {
  const flag = process.env.MCP_SERVER_ENABLED;
  return flag === 'false' || flag === '0';
}

const toolProviders = [
  // CV CRUD
  ListCvsTool,
  GetCvTool,
  DeleteCvTool,
  CreateCvFromJsonresumeTool,
  ReplaceCvFromJsonresumeTool,
  GetJsonresumeSchemaTool,
  // CV export
  ListCvDesignsTool,
  ExportCvJsonresumeTool,
  ExportCvHtmlTool,
  ExportCvScreenshotTool,
  ExportCvPdfTool,
  FetchExportUrlTool,
  // CV presentation
  GetCvTemplatePresentationTool,
  UpdateCvTemplatePresentationTool,
  // Applications
  ListApplicationsTool,
  GetApplicationTool,
  UpdateApplicationTool,
  UpdateApplicationLetterTool,
  // Media
  ListMediaTool,
  GetMediaUrlTool,
  DeleteMediaTool,
];

const resourceProviders = [CvResource, ApplicationResource, MediaResource];

/**
 * Owns the MCP server (Streamable HTTP via `@rekog/mcp-nest`), the per-tool
 * and per-resource providers, the auth-context bridge interceptor (bound to
 * the `/mcp` and `/mcp/` routes), and the REST key-management surface that
 * stays live even when the MCP server itself is disabled.
 *
 * Migration from the prior hand-rolled `McpController` / `McpToolsService`
 * stack is fully captured in `openspec/changes/mcp-rekog-nest-adoption`.
 */
@Module({
  imports: [
    AuthModule,
    CvModule,
    CvExportModule,
    ApplicationModule,
    MediaModule,
    ExportStorageModule,
    McpAuthModule,
    ...(isMcpServerDisabled()
      ? []
      : [
          RekogMcpModule.forRoot({
            name: 'resubuild',
            version: '1.0.0',
            capabilities: {
              tools: { listChanged: false },
              resources: { listChanged: false },
            },
            transport: [McpTransportType.STREAMABLE_HTTP],
            guards: [McpApiKeyGuard],
            streamableHttp: {
              enableJsonResponse: false,
              sessionIdGenerator: () => randomUUID(),
              statelessMode: false,
            },
          }),
        ]),
  ],
  controllers: [McpSettingsController],
  providers: [
    McpSettingsService,
    CvJsonResumeSwapService,
    McpExportService,
    { provide: APP_INTERCEPTOR, useClass: McpAuthRequestBridge },
    ...toolProviders,
    ...resourceProviders,
  ],
  exports: [McpSettingsService, McpExportService],
})
export class McpModule {}
