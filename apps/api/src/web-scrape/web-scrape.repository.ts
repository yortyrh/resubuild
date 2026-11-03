import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Database, eq, webScrapeConfig } from '@resubuild/db';
import {
  encryptSecret,
  resolveAiAgentEncryptionKey,
  tryDecryptSecret,
} from '../ai-agent/ai-agent-crypto.util';
import type { AuthenticatedRequest } from '../auth/session-auth.guard';
import { DATABASE } from '../database/database.tokens';

export type WebScrapeProvider = 'firecrawl' | 'tavily';

export interface WebScrapeConfigRow {
  user_id: string;
  provider: WebScrapeProvider;
  api_key_encrypted: string;
  created_at: string;
  updated_at: string;
}

export interface WebScrapeConfigStatus {
  configured: boolean;
  provider?: WebScrapeProvider;
  reconfigurationRequired?: boolean;
  updatedAt?: string;
}

export interface DecryptedWebScrapeConfig {
  provider: WebScrapeProvider;
  apiKey: string;
}

@Injectable()
export class WebScrapeRepository {
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

  private async findRow(user: AuthenticatedRequest['user']) {
    const rows = await this.db
      .select()
      .from(webScrapeConfig)
      .where(eq(webScrapeConfig.user_id, user.id))
      .limit(1);
    return rows[0] as WebScrapeConfigRow | undefined;
  }

  async getStatus(user: AuthenticatedRequest['user']): Promise<WebScrapeConfigStatus> {
    const row = await this.findRow(user);
    if (!row) {
      return { configured: false };
    }

    const apiKey = tryDecryptSecret(row.api_key_encrypted, this.getEncryptionKey());

    return {
      configured: Boolean(apiKey),
      provider: row.provider,
      updatedAt: row.updated_at,
      ...(apiKey ? {} : { reconfigurationRequired: true }),
    };
  }

  async save(
    user: AuthenticatedRequest['user'],
    provider: WebScrapeProvider,
    apiKey: string,
  ): Promise<WebScrapeConfigStatus> {
    const encrypted = encryptSecret(apiKey, this.getEncryptionKey());

    const [data] = await this.db
      .insert(webScrapeConfig)
      .values({ user_id: user.id, provider, api_key_encrypted: encrypted })
      .onConflictDoUpdate({
        target: webScrapeConfig.user_id,
        set: { provider, api_key_encrypted: encrypted },
      })
      .returning({ provider: webScrapeConfig.provider, updated_at: webScrapeConfig.updated_at });

    return {
      configured: true,
      provider: data.provider as WebScrapeProvider,
      updatedAt: data.updated_at,
    };
  }

  async clear(user: AuthenticatedRequest['user']): Promise<WebScrapeConfigStatus> {
    await this.db.delete(webScrapeConfig).where(eq(webScrapeConfig.user_id, user.id));
    return { configured: false };
  }

  async getDecryptedConfig(
    user: AuthenticatedRequest['user'],
  ): Promise<DecryptedWebScrapeConfig | null> {
    const row = await this.findRow(user);
    if (!row) {
      return null;
    }

    const apiKey = tryDecryptSecret(row.api_key_encrypted, this.getEncryptionKey());
    if (!apiKey) {
      return null;
    }

    return {
      provider: row.provider,
      apiKey,
    };
  }
}
