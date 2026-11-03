import { BadRequestException } from '@nestjs/common';
import { webScrapeConfig } from '@resubuild/db';
import { encryptSecret } from '../ai-agent/ai-agent-crypto.util';
import type { AuthUser } from '../auth/auth-user.types';
import { useTestDb } from '../database/test-db.helpers';
import { WebScrapeRepository } from './web-scrape.repository';

describe('WebScrapeRepository', () => {
  const ctx = useTestDb();
  const encryptionKey = 'encryption-key-at-least-32-characters-long';

  let repository: WebScrapeRepository;
  let configService: { get: jest.Mock };
  let user: AuthUser;

  beforeEach(async () => {
    configService = { get: jest.fn().mockReturnValue(encryptionKey) };
    repository = new WebScrapeRepository(configService as never, ctx.db);
    user = await ctx.createUser();
  });

  async function insertRaw(apiKeyEncrypted: string) {
    await ctx.db.insert(webScrapeConfig).values({
      user_id: user.id,
      provider: 'firecrawl',
      api_key_encrypted: apiKeyEncrypted,
    });
  }

  it('returns unconfigured status when no row exists', async () => {
    await expect(repository.getStatus(user)).resolves.toEqual({ configured: false });
    await expect(repository.getDecryptedConfig(user)).resolves.toBeNull();
  });

  it('saves an encrypted config and reports it as configured', async () => {
    const saved = await repository.save(user, 'firecrawl', 'fc-test-key');
    expect(saved).toMatchObject({ configured: true, provider: 'firecrawl' });

    const [row] = await ctx.db.select().from(webScrapeConfig);
    expect(row.api_key_encrypted).not.toContain('fc-test-key');

    await expect(repository.getStatus(user)).resolves.toMatchObject({
      configured: true,
      provider: 'firecrawl',
      updatedAt: expect.stringMatching(/Z$/),
    });
    await expect(repository.getDecryptedConfig(user)).resolves.toEqual({
      provider: 'firecrawl',
      apiKey: 'fc-test-key',
    });
  });

  it('save overwrites the previous provider and key (one row per user)', async () => {
    await repository.save(user, 'firecrawl', 'fc-1');
    await repository.save(user, 'tavily', 'tv-2');
    await expect(repository.getDecryptedConfig(user)).resolves.toEqual({
      provider: 'tavily',
      apiKey: 'tv-2',
    });
    expect(await ctx.db.select().from(webScrapeConfig)).toHaveLength(1);
  });

  it('marks reconfiguration required when the key cannot be decrypted', async () => {
    await insertRaw(encryptSecret('fc-test-key', 'another-key-that-is-at-least-32-chars'));
    await expect(repository.getStatus(user)).resolves.toMatchObject({
      configured: false,
      reconfigurationRequired: true,
    });
    await expect(repository.getDecryptedConfig(user)).resolves.toBeNull();
  });

  it('throws when the encryption key is missing', async () => {
    await insertRaw(encryptSecret('fc-test-key', encryptionKey));
    configService.get.mockReturnValue(undefined);
    await expect(repository.getStatus(user)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('clears only the user’s config', async () => {
    const other = await ctx.createUser();
    await repository.save(user, 'firecrawl', 'fc-1');
    await repository.save(other, 'tavily', 'tv-2');

    await expect(repository.clear(user)).resolves.toEqual({ configured: false });
    await expect(repository.getStatus(user)).resolves.toEqual({ configured: false });
    await expect(repository.getStatus(other)).resolves.toMatchObject({ configured: true });
  });
});
