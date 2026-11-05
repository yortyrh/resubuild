import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  findCatalogModel,
  getModelOptionFields,
  InvalidImportModelError,
  InvalidMastraModelIdError,
  InvalidModelOptionsError,
  listCatalogModelsForProvider,
  listCatalogProviders,
  type ModelDisplayNames,
  type ModelOptions,
  modelDisplayNames,
  parseMastraModelId,
  resolveProviderId,
  toProviderOptions,
  validateImportModelId,
  validateModelOptions,
} from '@resubuild/import-models';
import {
  HostedModelsService,
  INCLUDED_DISPLAY_NAME,
  type IncludedStatus,
  type IncludedUsage,
} from '../ai-hosted/hosted-models.service';
import type { AuthenticatedRequest } from '../auth/session-auth.guard';
import { ImportModelsCatalogService } from '../import-models-catalog/import-models-catalog.service';
import type {
  AiAgentAccountSummary,
  AiAgentActiveStatus,
  AiAgentSource,
} from './ai-agent.repository';
import { AiAgentRepository } from './ai-agent.repository';
import { AiAgentCredentialService } from './ai-agent-credential.service';

export type AiAgentAccountView = AiAgentAccountSummary & ModelDisplayNames;
export type AiAgentActiveView = AiAgentActiveStatus &
  Partial<ModelDisplayNames> & {
    /** Which AI runs use: the user's own account or the included models. */
    source?: AiAgentSource;
    /** Included models only: this month's usage against the user's limit. */
    usage?: IncludedUsage;
    /** Included models only: no budget left (user limit or every pool model). */
    exhausted?: boolean;
  };

export const DUPLICATE_MODEL_LABEL_MESSAGE =
  'You already have an account for this model without a label — add a label to tell them apart';

@Injectable()
export class AiAgentService {
  constructor(
    private readonly repository: AiAgentRepository,
    private readonly configService: ConfigService,
    private readonly catalogService: ImportModelsCatalogService,
    private readonly credentials: AiAgentCredentialService,
    private readonly hostedModels: HostedModelsService,
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

  async listAccounts(user: AuthenticatedRequest['user']): Promise<AiAgentAccountView[]> {
    const [accounts, selection] = await Promise.all([
      this.repository.listAccounts(user),
      this.credentials.resolveSelection(user),
    ]);
    return accounts.map((account) => ({
      ...this.toAccountView(account),
      isActive: selection.kind === 'account' && selection.accountId === account.id,
    }));
  }

  async getActiveStatus(user: AuthenticatedRequest['user']): Promise<AiAgentActiveView> {
    const selection = await this.credentials.resolveSelection(user);
    if (selection.kind === 'included') {
      return this.includedActiveView(await this.hostedModels.getIncludedStatus(user.id));
    }
    if (selection.kind === 'none') {
      return { configured: false };
    }
    return { ...this.toActiveView(await this.repository.getActiveStatus(user)), source: 'account' };
  }

  async setActiveAccount(
    user: AuthenticatedRequest['user'],
    accountId: string,
  ): Promise<AiAgentActiveView> {
    await this.repository.setActiveAccount(user, accountId);
    return this.getActiveStatus(user);
  }

  /** Use the app-funded included models for the user's AI runs. */
  async selectIncluded(user: AuthenticatedRequest['user']): Promise<AiAgentActiveView> {
    if (!this.hostedModels.includedEnabled) {
      throw new BadRequestException('Included AI is not available on this server');
    }
    await this.repository.setIncludedSource(user);
    return this.getActiveStatus(user);
  }

  getIncludedStatus(user: AuthenticatedRequest['user']): Promise<IncludedStatus> {
    return this.hostedModels.getIncludedStatus(user.id);
  }

  /** Included AI as the active AI: name and usage only, never the models behind it. */
  private includedActiveView(status: IncludedStatus): AiAgentActiveView {
    const exhausted = !status.available || (status.usage?.remaining ?? 0) <= 0;
    return {
      configured: !exhausted,
      source: 'included',
      displayName: INCLUDED_DISPLAY_NAME,
      usage: status.usage,
      exhausted,
    };
  }

  /** Provider and model names for `modelId` (falls back to the raw ids off-catalog). */
  displayNames(modelId: string, label?: string | null): ModelDisplayNames {
    return modelDisplayNames(this.catalogService.getCatalog(), modelId, label);
  }

  private toAccountView(account: AiAgentAccountSummary): AiAgentAccountView {
    return { ...account, ...this.displayNames(account.modelId, account.label) };
  }

  private toActiveView(status: AiAgentActiveStatus): AiAgentActiveView {
    if (!status.modelId) return status;
    return { ...status, ...this.displayNames(status.modelId, status.label) };
  }

  async createAccount(
    user: AuthenticatedRequest['user'],
    payload: {
      label?: string;
      modelId: string;
      apiKey: string;
      modelOptions?: Record<string, unknown>;
    },
  ): Promise<AiAgentAccountView> {
    this.validateModelId(payload.modelId);
    const modelOptions = this.normalizeModelOptions(payload.modelId, payload.modelOptions);
    const apiKey = payload.apiKey.trim();
    if (!apiKey) {
      throw new BadRequestException('API key is required');
    }

    await this.assertDistinguishable(user, payload.modelId, payload.label ?? null);
    await this.probeApiKey(payload.modelId, apiKey, modelOptions);
    const account = await this.repository.createAccount(user, {
      label: payload.label,
      modelId: payload.modelId,
      apiKey,
      modelOptions,
    });
    return this.toAccountView(account);
  }

  async updateAccount(
    user: AuthenticatedRequest['user'],
    accountId: string,
    payload: {
      label?: string;
      modelId?: string;
      apiKey?: string;
      keepExistingApiKey?: boolean;
      modelOptions?: Record<string, unknown>;
    },
  ): Promise<AiAgentAccountView> {
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

    const row = await this.repository.getAccountRow(user, accountId);
    const resolvedModelId = modelId ?? row.model_id;
    const providerChanged =
      resolveProviderId(parseMastraModelId(resolvedModelId)) !== row.provider_id;

    // Options are provider-specific: keep the stored ones unless replaced, and
    // drop them when the provider changes.
    let modelOptions: ModelOptions | undefined;
    if (payload.modelOptions !== undefined) {
      modelOptions = this.normalizeModelOptions(resolvedModelId, payload.modelOptions);
    } else if (providerChanged || modelId) {
      modelOptions = providerChanged
        ? {}
        : this.normalizeModelOptions(resolvedModelId, row.model_options ?? {});
    }
    const optionsChanged =
      modelOptions !== undefined &&
      JSON.stringify(modelOptions) !== JSON.stringify(row.model_options ?? {});

    const resolvedLabel = payload.label !== undefined ? payload.label : row.label;
    if (modelId || payload.label !== undefined) {
      await this.assertDistinguishable(user, resolvedModelId, resolvedLabel, accountId);
    }

    if (apiKey) {
      await this.probeApiKey(resolvedModelId, apiKey, modelOptions ?? row.model_options ?? {});
    } else if (modelId || optionsChanged) {
      const existing = await this.repository.getDecryptedAccount(user, accountId);
      if (!existing) {
        throw new BadRequestException(
          'API key is required when changing model without a stored key',
        );
      }
      await this.probeApiKey(
        resolvedModelId,
        existing.apiKey,
        modelOptions ?? row.model_options ?? {},
      );
    }

    const account = await this.repository.updateAccount(user, accountId, {
      label: payload.label,
      modelId,
      apiKey,
      modelOptions,
    });
    return this.toAccountView(account);
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

  /**
   * Validate options for the model's provider. Reasoning-only options are
   * dropped for models the catalog does not mark as reasoning models.
   */
  private normalizeModelOptions(modelId: string, options: unknown): ModelOptions {
    const providerId = resolveProviderId(parseMastraModelId(modelId));
    let normalized: ModelOptions;
    try {
      normalized = validateModelOptions(providerId, options);
    } catch (error) {
      if (error instanceof InvalidModelOptionsError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    const reasoning = findCatalogModel(this.catalogService.getCatalog(), modelId)?.model.reasoning;
    if (!reasoning) {
      for (const field of getModelOptionFields(providerId)) {
        if (field.reasoningOnly) delete normalized[field.key];
      }
    }
    return normalized;
  }

  /**
   * Two accounts for the same model need a label to tell them apart: reject a
   * label-less account when another label-less one uses the same model.
   */
  private async assertDistinguishable(
    user: AuthenticatedRequest['user'],
    modelId: string,
    label: string | null | undefined,
    excludeAccountId?: string,
  ): Promise<void> {
    if (label?.trim()) return;
    const accounts = await this.repository.listAccounts(user);
    const clash = accounts.some(
      (account) =>
        account.id !== excludeAccountId && account.modelId === modelId && !account.label?.trim(),
    );
    if (clash) {
      throw new ConflictException(DUPLICATE_MODEL_LABEL_MESSAGE);
    }
  }

  private async probeApiKey(
    modelId: string,
    apiKey: string,
    modelOptions: ModelOptions = {},
  ): Promise<void> {
    if (this.configService.get<string>('NODE_ENV') === 'test') {
      if (apiKey === 'invalid-key') {
        throw new UnprocessableEntityException('API key probe failed');
      }
      return;
    }

    const providerId = resolveProviderId(parseMastraModelId(modelId));
    const providerOptions = toProviderOptions(providerId, modelOptions);
    try {
      const { Agent } = await import('@mastra/core/agent');
      const agent = new Agent({
        id: 'ai-agent-probe',
        name: 'ai-agent-probe',
        instructions: 'Reply with OK.',
        // The key goes with the model config, never through process.env.
        model: { id: modelId as `${string}/${string}`, apiKey },
      });
      if (providerOptions) {
        await agent.generate('ping', { providerOptions } as never);
      } else {
        await agent.generate('ping');
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : '';
      const hint = providerOptions && /option|param|support|invalid/i.test(detail);
      throw new UnprocessableEntityException(
        hint
          ? `API key probe failed — the model may not support these options: ${detail}`
          : 'API key probe failed',
      );
    }
  }
}
