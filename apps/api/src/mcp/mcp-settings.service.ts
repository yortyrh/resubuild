import { Injectable } from '@nestjs/common';
import type { McpApiKey, McpCreateKeyResponse, McpSettingsResponse } from '@resumind/types';
import type { AuthUser } from '../auth/auth-user.types';
import type { McpApiKeyRow } from './mcp-key.repository';
import { McpKeyRepository } from './mcp-key.repository';

@Injectable()
export class McpSettingsService {
  constructor(private readonly mcpKeyRepository: McpKeyRepository) {}

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
}
