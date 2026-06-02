import { BadRequestException } from '@nestjs/common';
import { encryptSecret } from '../ai-agent/ai-agent-crypto.util';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import { WebScrapeRepository } from './web-scrape.repository';

describe('WebScrapeRepository', () => {
  const user = {
    id: 'u1',
    email: 'u@test.dev',
    accessToken: 'tok',
  } as AuthenticatedRequest['user'];

  const encryptionKey = 'encryption-key-at-least-32-characters-long';

  let repository: WebScrapeRepository;
  let normalizedRepo: { createClientForUser: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(() => {
    normalizedRepo = { createClientForUser: jest.fn() };
    configService = {
      get: jest.fn().mockReturnValue(encryptionKey),
    };
    repository = new WebScrapeRepository(configService as never, normalizedRepo as never);
  });

  it('returns unconfigured status when row is missing', async () => {
    normalizedRepo.createClientForUser.mockReturnValue({
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

  it('returns configured status when api key decrypts', async () => {
    const encrypted = encryptSecret('fc-test-key', encryptionKey);

    normalizedRepo.createClientForUser.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                provider: 'firecrawl',
                api_key_encrypted: encrypted,
                updated_at: '2026-01-01T00:00:00.000Z',
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    await expect(repository.getStatus(user)).resolves.toEqual({
      configured: true,
      provider: 'firecrawl',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('marks reconfiguration required when api key cannot decrypt', async () => {
    normalizedRepo.createClientForUser.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                provider: 'tavily',
                api_key_encrypted: 'invalid.payload.here',
                updated_at: '2026-01-01T00:00:00.000Z',
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    await expect(repository.getStatus(user)).resolves.toEqual({
      configured: false,
      provider: 'tavily',
      updatedAt: '2026-01-01T00:00:00.000Z',
      reconfigurationRequired: true,
    });
  });

  it('throws when getStatus query fails', async () => {
    normalizedRepo.createClientForUser.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: { message: 'db error' } }),
          }),
        }),
      }),
    });

    await expect(repository.getStatus(user)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when encryption key is missing', async () => {
    configService.get.mockReturnValue(undefined);

    normalizedRepo.createClientForUser.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                provider: 'firecrawl',
                api_key_encrypted: encryptSecret('fc-test-key', encryptionKey),
                updated_at: '2026-01-01T00:00:00.000Z',
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    await expect(repository.getStatus(user)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('saves encrypted config', async () => {
    normalizedRepo.createClientForUser.mockReturnValue({
      from: jest.fn().mockReturnValue({
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { provider: 'firecrawl', updated_at: '2026-01-02T00:00:00.000Z' },
              error: null,
            }),
          }),
        }),
      }),
    });

    await expect(repository.save(user, 'firecrawl', 'fc-test-key')).resolves.toEqual({
      configured: true,
      provider: 'firecrawl',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
  });

  it('throws when save fails', async () => {
    normalizedRepo.createClientForUser.mockReturnValue({
      from: jest.fn().mockReturnValue({
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest
              .fn()
              .mockResolvedValue({ data: null, error: { message: 'upsert failed' } }),
          }),
        }),
      }),
    });

    await expect(repository.save(user, 'tavily', 'tv-test-key')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('clears config', async () => {
    normalizedRepo.createClientForUser.mockReturnValue({
      from: jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      }),
    });

    await expect(repository.clear(user)).resolves.toEqual({ configured: false });
  });

  it('throws when clear fails', async () => {
    normalizedRepo.createClientForUser.mockReturnValue({
      from: jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: { message: 'delete failed' } }),
        }),
      }),
    });

    await expect(repository.clear(user)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns null when decrypted config row is missing', async () => {
    normalizedRepo.createClientForUser.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    });

    await expect(repository.getDecryptedConfig(user)).resolves.toBeNull();
  });

  it('returns decrypted config when row decrypts', async () => {
    const encrypted = encryptSecret('tv-test-key', encryptionKey);

    normalizedRepo.createClientForUser.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { provider: 'tavily', api_key_encrypted: encrypted },
              error: null,
            }),
          }),
        }),
      }),
    });

    await expect(repository.getDecryptedConfig(user)).resolves.toEqual({
      provider: 'tavily',
      apiKey: 'tv-test-key',
    });
  });

  it('returns null when decrypted config cannot decrypt', async () => {
    normalizedRepo.createClientForUser.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { provider: 'firecrawl', api_key_encrypted: 'invalid.payload.here' },
              error: null,
            }),
          }),
        }),
      }),
    });

    await expect(repository.getDecryptedConfig(user)).resolves.toBeNull();
  });

  it('throws when getDecryptedConfig query fails', async () => {
    normalizedRepo.createClientForUser.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: { message: 'db error' } }),
          }),
        }),
      }),
    });

    await expect(repository.getDecryptedConfig(user)).rejects.toBeInstanceOf(BadRequestException);
  });
});
