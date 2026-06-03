import { Module } from '@nestjs/common';
import { CvModule } from '../cv/cv.module';
import { McpApiKeyGuard } from './mcp-api-key.guard';
import { McpKeyRepository } from './mcp-key.repository';

/**
 * Owns the MCP API-key authentication surface (guard + repository). Split out
 * of `McpModule` so that downstream modules (e.g. `CvExportModule`) can
 * authenticate MCP API keys without pulling in the full MCP server, which
 * would otherwise form a circular dependency: `McpModule` depends on
 * `CvExportModule` (for `CvExportService`) and vice versa.
 */
@Module({
  imports: [CvModule],
  providers: [McpKeyRepository, McpApiKeyGuard],
  exports: [McpKeyRepository, McpApiKeyGuard],
})
export class McpAuthModule {}
