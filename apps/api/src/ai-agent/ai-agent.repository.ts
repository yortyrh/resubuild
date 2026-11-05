import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { aiAgentAccount, aiAgentPreference, and, asc, type Database, eq } from '@resubuild/db';
import { parseMastraModelId, resolveProviderId } from '@resubuild/import-models';
import type { AuthenticatedRequest } from '../auth/session-auth.guard';
import { DATABASE } from '../database/database.tokens';
import {
  AiAgentDecryptionError,
  decryptSecret,
  encryptSecret,
  resolveAiAgentEncryptionKey,
  tryDecryptSecret,
} from './ai-agent-crypto.util';

export type AiAgentSource = 'account' | 'included';

export interface AiAgentAccountRow {
  id: string;
  user_id: string;
  label: string | null;
  provider_id: string;
  model_id: string;
  api_key_encrypted: string;
  model_options: Record<string, string | number>;
  created_at: string;
  updated_at: string;
}

export interface AiAgentAccountSummary {
  id: string;
  label: string | null;
  providerId: string;
  modelId: string;
  modelOptions: Record<string, string | number>;
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
  modelOptions?: Record<string, string | number>;
  configuredAt?: string;
  reconfigurationRequired?: boolean;
}

export interface DecryptedAiAgentAccount {
  id: string;
  modelId: string;
  modelOptions: Record<string, string | number>;
  apiKey: string;
  providerId: string;
  label: string | null;
  updatedAt: string;
}

@Injectable()
export class AiAgentRepository {
  constructor(
    private readonly configService: ConfigService,
    @Inject(DATABASE) private readonly db: Database,
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

  /**
   * The user's AI selection as stored: `source` says whether runs use their own
   * account (`activeAccountId`) or the app-funded included models. The account
   * id is kept while `included` is selected so switching back is one step.
   */
  async getPreference(
    user: AuthenticatedRequest['user'],
  ): Promise<{ activeAccountId: string | null; source: AiAgentSource }> {
    const rows = await this.db
      .select({
        active_account_id: aiAgentPreference.active_account_id,
        active_source: aiAgentPreference.active_source,
      })
      .from(aiAgentPreference)
      .where(eq(aiAgentPreference.user_id, user.id))
      .limit(1);

    return {
      activeAccountId: rows[0]?.active_account_id ?? null,
      source: rows[0]?.active_source ?? 'account',
    };
  }

  private async getActiveAccountId(user: AuthenticatedRequest['user']): Promise<string | null> {
    return (await this.getPreference(user)).activeAccountId;
  }

  /** Select the app-funded included models (keeps the stored account id). */
  async setIncludedSource(user: AuthenticatedRequest['user']): Promise<void> {
    await this.db
      .insert(aiAgentPreference)
      .values({ user_id: user.id, active_source: 'included' })
      .onConflictDoUpdate({
        target: aiAgentPreference.user_id,
        set: { active_source: 'included' },
      });
  }

  private toSummary(row: AiAgentAccountRow, activeAccountId: string | null): AiAgentAccountSummary {
    const apiKey = tryDecryptSecret(row.api_key_encrypted, this.getEncryptionKey());
    return {
      id: row.id,
      label: row.label,
      providerId: row.provider_id,
      modelId: row.model_id,
      modelOptions: row.model_options ?? {},
      isActive: row.id === activeAccountId,
      ...(apiKey ? {} : { reconfigurationRequired: true }),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async listAccounts(user: AuthenticatedRequest['user']): Promise<AiAgentAccountSummary[]> {
    const activeAccountId = await this.getActiveAccountId(user);

    const rows = await this.db
      .select()
      .from(aiAgentAccount)
      .where(eq(aiAgentAccount.user_id, user.id))
      .orderBy(asc(aiAgentAccount.created_at));

    return rows.map((row) => this.toSummary(row, activeAccountId));
  }

  async getAccountRow(
    user: AuthenticatedRequest['user'],
    accountId: string,
  ): Promise<AiAgentAccountRow> {
    const rows = await this.db
      .select()
      .from(aiAgentAccount)
      .where(and(eq(aiAgentAccount.user_id, user.id), eq(aiAgentAccount.id, accountId)))
      .limit(1);

    if (!rows[0]) {
      throw new NotFoundException(`AI agent account "${accountId}" was not found`);
    }

    return rows[0];
  }

  async createAccount(
    user: AuthenticatedRequest['user'],
    input: {
      label?: string | null;
      modelId: string;
      apiKey: string;
      modelOptions?: Record<string, string | number>;
    },
  ): Promise<AiAgentAccountSummary> {
    const parsed = parseMastraModelId(input.modelId);
    const providerId = resolveProviderId(parsed);
    const encrypted = encryptSecret(input.apiKey, this.getEncryptionKey());

    const [data] = await this.db
      .insert(aiAgentAccount)
      .values({
        user_id: user.id,
        label: input.label?.trim() || null,
        provider_id: providerId,
        model_id: input.modelId,
        api_key_encrypted: encrypted,
        model_options: input.modelOptions ?? {},
      })
      .returning();

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
    input: {
      label?: string | null;
      modelId?: string;
      apiKey?: string;
      modelOptions?: Record<string, string | number>;
    },
  ): Promise<AiAgentAccountSummary> {
    const existing = await this.getAccountRow(user, accountId);
    const updates: Partial<
      Pick<
        AiAgentAccountRow,
        'label' | 'model_id' | 'provider_id' | 'api_key_encrypted' | 'model_options'
      >
    > = {};

    if (input.label !== undefined) {
      updates.label = input.label?.trim() || null;
    }

    if (input.modelId) {
      const parsed = parseMastraModelId(input.modelId);
      updates.model_id = input.modelId;
      updates.provider_id = resolveProviderId(parsed);
    }

    if (input.modelOptions !== undefined) {
      updates.model_options = input.modelOptions;
    }

    if (input.apiKey) {
      updates.api_key_encrypted = encryptSecret(input.apiKey, this.getEncryptionKey());
    }

    let row = existing;
    if (Object.keys(updates).length > 0) {
      const [data] = await this.db
        .update(aiAgentAccount)
        .set(updates)
        .where(and(eq(aiAgentAccount.user_id, user.id), eq(aiAgentAccount.id, accountId)))
        .returning();

      if (!data) {
        throw new NotFoundException(`AI agent account "${accountId}" was not found`);
      }
      row = data;
    }

    const activeAccountId = await this.getActiveAccountId(user);
    return this.toSummary(row, activeAccountId);
  }

  async deleteAccount(user: AuthenticatedRequest['user'], accountId: string): Promise<void> {
    await this.getAccountRow(user, accountId);
    await this.db
      .delete(aiAgentAccount)
      .where(and(eq(aiAgentAccount.user_id, user.id), eq(aiAgentAccount.id, accountId)));
  }

  private async setActiveAccountId(
    user: AuthenticatedRequest['user'],
    accountId: string,
  ): Promise<void> {
    await this.db
      .insert(aiAgentPreference)
      .values({ user_id: user.id, active_account_id: accountId, active_source: 'account' })
      .onConflictDoUpdate({
        target: aiAgentPreference.user_id,
        set: { active_account_id: accountId, active_source: 'account' },
      });
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
        modelOptions: row.model_options ?? {},
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
      modelOptions: row.model_options ?? {},
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
        modelOptions: row.model_options ?? {},
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
        modelOptions: row.model_options ?? {},
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
