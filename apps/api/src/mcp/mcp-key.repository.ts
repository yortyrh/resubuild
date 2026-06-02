import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  label: string | null;
  key_prefix: string;
  key_hash: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
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

  async listKeys(user: AuthUser): Promise<McpApiKeyRow[]> {
    const supabase = this.userClient(user);
    const { data, error } = await supabase
      .from('mcp_api_key')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return (data ?? []) as McpApiKeyRow[];
  }

  async countActiveKeys(user: AuthUser): Promise<number> {
    const keys = await this.listKeys(user);
    return keys.filter((k) => !k.revoked_at).length;
  }

  async createKey(
    user: AuthUser,
    label: string | null,
  ): Promise<{ row: McpApiKeyRow; secret: string }> {
    const secret = generateMcpApiKeySecret();
    const keyHash = hashMcpApiKey(secret, this.pepper());
    const keyPrefix = mcpKeyDisplayPrefix(secret);

    const supabase = this.userClient(user);
    const { data, error } = await supabase
      .from('mcp_api_key')
      .insert({
        user_id: user.id,
        label,
        key_prefix: keyPrefix,
        key_hash: keyHash,
      })
      .select('*')
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { row: data as McpApiKeyRow, secret };
  }

  async revokeKey(user: AuthUser, keyId: string): Promise<void> {
    const supabase = this.userClient(user);
    const { data, error } = await supabase
      .from('mcp_api_key')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', keyId)
      .eq('user_id', user.id)
      .is('revoked_at', null)
      .select('id')
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data) {
      const existing = await supabase
        .from('mcp_api_key')
        .select('id, revoked_at')
        .eq('id', keyId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existing.data) {
        throw new BadRequestException('Key not found');
      }
    }
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
      .is('revoked_at', null);

    if (error) {
      throw new BadRequestException(error.message);
    }

    const pepper = this.pepper();
    for (const row of (data ?? []) as McpApiKeyRow[]) {
      if (verifyMcpApiKey(secret, pepper, row.key_hash)) {
        return row;
      }
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
}
