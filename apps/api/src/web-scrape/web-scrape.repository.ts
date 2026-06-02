import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  encryptSecret,
  resolveAiAgentEncryptionKey,
  tryDecryptSecret,
} from '../ai-agent/ai-agent-crypto.util';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import { CvNormalizedRepository } from '../cv/cv-normalized.repository';

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
    return this.normalizedRepo.createClientForUser(user);
  }

  async getStatus(user: AuthenticatedRequest['user']): Promise<WebScrapeConfigStatus> {
    const supabase = this.createClient(user);
    const { data, error } = await supabase
      .from('web_scrape_config')
      .select('provider, api_key_encrypted, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data) {
      return { configured: false };
    }

    const row = data as Pick<WebScrapeConfigRow, 'provider' | 'api_key_encrypted' | 'updated_at'>;
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
    const supabase = this.createClient(user);
    const encrypted = encryptSecret(apiKey, this.getEncryptionKey());

    const { data, error } = await supabase
      .from('web_scrape_config')
      .upsert(
        {
          user_id: user.id,
          provider,
          api_key_encrypted: encrypted,
        },
        { onConflict: 'user_id' },
      )
      .select('provider, updated_at')
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      configured: true,
      provider: data.provider as WebScrapeProvider,
      updatedAt: data.updated_at,
    };
  }

  async clear(user: AuthenticatedRequest['user']): Promise<WebScrapeConfigStatus> {
    const supabase = this.createClient(user);
    const { error } = await supabase.from('web_scrape_config').delete().eq('user_id', user.id);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { configured: false };
  }

  async getDecryptedConfig(
    user: AuthenticatedRequest['user'],
  ): Promise<DecryptedWebScrapeConfig | null> {
    const supabase = this.createClient(user);
    const { data, error } = await supabase
      .from('web_scrape_config')
      .select('provider, api_key_encrypted')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data) {
      return null;
    }

    const row = data as Pick<WebScrapeConfigRow, 'provider' | 'api_key_encrypted'>;
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
