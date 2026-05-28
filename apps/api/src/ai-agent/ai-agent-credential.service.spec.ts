import { UnprocessableEntityException } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import { AiAgentCredentialService } from './ai-agent-credential.service';

describe('AiAgentCredentialService', () => {
  const user = {
    id: 'u1',
    email: 'u@test.dev',
    accessToken: 'tok',
  } as AuthenticatedRequest['user'];

  let service: AiAgentCredentialService;
  let repository: { getDecryptedActiveAccount: jest.Mock };

  beforeEach(() => {
    repository = { getDecryptedActiveAccount: jest.fn() };
    service = new AiAgentCredentialService(repository as never);
  });

  it('returns active credentials when configured', async () => {
    repository.getDecryptedActiveAccount.mockResolvedValue({
      id: 'acc-1',
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'sk-test',
      providerId: 'openai',
      label: 'Default',
      updatedAt: 'now',
    });

    await expect(service.getActiveCredentials(user)).resolves.toEqual({
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'sk-test',
      accountId: 'acc-1',
    });
  });

  it('throws when no active account', async () => {
    repository.getDecryptedActiveAccount.mockResolvedValue(null);

    await expect(service.getActiveCredentials(user)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });
});
