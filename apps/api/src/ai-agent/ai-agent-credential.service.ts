import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import { AiAgentRepository } from './ai-agent.repository';

export interface ActiveAiAgentCredentials {
  modelId: string;
  apiKey: string;
  accountId: string;
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
    };
  }
}
