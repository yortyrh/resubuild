import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { toProviderOptions } from '@resubuild/import-models';
import type { AuthenticatedRequest } from '../auth/session-auth.guard';
import { AiAgentRepository } from './ai-agent.repository';

export interface ActiveAiAgentCredentials {
  modelId: string;
  apiKey: string;
  accountId: string;
  /** Mastra `providerOptions` from the account's model options; undefined = provider defaults. */
  providerOptions?: Record<string, Record<string, unknown>>;
}

@Injectable()
export class AiAgentCredentialService {
  constructor(private readonly repository: AiAgentRepository) {}

  async getActiveCredentials(
    user: AuthenticatedRequest['user'],
  ): Promise<ActiveAiAgentCredentials> {
    const account = await this.repository.getDecryptedActiveAccount(user);
    if (!account) {
      throw new UnprocessableEntityException(
        'Active AI agent configuration is required — add an account in AI agent settings',
      );
    }

    return {
      modelId: account.modelId,
      apiKey: account.apiKey,
      accountId: account.id,
      providerOptions: toProviderOptions(account.providerId, account.modelOptions),
    };
  }
}
