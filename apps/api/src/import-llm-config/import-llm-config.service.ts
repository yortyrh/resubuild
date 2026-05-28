import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type ImportModelCatalog,
  InvalidImportModelError,
  InvalidMastraModelIdError,
  listCatalogModelsForProvider,
  listCatalogProviders,
  validateImportModelId,
} from '@resumind/import-models';
import catalog from '@resumind/import-models/catalog.json';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import { CvNormalizedRepository } from '../cv/cv-normalized.repository';
import {
  decryptSecret,
  encryptSecret,
  ImportLlmConfigDecryptionError,
  tryDecryptSecret,
} from './import-llm-crypto.util';

export interface ImportLlmConfigStatus {
  configured: boolean;
  modelId?: string;
  configuredAt?: string;
  /** True when a row exists but cannot be decrypted with the current encryption key. */
  reconfigurationRequired?: boolean;
}

export interface SavedImportLlmConfig {
  modelId: string;
  apiKey: string;
  configuredAt: string;
}

@Injectable()
export class ImportLlmConfigRepository {
  constructor(
    private readonly configService: ConfigService,
    private readonly normalizedRepo: CvNormalizedRepository,
  ) {}

  private getEncryptionKey(): string {
    const key = this.configService.get<string>('IMPORT_LLM_CONFIG_ENCRYPTION_KEY');
    if (!key) {
      throw new BadRequestException('IMPORT_LLM_CONFIG_ENCRYPTION_KEY is not configured');
    }
    return key;
  }

  async getStatus(user: AuthenticatedRequest['user']): Promise<ImportLlmConfigStatus> {
    const supabase = this.normalizedRepo.createUserClient(user.accessToken);
    const { data, error } = await supabase
      .from('import_llm_config')
      .select('model_id, api_key_encrypted, configured_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data) {
      return { configured: false };
    }

    const apiKey = tryDecryptSecret(data.api_key_encrypted, this.getEncryptionKey());
    if (!apiKey) {
      return {
        configured: false,
        modelId: data.model_id,
        configuredAt: data.configured_at,
        reconfigurationRequired: true,
      };
    }

    return {
      configured: true,
      modelId: data.model_id,
      configuredAt: data.configured_at,
    };
  }

  async getDecryptedConfig(
    user: AuthenticatedRequest['user'],
  ): Promise<SavedImportLlmConfig | null> {
    const supabase = this.normalizedRepo.createUserClient(user.accessToken);
    const { data, error } = await supabase
      .from('import_llm_config')
      .select('model_id, api_key_encrypted, configured_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data) {
      return null;
    }

    try {
      return {
        modelId: data.model_id,
        apiKey: decryptSecret(data.api_key_encrypted, this.getEncryptionKey()),
        configuredAt: data.configured_at,
      };
    } catch (error) {
      if (error instanceof ImportLlmConfigDecryptionError) {
        throw new UnprocessableEntityException(error.message);
      }
      throw error;
    }
  }

  async saveConfig(
    user: AuthenticatedRequest['user'],
    modelId: string,
    apiKey: string,
  ): Promise<ImportLlmConfigStatus> {
    const supabase = this.normalizedRepo.createUserClient(user.accessToken);
    const encrypted = encryptSecret(apiKey, this.getEncryptionKey());
    const { data, error } = await supabase
      .from('import_llm_config')
      .upsert(
        {
          user_id: user.id,
          model_id: modelId,
          api_key_encrypted: encrypted,
          configured_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      .select('model_id, configured_at')
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      configured: true,
      modelId: data.model_id,
      configuredAt: data.configured_at,
    };
  }
}

@Injectable()
export class ImportLlmConfigService {
  private readonly catalog = catalog as ImportModelCatalog;

  constructor(
    private readonly repository: ImportLlmConfigRepository,
    private readonly configService: ConfigService,
  ) {}

  listProviders() {
    return listCatalogProviders(this.catalog);
  }

  listModels(providerId: string) {
    const models = listCatalogModelsForProvider(providerId, this.catalog);
    if (models.length === 0) {
      throw new NotFoundException(`Provider "${providerId}" was not found`);
    }
    return models;
  }

  getConfig(user: AuthenticatedRequest['user']) {
    return this.repository.getStatus(user);
  }

  private resolveApiKeyEnvVar(modelId: string): string | null {
    for (const provider of this.catalog.providers) {
      if (provider.models.some((model) => model.id === modelId)) {
        return provider.apiKeyEnvVar;
      }
    }
    return null;
  }

  private async withScopedApiKey<T>(
    modelId: string,
    apiKey: string,
    action: () => Promise<T>,
  ): Promise<T> {
    const envVar = this.resolveApiKeyEnvVar(modelId);
    if (!envVar) {
      return action();
    }

    const previous = process.env[envVar];
    process.env[envVar] = apiKey;
    try {
      return await action();
    } finally {
      if (previous === undefined) {
        delete process.env[envVar];
      } else {
        process.env[envVar] = previous;
      }
    }
  }

  async saveConfig(
    user: AuthenticatedRequest['user'],
    payload: { modelId: string; apiKey?: string; keepExistingApiKey?: boolean },
  ) {
    try {
      validateImportModelId(payload.modelId, this.catalog);
    } catch (error) {
      if (error instanceof InvalidMastraModelIdError || error instanceof InvalidImportModelError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    let apiKey = payload.apiKey?.trim();
    if (!apiKey && payload.keepExistingApiKey) {
      try {
        const existing = await this.repository.getDecryptedConfig(user);
        if (!existing) {
          throw new BadRequestException('API key is required for first-time configuration');
        }
        apiKey = existing.apiKey;
      } catch (error) {
        if (error instanceof UnprocessableEntityException) {
          throw new BadRequestException(
            'Stored API key cannot be read — enter your API key again after an encryption key change',
          );
        }
        throw error;
      }
    }

    if (!apiKey) {
      throw new BadRequestException('API key is required');
    }

    await this.probeApiKey(payload.modelId, apiKey);
    return this.repository.saveConfig(user, payload.modelId, apiKey);
  }

  private async probeApiKey(modelId: string, apiKey: string): Promise<void> {
    if (this.configService.get<string>('NODE_ENV') === 'test') {
      if (apiKey === 'invalid-key') {
        throw new UnprocessableEntityException('API key probe failed');
      }
      return;
    }

    try {
      await this.withScopedApiKey(modelId, apiKey, async () => {
        const { Agent } = await import('@mastra/core/agent');
        const agent = new Agent({
          name: 'import-llm-probe',
          instructions: 'Reply with OK.',
          model: modelId,
        });
        await agent.generate('ping');
      });
    } catch {
      throw new UnprocessableEntityException('API key probe failed');
    }
  }
}
