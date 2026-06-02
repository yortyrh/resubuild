import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { encryptSecret, tryDecryptSecret } from '../ai-agent/ai-agent-crypto.util';
import type { AuthUser } from '../auth/auth-user.types';
import { CvNormalizedRepository } from '../cv/cv-normalized.repository';
import {
  generateMcpApiKeySecret,
  hashMcpApiKey,
  MCP_KEY_PREFIX,
  mcpKeyDisplayPrefix,
  verifyMcpApiKey,
} from './mcp-key-crypto.util';

export interface McpApiKeyRow {
  id: string;
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
  constructor(
    private readonly normalizedRepo: CvNormalizedRepository,
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

  private userClient(user: AuthUser) {
    return this.normalizedRepo.createClientForUser(user);
  }

  private serviceClient() {
    return this.normalizedRepo.createServiceRoleClient();
  }

  async getOrCreateSettings(user: AuthUser): Promise<McpUserSettingsRow> {
    const supabase = this.userClient(user);
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (data) {
      return data as McpUserSettingsRow;
    }

    const { data: inserted, error: insertError } = await supabase
      .from('user_settings')
      .insert({ user_id: user.id, mcp_enabled: false })
      .select('*')
      .single();

    if (insertError) {
      throw new BadRequestException(insertError.message);
    }

    return inserted as McpUserSettingsRow;
  }

  async setMcpEnabled(user: AuthUser, enabled: boolean): Promise<McpUserSettingsRow> {
    await this.getOrCreateSettings(user);
    const supabase = this.userClient(user);
    const { data, error } = await supabase
      .from('user_settings')
      .update({ mcp_enabled: enabled })
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data as McpUserSettingsRow;
  }

  async isMcpEnabledForUser(userId: string): Promise<boolean> {
    const supabase = this.serviceClient();
    const { data, error } = await supabase
      .from('user_settings')
      .select('mcp_enabled')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return Boolean(data?.mcp_enabled);
  }

  async getKey(user: AuthUser): Promise<McpApiKeyRow | null> {
    const supabase = this.userClient(user);
    const { data, error } = await supabase
      .from('mcp_api_key')
      .select('*')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return (data ?? null) as McpApiKeyRow | null;
  }

  async createKey(user: AuthUser): Promise<{ row: McpApiKeyRow; secret: string }> {
    await this.userClient(user).from('mcp_api_key').delete().eq('user_id', user.id);

    const secret = generateMcpApiKeySecret();
    const keyHash = hashMcpApiKey(secret, this.pepper());
    const keyPrefix = mcpKeyDisplayPrefix(secret);
    const encryptedSecret = encryptSecret(secret, this.encryptionKey());

    const supabase = this.userClient(user);
    const { data, error } = await supabase
      .from('mcp_api_key')
      .insert({
        user_id: user.id,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        encrypted_secret: encryptedSecret,
      })
      .select('*')
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { row: data as McpApiKeyRow, secret };
  }

  async findActiveKeyBySecret(secret: string): Promise<McpApiKeyRow | null> {
    if (!secret.startsWith(MCP_KEY_PREFIX)) {
      return null;
    }

    const prefix = mcpKeyDisplayPrefix(secret);
    const supabase = this.serviceClient();
    const { data, error } = await supabase
      .from('mcp_api_key')
      .select('*')
      .eq('key_prefix', prefix)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    const pepper = this.pepper();
    if (data && verifyMcpApiKey(secret, pepper, data.key_hash)) {
      return data as McpApiKeyRow;
    }

    return null;
  }

  touchLastUsedAt(keyId: string): void {
    const supabase = this.serviceClient();
    void supabase
      .from('mcp_api_key')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyId)
      .then(({ error }) => {
        if (error) {
          // non-blocking
        }
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
