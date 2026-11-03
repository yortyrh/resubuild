import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Database, eq, mcpApiKey, userSettings } from '@resubuild/db';
import { encryptSecret, tryDecryptSecret } from '../ai-agent/ai-agent-crypto.util';
import type { AuthUser } from '../auth/auth-user.types';
import { DATABASE } from '../database/database.tokens';
import {
  generateMcpApiKeySecret,
  hashMcpApiKey,
  MCP_KEY_PREFIX,
  mcpKeyDisplayPrefix,
  verifyMcpApiKey,
} from './mcp-key-crypto.util';

export interface McpApiKeyRow {
  user_id: string;
  key_prefix: string;
  key_hash: string;
  encrypted_secret: string;
  created_at: string;
  last_used_at: string | null;
}

export interface McpUserSettingsRow {
  user_id: string;
  mcp_enabled: boolean;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class McpKeyRepository {
  private readonly logger = new Logger(McpKeyRepository.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly configService: ConfigService,
  ) {}

  private pepper(): string {
    const pepper =
      this.configService.get<string>('MCP_KEY_PEPPER') ??
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    if (!pepper) {
      throw new Error('MCP_KEY_PEPPER or SUPABASE_SERVICE_ROLE_KEY must be configured');
    }
    return pepper;
  }

  private encryptionKey(): string {
    const key =
      this.configService.get<string>('MCP_ENCRYPTION_KEY') ??
      this.configService.get<string>('AI_AGENT_ENCRYPTION_KEY') ??
      this.configService.get<string>('IMPORT_LLM_CONFIG_ENCRYPTION_KEY');
    if (!key) {
      throw new Error('MCP_ENCRYPTION_KEY or AI_AGENT_ENCRYPTION_KEY must be configured');
    }
    return key;
  }

  async getOrCreateSettings(user: AuthUser): Promise<McpUserSettingsRow> {
    await this.db
      .insert(userSettings)
      .values({ user_id: user.id, mcp_enabled: false })
      .onConflictDoNothing({ target: userSettings.user_id });

    const [row] = await this.db
      .select()
      .from(userSettings)
      .where(eq(userSettings.user_id, user.id))
      .limit(1);

    return row;
  }

  async setMcpEnabled(user: AuthUser, enabled: boolean): Promise<McpUserSettingsRow> {
    const [row] = await this.db
      .insert(userSettings)
      .values({ user_id: user.id, mcp_enabled: enabled })
      .onConflictDoUpdate({ target: userSettings.user_id, set: { mcp_enabled: enabled } })
      .returning();

    return row;
  }

  async isMcpEnabledForUser(userId: string): Promise<boolean> {
    const rows = await this.db
      .select({ mcp_enabled: userSettings.mcp_enabled })
      .from(userSettings)
      .where(eq(userSettings.user_id, userId))
      .limit(1);

    return Boolean(rows[0]?.mcp_enabled);
  }

  async getKey(user: AuthUser): Promise<McpApiKeyRow | null> {
    const rows = await this.db
      .select()
      .from(mcpApiKey)
      .where(eq(mcpApiKey.user_id, user.id))
      .limit(1);

    return (rows[0] as McpApiKeyRow | undefined) ?? null;
  }

  async createKey(user: AuthUser): Promise<{ row: McpApiKeyRow; secret: string }> {
    const secret = generateMcpApiKeySecret();
    const keyHash = hashMcpApiKey(secret, this.pepper());
    const keyPrefix = mcpKeyDisplayPrefix(secret);
    const encryptedSecret = encryptSecret(secret, this.encryptionKey());

    // The mcp_api_key.user_id primary key guarantees at most one row per
    // user, so rotating is a single atomic upsert keyed on user_id.
    const values = {
      key_prefix: keyPrefix,
      key_hash: keyHash,
      encrypted_secret: encryptedSecret,
    };
    const [row] = await this.db
      .insert(mcpApiKey)
      .values({ user_id: user.id, ...values })
      .onConflictDoUpdate({ target: mcpApiKey.user_id, set: values })
      .returning();

    return { row: row as McpApiKeyRow, secret };
  }

  async findActiveKeyBySecret(secret: string): Promise<McpApiKeyRow | null> {
    if (!secret.startsWith(MCP_KEY_PREFIX)) {
      return null;
    }

    const prefix = mcpKeyDisplayPrefix(secret);
    const rows = await this.db
      .select()
      .from(mcpApiKey)
      .where(eq(mcpApiKey.key_prefix, prefix))
      .limit(1);
    const row = rows[0];

    const pepper = this.pepper();
    if (row && verifyMcpApiKey(secret, pepper, row.key_hash)) {
      return row as McpApiKeyRow;
    }

    return null;
  }

  touchLastUsedAt(userId: string): void {
    void this.db
      .update(mcpApiKey)
      .set({ last_used_at: new Date().toISOString() })
      .where(eq(mcpApiKey.user_id, userId))
      .catch((error: unknown) => {
        // Non-blocking: a failed timestamp update must not fail the MCP request.
        this.logger.debug(`Failed to update MCP key last_used_at: ${String(error)}`);
      });
  }

  decryptKeySecret(row: McpApiKeyRow): string {
    if (!row.encrypted_secret) {
      throw new Error(
        'API key secret not available — the key was created before copy support and must be re-created',
      );
    }
    const decrypted = tryDecryptSecret(row.encrypted_secret, this.encryptionKey());
    if (decrypted === null) {
      throw new Error('Failed to decrypt API key secret — re-create the key');
    }
    return decrypted;
  }
}
