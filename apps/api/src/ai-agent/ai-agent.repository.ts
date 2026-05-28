import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseMastraModelId, resolveProviderId } from '@resumind/import-models';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import { CvNormalizedRepository } from '../cv/cv-normalized.repository';
import {
  AiAgentDecryptionError,
  decryptSecret,
  encryptSecret,
  resolveAiAgentEncryptionKey,
  tryDecryptSecret,
} from './ai-agent-crypto.util';

export interface AiAgentAccountRow {
  id: string;
  user_id: string;
  label: string | null;
  provider_id: string;
  model_id: string;
  api_key_encrypted: string;
  created_at: string;
  updated_at: string;
}

export interface AiAgentAccountSummary {
  id: string;
  label: string | null;
  providerId: string;
  modelId: string;
  isActive: boolean;
  reconfigurationRequired?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AiAgentActiveStatus {
  configured: boolean;
  accountId?: string;
  label?: string | null;
  providerId?: string;
  modelId?: string;
  configuredAt?: string;
  reconfigurationRequired?: boolean;
}

export interface DecryptedAiAgentAccount {
  id: string;
  modelId: string;
  apiKey: string;
  providerId: string;
  label: string | null;
  updatedAt: string;
}

@Injectable()
export class AiAgentRepository {
  constructor(
    private readonly configService: ConfigService,
    private readonly normalizedRepo: CvNormalizedRepository,
  ) {}

  private getEncryptionKey(): string {
    const key = resolveAiAgentEncryptionKey(this.configService);
    if (!key) {
      throw new BadRequestException(
        'AI_AGENT_ENCRYPTION_KEY (or IMPORT_LLM_CONFIG_ENCRYPTION_KEY) is not configured',
      );
    }
    return key;
  }

  private createClient(user: AuthenticatedRequest['user']) {
    return this.normalizedRepo.createUserClient(user.accessToken);
  }

  private async getActiveAccountId(user: AuthenticatedRequest['user']): Promise<string | null> {
    const supabase = this.createClient(user);
    const { data, error } = await supabase
      .from('ai_agent_preference')
      .select('active_account_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data?.active_account_id ?? null;
  }

  private toSummary(row: AiAgentAccountRow, activeAccountId: string | null): AiAgentAccountSummary {
    const apiKey = tryDecryptSecret(row.api_key_encrypted, this.getEncryptionKey());
    return {
      id: row.id,
      label: row.label,
      providerId: row.provider_id,
      modelId: row.model_id,
      isActive: row.id === activeAccountId,
      ...(apiKey ? {} : { reconfigurationRequired: true }),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async listAccounts(user: AuthenticatedRequest['user']): Promise<AiAgentAccountSummary[]> {
    const supabase = this.createClient(user);
    const activeAccountId = await this.getActiveAccountId(user);

    const { data, error } = await supabase
      .from('ai_agent_account')
      .select(
        'id, user_id, label, provider_id, model_id, api_key_encrypted, created_at, updated_at',
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return (data ?? []).map((row) => this.toSummary(row as AiAgentAccountRow, activeAccountId));
  }

  async getAccountRow(
    user: AuthenticatedRequest['user'],
    accountId: string,
  ): Promise<AiAgentAccountRow> {
    const supabase = this.createClient(user);
    const { data, error } = await supabase
      .from('ai_agent_account')
      .select(
        'id, user_id, label, provider_id, model_id, api_key_encrypted, created_at, updated_at',
      )
      .eq('user_id', user.id)
      .eq('id', accountId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new NotFoundException(`AI agent account "${accountId}" was not found`);
    }

    return data as AiAgentAccountRow;
  }

  async createAccount(
    user: AuthenticatedRequest['user'],
    input: { label?: string | null; modelId: string; apiKey: string },
  ): Promise<AiAgentAccountSummary> {
    const parsed = parseMastraModelId(input.modelId);
    const providerId = resolveProviderId(parsed);
    const supabase = this.createClient(user);
    const encrypted = encryptSecret(input.apiKey, this.getEncryptionKey());

    const { data, error } = await supabase
      .from('ai_agent_account')
      .insert({
        user_id: user.id,
        label: input.label?.trim() || null,
        provider_id: providerId,
        model_id: input.modelId,
        api_key_encrypted: encrypted,
      })
      .select(
        'id, user_id, label, provider_id, model_id, api_key_encrypted, created_at, updated_at',
      )
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    const activeAccountId = await this.getActiveAccountId(user);
    if (!activeAccountId) {
      await this.setActiveAccountId(user, data.id);
      return this.toSummary(data as AiAgentAccountRow, data.id);
    }

    return this.toSummary(data as AiAgentAccountRow, activeAccountId);
  }

  async updateAccount(
    user: AuthenticatedRequest['user'],
    accountId: string,
    input: { label?: string | null; modelId?: string; apiKey?: string },
  ): Promise<AiAgentAccountSummary> {
    const existing = await this.getAccountRow(user, accountId);
    const updates: Record<string, string | null> = {};

    if (input.label !== undefined) {
      updates.label = input.label?.trim() || null;
    }

    if (input.modelId) {
      const parsed = parseMastraModelId(input.modelId);
      updates.model_id = input.modelId;
      updates.provider_id = resolveProviderId(parsed);
    }

    if (input.apiKey) {
      updates.api_key_encrypted = encryptSecret(input.apiKey, this.getEncryptionKey());
    }

    const supabase = this.createClient(user);
    const { data, error } = await supabase
      .from('ai_agent_account')
      .update(updates)
      .eq('user_id', user.id)
      .eq('id', accountId)
      .select(
        'id, user_id, label, provider_id, model_id, api_key_encrypted, created_at, updated_at',
      )
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new NotFoundException(`AI agent account "${accountId}" was not found`);
    }

    void existing;
    const activeAccountId = await this.getActiveAccountId(user);
    return this.toSummary(data as AiAgentAccountRow, activeAccountId);
  }

  async deleteAccount(user: AuthenticatedRequest['user'], accountId: string): Promise<void> {
    await this.getAccountRow(user, accountId);
    const supabase = this.createClient(user);
    const { error } = await supabase
      .from('ai_agent_account')
      .delete()
      .eq('user_id', user.id)
      .eq('id', accountId);

    if (error) {
      throw new BadRequestException(error.message);
    }
  }

  private async setActiveAccountId(
    user: AuthenticatedRequest['user'],
    accountId: string,
  ): Promise<void> {
    const supabase = this.createClient(user);
    const { error } = await supabase.from('ai_agent_preference').upsert(
      {
        user_id: user.id,
        active_account_id: accountId,
      },
      { onConflict: 'user_id' },
    );

    if (error) {
      throw new BadRequestException(error.message);
    }
  }

  async setActiveAccount(
    user: AuthenticatedRequest['user'],
    accountId: string,
  ): Promise<AiAgentActiveStatus> {
    await this.getAccountRow(user, accountId);
    await this.setActiveAccountId(user, accountId);
    return this.getActiveStatus(user);
  }

  async getActiveStatus(user: AuthenticatedRequest['user']): Promise<AiAgentActiveStatus> {
    const activeAccountId = await this.getActiveAccountId(user);
    if (!activeAccountId) {
      return { configured: false };
    }

    let row: AiAgentAccountRow;
    try {
      row = await this.getAccountRow(user, activeAccountId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return { configured: false };
      }
      throw error;
    }

    const apiKey = tryDecryptSecret(row.api_key_encrypted, this.getEncryptionKey());
    if (!apiKey) {
      return {
        configured: false,
        accountId: row.id,
        label: row.label,
        providerId: row.provider_id,
        modelId: row.model_id,
        configuredAt: row.updated_at,
        reconfigurationRequired: true,
      };
    }

    return {
      configured: true,
      accountId: row.id,
      label: row.label,
      providerId: row.provider_id,
      modelId: row.model_id,
      configuredAt: row.updated_at,
    };
  }

  async getDecryptedActiveAccount(
    user: AuthenticatedRequest['user'],
  ): Promise<DecryptedAiAgentAccount | null> {
    const activeAccountId = await this.getActiveAccountId(user);
    if (!activeAccountId) {
      return null;
    }

    const row = await this.getAccountRow(user, activeAccountId).catch((error) => {
      if (error instanceof NotFoundException) {
        return null;
      }
      throw error;
    });

    if (!row) {
      return null;
    }

    try {
      return {
        id: row.id,
        modelId: row.model_id,
        apiKey: decryptSecret(row.api_key_encrypted, this.getEncryptionKey()),
        providerId: row.provider_id,
        label: row.label,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      if (error instanceof AiAgentDecryptionError) {
        return null;
      }
      throw error;
    }
  }

  async getDecryptedAccount(
    user: AuthenticatedRequest['user'],
    accountId: string,
  ): Promise<DecryptedAiAgentAccount | null> {
    let row: AiAgentAccountRow;
    try {
      row = await this.getAccountRow(user, accountId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }
      throw error;
    }

    try {
      return {
        id: row.id,
        modelId: row.model_id,
        apiKey: decryptSecret(row.api_key_encrypted, this.getEncryptionKey()),
        providerId: row.provider_id,
        label: row.label,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      if (error instanceof AiAgentDecryptionError) {
        return null;
      }
      throw error;
    }
  }
}
