import { Injectable, Optional } from '@nestjs/common';
import { McpRegistryDiscoveryService } from '@rekog/mcp-nest';
import type { McpCreateKeyResponse, McpSettingsResponse } from '@resubuild/types';
import type { AuthUser } from '../auth/auth-user.types';
import type { McpApiKeyRow } from './mcp-key.repository';
import { McpKeyRepository } from './mcp-key.repository';
import { MCP_TOOL_NAMES, type McpToolName } from './tool-definitions';

@Injectable()
export class McpSettingsService {
  constructor(
    private readonly mcpKeyRepository: McpKeyRepository,
    @Optional() private readonly registry?: McpRegistryDiscoveryService,
  ) {}

  private toKey(row: McpApiKeyRow | null): McpSettingsResponse['key'] {
    if (!row) return null;
    return {
      keyPrefix: row.key_prefix,
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
    };
  }

  async getSettings(user: AuthUser): Promise<McpSettingsResponse> {
    const settings = await this.mcpKeyRepository.getOrCreateSettings(user);
    const key = await this.mcpKeyRepository.getKey(user);
    return {
      mcpEnabled: settings.mcp_enabled,
      key: this.toKey(key),
    };
  }

  async patchSettings(user: AuthUser, mcpEnabled?: boolean): Promise<McpSettingsResponse> {
    if (mcpEnabled !== undefined) {
      await this.mcpKeyRepository.setMcpEnabled(user, mcpEnabled);
    }
    return this.getSettings(user);
  }

  async createKey(user: AuthUser): Promise<McpCreateKeyResponse> {
    const { row, secret } = await this.mcpKeyRepository.createKey(user);
    return {
      key: this.toKey(row)!,
      secret,
    };
  }

  /**
   * Returns the catalog of MCP tool names currently registered with the
   * `@rekog/mcp-nest` wrapper. When the registry is unavailable (e.g. tests
   * that don't import the wrapper module, or when `MCP_SERVER_ENABLED` is
   * `"false"` and `McpModule.forRoot` is skipped), falls back to the static
   * `MCP_TOOL_NAMES` list so callers still receive the full set of names.
   */
  listRegisteredToolNames(): McpToolName[] {
    if (this.registry) {
      const moduleIds = this.registry.getMcpModuleIds();
      const discovered = new Set<string>();
      for (const id of moduleIds) {
        for (const tool of this.registry.getTools(id)) {
          if (tool.metadata.name) {
            discovered.add(tool.metadata.name);
          }
        }
      }
      for (const name of discovered) {
        if (!MCP_TOOL_NAMES.includes(name as McpToolName)) {
          return [...MCP_TOOL_NAMES, name as McpToolName];
        }
      }
    }
    return [...MCP_TOOL_NAMES];
  }
}
