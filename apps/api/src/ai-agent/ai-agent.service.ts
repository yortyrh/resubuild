import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  InvalidImportModelError,
  InvalidMastraModelIdError,
  listCatalogModelsForProvider,
  listCatalogProviders,
  validateImportModelId,
} from '@resumind/import-models';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import { ImportModelsCatalogService } from '../import-models-catalog/import-models-catalog.service';
import type { AiAgentAccountSummary, AiAgentActiveStatus } from './ai-agent.repository';
import { AiAgentRepository } from './ai-agent.repository';

@Injectable()
export class AiAgentService {
  constructor(
    private readonly repository: AiAgentRepository,
    private readonly configService: ConfigService,
    private readonly catalogService: ImportModelsCatalogService,
  ) {}

  listProviders() {
    return listCatalogProviders(this.catalogService.getCatalog());
  }

  listModels(providerId: string) {
    const models = listCatalogModelsForProvider(providerId, this.catalogService.getCatalog());
    if (models.length === 0) {
      throw new NotFoundException(`Provider "${providerId}" was not found`);
    }
    return models;
  }

  listAccounts(user: AuthenticatedRequest['user']): Promise<AiAgentAccountSummary[]> {
    return this.repository.listAccounts(user);
  }

  getActiveStatus(user: AuthenticatedRequest['user']): Promise<AiAgentActiveStatus> {
    return this.repository.getActiveStatus(user);
  }

  setActiveAccount(
    user: AuthenticatedRequest['user'],
    accountId: string,
  ): Promise<AiAgentActiveStatus> {
    return this.repository.setActiveAccount(user, accountId);
  }

  async createAccount(
    user: AuthenticatedRequest['user'],
    payload: { label?: string; modelId: string; apiKey: string },
  ): Promise<AiAgentAccountSummary> {
    this.validateModelId(payload.modelId);
    const apiKey = payload.apiKey.trim();
    if (!apiKey) {
      throw new BadRequestException('API key is required');
    }

    await this.probeApiKey(payload.modelId, apiKey);
    return this.repository.createAccount(user, {
      label: payload.label,
      modelId: payload.modelId,
      apiKey,
    });
  }

  async updateAccount(
    user: AuthenticatedRequest['user'],
    accountId: string,
    payload: {
      label?: string;
      modelId?: string;
      apiKey?: string;
      keepExistingApiKey?: boolean;
    },
  ): Promise<AiAgentAccountSummary> {
    const modelId = payload.modelId;
    if (modelId) {
      this.validateModelId(modelId);
    }

    let apiKey = payload.apiKey?.trim();
    if (!apiKey && payload.keepExistingApiKey) {
      const existing = await this.repository.getDecryptedAccount(user, accountId);
      if (!existing) {
        throw new BadRequestException(
          'Stored API key cannot be read — enter your API key again after an encryption key change',
        );
      }
      apiKey = existing.apiKey;
    }

    const resolvedModelId =
      modelId ?? (await this.repository.getAccountRow(user, accountId)).model_id;

    if (apiKey) {
      await this.probeApiKey(resolvedModelId, apiKey);
    } else if (modelId) {
      const existing = await this.repository.getDecryptedAccount(user, accountId);
      if (!existing) {
        throw new BadRequestException(
          'API key is required when changing model without a stored key',
        );
      }
      await this.probeApiKey(resolvedModelId, existing.apiKey);
    }

    return this.repository.updateAccount(user, accountId, {
      label: payload.label,
      modelId,
      apiKey,
    });
  }

  deleteAccount(user: AuthenticatedRequest['user'], accountId: string): Promise<void> {
    return this.repository.deleteAccount(user, accountId);
  }

  /** Legacy single-config save: upsert first account or update active account. */
  async saveLegacyConfig(
    user: AuthenticatedRequest['user'],
    payload: { modelId: string; apiKey?: string; keepExistingApiKey?: boolean },
  ): Promise<AiAgentActiveStatus> {
    const accounts = await this.repository.listAccounts(user);
    const active = await this.repository.getActiveStatus(user);

    let apiKey = payload.apiKey?.trim();
    if (!apiKey && payload.keepExistingApiKey) {
      const targetId = active.accountId ?? accounts[0]?.id;
      if (!targetId) {
        throw new BadRequestException('API key is required for first-time configuration');
      }
      const existing = await this.repository.getDecryptedAccount(user, targetId);
      if (!existing) {
        throw new BadRequestException(
          'Stored API key cannot be read — enter your API key again after an encryption key change',
        );
      }
      apiKey = existing.apiKey;
    }

    if (!apiKey) {
      throw new BadRequestException('API key is required');
    }

    this.validateModelId(payload.modelId);
    await this.probeApiKey(payload.modelId, apiKey);

    if (accounts.length === 0) {
      await this.repository.createAccount(user, {
        label: 'Default',
        modelId: payload.modelId,
        apiKey,
      });
      return this.repository.getActiveStatus(user);
    }

    const targetId = active.accountId ?? accounts[0].id;
    await this.repository.updateAccount(user, targetId, {
      modelId: payload.modelId,
      apiKey,
    });

    if (!active.accountId) {
      await this.repository.setActiveAccount(user, targetId);
    }

    return this.repository.getActiveStatus(user);
  }

  private validateModelId(modelId: string): void {
    try {
      validateImportModelId(modelId, this.catalogService.getCatalog());
    } catch (error) {
      if (error instanceof InvalidMastraModelIdError || error instanceof InvalidImportModelError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private resolveApiKeyEnvVar(modelId: string): string | null {
    for (const provider of this.catalogService.getCatalog().providers) {
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
          name: 'ai-agent-probe',
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
