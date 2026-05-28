import { BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import { ImportLlmConfigRepository } from './import-llm-config.service';
import { encryptSecret } from './import-llm-crypto.util';

describe('ImportLlmConfigRepository', () => {
  const user = {
    id: 'u1',
    email: 'u@test.dev',
    accessToken: 'tok',
  } as AuthenticatedRequest['user'];

  let repository: ImportLlmConfigRepository;
  let normalizedRepo: { createUserClient: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(() => {
    normalizedRepo = { createUserClient: jest.fn() };
    configService = {
      get: jest.fn().mockReturnValue('encryption-key-at-least-32-characters-long'),
    };
    repository = new ImportLlmConfigRepository(configService as never, normalizedRepo as never);
  });

  it('returns unconfigured status when row is missing', async () => {
    normalizedRepo.createUserClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    });

    await expect(repository.getStatus(user)).resolves.toEqual({ configured: false });
  });

  it('returns configured status when row exists and decrypts', async () => {
    const encryptionKey = 'encryption-key-at-least-32-characters-long';
    const encrypted = encryptSecret('sk-test', encryptionKey);

    normalizedRepo.createUserClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                model_id: 'openai/gpt-4o-mini',
                api_key_encrypted: encrypted,
                configured_at: '2026-01-01T00:00:00.000Z',
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    await expect(repository.getStatus(user)).resolves.toEqual({
      configured: true,
      modelId: 'openai/gpt-4o-mini',
      configuredAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('returns reconfigurationRequired when row cannot be decrypted', async () => {
    const encrypted = encryptSecret('sk-test', 'old-encryption-key-at-least-32-characters');

    normalizedRepo.createUserClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                model_id: 'openai/gpt-4o-mini',
                api_key_encrypted: encrypted,
                configured_at: '2026-01-01T00:00:00.000Z',
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    await expect(repository.getStatus(user)).resolves.toEqual({
      configured: false,
      modelId: 'openai/gpt-4o-mini',
      configuredAt: '2026-01-01T00:00:00.000Z',
      reconfigurationRequired: true,
    });
  });

  it('throws when stored config cannot be decrypted', async () => {
    const oldKey = 'old-encryption-key-at-least-32-characters';
    const encrypted = encryptSecret('sk-test', oldKey);

    normalizedRepo.createUserClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                model_id: 'openai/gpt-4o-mini',
                api_key_encrypted: encrypted,
                configured_at: '2026-01-01T00:00:00.000Z',
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    await expect(repository.getDecryptedConfig(user)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('throws when encryption key is missing on save', async () => {
    configService.get.mockReturnValue(undefined);
    normalizedRepo.createUserClient.mockReturnValue({ from: jest.fn() });

    await expect(
      repository.saveConfig(user, 'openai/gpt-4o-mini', 'sk-test'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
