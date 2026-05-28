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

  it('lists accounts with active flag and reconfiguration marker', async () => {
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
          };
        }

        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: accountId,
                    user_id: user.id,
                    label: 'Default',
                    provider_id: 'openai',
                    model_id: 'openai/gpt-4o-mini',
                    api_key_encrypted: encrypted,
                    created_at: '2026-01-01T00:00:00.000Z',
                    updated_at: '2026-01-01T00:00:00.000Z',
                  },
                ],
                error: null,
              }),
            }),
          }),
        };
      }),
    });

    await expect(repository.listAccounts(user)).resolves.toEqual([
      expect.objectContaining({
        id: accountId,
        isActive: true,
        modelId: 'openai/gpt-4o-mini',
      }),
    ]);
  });

  it('creates first account and sets it active', async () => {
    const encryptionKey = 'encryption-key-at-least-32-characters-long';
    const accountId = 'acc-new';
    const upsert = jest.fn().mockResolvedValue({ error: null });

    normalizedRepo.createUserClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'ai_agent_preference') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
            upsert,
          };
        }

        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: accountId,
                  user_id: user.id,
                  label: 'Default',
                  provider_id: 'openai',
                  model_id: 'openai/gpt-4o-mini',
                  api_key_encrypted: encryptSecret('sk-test', encryptionKey),
                  created_at: '2026-01-01T00:00:00.000Z',
                  updated_at: '2026-01-01T00:00:00.000Z',
                },
                error: null,
              }),
            }),
          }),
        };
      }),
    });

    await expect(
      repository.createAccount(user, {
        label: 'Default',
        modelId: 'openai/gpt-4o-mini',
        apiKey: 'sk-test',
      }),
    ).resolves.toMatchObject({ id: accountId, isActive: true });

    expect(upsert).toHaveBeenCalled();
  });

  it('updates and deletes accounts', async () => {
    const encryptionKey = 'encryption-key-at-least-32-characters-long';
    const encrypted = encryptSecret('sk-test', encryptionKey);
    const accountId = 'acc-1';
    const row = {
      id: accountId,
      user_id: user.id,
      label: 'Default',
      provider_id: 'openai',
      model_id: 'openai/gpt-4o-mini',
      api_key_encrypted: encrypted,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    };

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
            upsert: jest.fn().mockResolvedValue({ error: null }),
          };
        }

        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: row, error: null }),
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { ...row, label: 'Updated' },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          }),
        };
      }),
    });

    await expect(
      repository.updateAccount(user, accountId, { label: 'Updated' }),
    ).resolves.toMatchObject({ label: 'Updated' });

    await expect(repository.deleteAccount(user, accountId)).resolves.toBeUndefined();
  });

  it('sets active account and returns status', async () => {
    const encryptionKey = 'encryption-key-at-least-32-characters-long';
    const encrypted = encryptSecret('sk-test', encryptionKey);
    const accountId = 'acc-1';
    const row = {
      id: accountId,
      user_id: user.id,
      label: 'Default',
      provider_id: 'openai',
      model_id: 'openai/gpt-4o-mini',
      api_key_encrypted: encrypted,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    };

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
            upsert: jest.fn().mockResolvedValue({ error: null }),
          };
        }

        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: row, error: null }),
              }),
            }),
          }),
        };
      }),
    });

    await expect(repository.setActiveAccount(user, accountId)).resolves.toMatchObject({
      configured: true,
      accountId,
    });
  });

  it('returns decrypted active account', async () => {
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

    await expect(repository.getDecryptedActiveAccount(user)).resolves.toMatchObject({
      id: accountId,
      apiKey: 'sk-test',
    });
    await expect(repository.getDecryptedAccount(user, accountId)).resolves.toMatchObject({
      apiKey: 'sk-test',
    });
  });

  it('returns unconfigured status when active account row is missing', async () => {
    const accountId = 'missing-active';

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
          };
        }

        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        };
      }),
    });

    await expect(repository.getActiveStatus(user)).resolves.toEqual({ configured: false });
    await expect(repository.getDecryptedActiveAccount(user)).resolves.toBeNull();
    await expect(repository.getDecryptedAccount(user, 'missing')).resolves.toBeNull();
  });
});
