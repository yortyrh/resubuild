import { Global, Module } from '@nestjs/common';
import { CvModule } from '../cv/cv.module';
import { McpApiKeyGuard } from './mcp-api-key.guard';
import { McpKeyRepository } from './mcp-key.repository';

/**
 * Owns the MCP API-key authentication surface (guard + repository). Split out
 * of `McpModule` so that downstream modules (e.g. `CvExportModule`) can
 * authenticate MCP API keys without pulling in the full MCP server, which
 * would otherwise form a circular dependency: `McpModule` depends on
 * `CvExportModule` (for `CvExportService`) and vice versa.
 *
 * Marked `@Global()` so the guard and repository are visible inside the
 * `@rekog/mcp-nest` dynamic module (the wrapper's `forRoot` does not accept
 * an `imports` array, so the guard's `McpKeyRepository` dependency must be
 * resolvable from outside the wrapper's own scope).
 */
@Global()
@Module({
  imports: [CvModule],
  providers: [McpKeyRepository, McpApiKeyGuard],
  exports: [McpKeyRepository, McpApiKeyGuard],
})
export class McpAuthModule {}
