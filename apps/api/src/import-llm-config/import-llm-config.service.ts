import { UnprocessableEntityException, Injectable } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import type { AiAgentActiveStatus } from '../ai-agent/ai-agent.repository';
import { AiAgentRepository } from '../ai-agent/ai-agent.repository';
import { AiAgentService } from '../ai-agent/ai-agent.service';

/** @deprecated Use AiAgentActiveStatus */
export type ImportLlmConfigStatus = AiAgentActiveStatus & {
  modelId?: string;
  configuredAt?: string;
};

@Injectable()
export class ImportLlmConfigRepository {
  constructor(
    private readonly aiAgentRepository: AiAgentRepository,
    private readonly aiAgentService: AiAgentService,
  ) {}

  async getStatus(user: AuthenticatedRequest['user']): Promise<ImportLlmConfigStatus> {
    const status = await this.aiAgentRepository.getActiveStatus(user);
    return {
      ...status,
      modelId: status.modelId,
      configuredAt: status.configuredAt,
    };
  }

  async getDecryptedConfig(user: AuthenticatedRequest['user']) {
    const account = await this.aiAgentRepository.getDecryptedActiveAccount(user);
    if (!account) {
      const status = await this.aiAgentRepository.getActiveStatus(user);
      if (status.reconfigurationRequired) {
        throw new UnprocessableEntityException(
          'Unable to decrypt AI agent configuration — re-save your API key in AI agent settings',
        );
      }
      return null;
    }

    return {
      modelId: account.modelId,
      apiKey: account.apiKey,
      configuredAt: account.updatedAt,
    };
  }

  async saveConfig(user: AuthenticatedRequest['user'], modelId: string, apiKey: string) {
    const status = await this.aiAgentService.saveLegacyConfig(user, { modelId, apiKey });
    return {
      configured: status.configured,
      modelId: status.modelId,
      configuredAt: status.configuredAt,
      reconfigurationRequired: status.reconfigurationRequired,
    };
  }
}

@Injectable()
export class ImportLlmConfigService {
  constructor(private readonly aiAgentService: AiAgentService) {}

  listProviders() {
    return this.aiAgentService.listProviders();
  }

  listModels(providerId: string) {
    return this.aiAgentService.listModels(providerId);
  }

  getConfig(user: AuthenticatedRequest['user']) {
    return this.aiAgentService.getActiveStatus(user);
  }

  saveConfig(
    user: AuthenticatedRequest['user'],
    payload: { modelId: string; apiKey?: string; keepExistingApiKey?: boolean },
  ) {
    return this.aiAgentService.saveLegacyConfig(user, payload);
  }
}
