import { UnprocessableEntityException } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import { ImportLlmConfigRepository } from './import-llm-config.service';

describe('ImportLlmConfigRepository', () => {
  const user = {
    id: 'u1',
    email: 'u@test.dev',
    accessToken: 'tok',
  } as AuthenticatedRequest['user'];

  let repository: ImportLlmConfigRepository;
  let aiAgentRepository: {
    getActiveStatus: jest.Mock;
    getDecryptedActiveAccount: jest.Mock;
  };
  let aiAgentService: { saveLegacyConfig: jest.Mock };

  beforeEach(() => {
    aiAgentRepository = {
      getActiveStatus: jest.fn(),
      getDecryptedActiveAccount: jest.fn(),
    };
    aiAgentService = { saveLegacyConfig: jest.fn() };
    repository = new ImportLlmConfigRepository(
      aiAgentRepository as never,
      aiAgentService as never,
    );
  });

  it('returns status from ai agent repository', async () => {
    aiAgentRepository.getActiveStatus.mockResolvedValue({
      configured: true,
      modelId: 'openai/gpt-4o-mini',
      configuredAt: 'now',
    });

    await expect(repository.getStatus(user)).resolves.toMatchObject({
      configured: true,
      modelId: 'openai/gpt-4o-mini',
    });
  });

  it('returns null when no decrypted active account', async () => {
    aiAgentRepository.getDecryptedActiveAccount.mockResolvedValue(null);
    aiAgentRepository.getActiveStatus.mockResolvedValue({ configured: false });

    await expect(repository.getDecryptedConfig(user)).resolves.toBeNull();
  });

  it('throws when reconfiguration is required', async () => {
    aiAgentRepository.getDecryptedActiveAccount.mockResolvedValue(null);
    aiAgentRepository.getActiveStatus.mockResolvedValue({ reconfigurationRequired: true });

    await expect(repository.getDecryptedConfig(user)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('delegates save to ai agent service', async () => {
    aiAgentService.saveLegacyConfig.mockResolvedValue({
      configured: true,
      modelId: 'openai/gpt-4o-mini',
      configuredAt: 'now',
    });

    await expect(
      repository.saveConfig(user, 'openai/gpt-4o-mini', 'sk-test'),
    ).resolves.toMatchObject({ configured: true });
  });
});
