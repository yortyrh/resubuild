import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import { AiAgentRepository } from './ai-agent.repository';
import { encryptSecret } from './ai-agent-crypto.util';

describe('AiAgentRepository', () => {
  const user = {
    id: 'u1',
    email: 'u@test.dev',
    accessToken: 'tok',
  } as AuthenticatedRequest['user'];

  let repository: AiAgentRepository;
  let normalizedRepo: { createUserClient: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(() => {
    normalizedRepo = { createUserClient: jest.fn() };
    configService = {
      get: jest.fn().mockReturnValue('encryption-key-at-least-32-characters-long'),
    };
    repository = new AiAgentRepository(configService as never, normalizedRepo as never);
  });

  it('returns unconfigured active status when preference is missing', async () => {
    normalizedRepo.createUserClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    });

    await expect(repository.getActiveStatus(user)).resolves.toEqual({ configured: false });
  });

  it('returns configured active status when account decrypts', async () => {
    const encryptionKey = 'encryption-key-at-least-32-characters-long';
    const encrypted = encryptSecret('sk-test', encryptionKey);
    const accountId = 'acc-1';

    normalizedRepo.createUserClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'ai_agent_preference') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { active_account_id: accountId },
                  error: null,
                }),
              }),
            }),
            upsert: jest.fn(),
          };
        }

        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    id: accountId,
                    user_id: user.id,
                    label: 'Default',
                    provider_id: 'openai',
                    model_id: 'openai/gpt-4o-mini',
                    api_key_encrypted: encrypted,
                    created_at: '2026-01-01T00:00:00.000Z',
                    updated_at: '2026-01-01T00:00:00.000Z',
                  },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }),
    });

    await expect(repository.getActiveStatus(user)).resolves.toEqual({
      configured: true,
      accountId,
      label: 'Default',
      providerId: 'openai',
      modelId: 'openai/gpt-4o-mini',
      configuredAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('throws when account is not found', async () => {
    normalizedRepo.createUserClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      }),
    });

    await expect(repository.getAccountRow(user, 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws when encryption key is missing on create', async () => {
    configService.get.mockReturnValue(undefined);
    normalizedRepo.createUserClient.mockReturnValue({ from: jest.fn() });

    await expect(
      repository.createAccount(user, {
        modelId: 'openai/gpt-4o-mini',
        apiKey: 'sk-test',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
