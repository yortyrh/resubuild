import { ConflictException, Injectable } from '@nestjs/common';
import type { McpApiKeySummary, McpCreateKeyResponse, McpSettingsResponse } from '@resumind/types';
import type { AuthUser } from '../auth/auth-user.types';
import type { McpApiKeyRow } from './mcp-key.repository';
import { McpKeyRepository } from './mcp-key.repository';

const MAX_ACTIVE_KEYS = 2;

@Injectable()
export class McpSettingsService {
  constructor(private readonly mcpKeyRepository: McpKeyRepository) {}

  private toSummary(row: McpApiKeyRow): McpApiKeySummary {
    return {
      id: row.id,
      label: row.label,
      keyPrefix: row.key_prefix,
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
      revoked: row.revoked_at != null,
    };
  }

  async getSettings(user: AuthUser): Promise<McpSettingsResponse> {
    const settings = await this.mcpKeyRepository.getOrCreateSettings(user);
    const keys = await this.mcpKeyRepository.listKeys(user);
    return {
      mcpEnabled: settings.mcp_enabled,
      keys: keys.map((row) => this.toSummary(row)),
    };
  }

  async patchSettings(user: AuthUser, mcpEnabled?: boolean): Promise<McpSettingsResponse> {
    if (mcpEnabled !== undefined) {
      await this.mcpKeyRepository.setMcpEnabled(user, mcpEnabled);
    }
    return this.getSettings(user);
  }

  async createKey(user: AuthUser, label?: string | null): Promise<McpCreateKeyResponse> {
    const active = await this.mcpKeyRepository.countActiveKeys(user);
    if (active >= MAX_ACTIVE_KEYS) {
      throw new ConflictException('Maximum of two active MCP API keys allowed');
    }

    const { row, secret } = await this.mcpKeyRepository.createKey(user, label ?? null);
    return {
      key: this.toSummary(row),
      secret,
    };
  }

  async revokeKey(user: AuthUser, keyId: string): Promise<McpSettingsResponse> {
    await this.mcpKeyRepository.revokeKey(user, keyId);
    return this.getSettings(user);
  }
}
