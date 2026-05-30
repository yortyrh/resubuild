import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import type { WebScrapeRepository } from './web-scrape.repository';
import { WebScrapeService } from './web-scrape.service';

describe('WebScrapeService', () => {
  const user = {
    id: 'u1',
    email: 'u@test.dev',
    accessToken: 'tok',
  } as AuthenticatedRequest['user'];

  let service: WebScrapeService;
  let repository: jest.Mocked<
    Pick<WebScrapeRepository, 'getStatus' | 'save' | 'clear' | 'getDecryptedConfig'>
  >;

  beforeEach(() => {
    repository = {
      getStatus: jest.fn(),
      save: jest.fn(),
      clear: jest.fn(),
      getDecryptedConfig: jest.fn(),
    };
    service = new WebScrapeService(repository as never);
  });

  it('delegates getStatus to repository', async () => {
    repository.getStatus.mockResolvedValue({ configured: true, provider: 'tavily' });
    await expect(service.getStatus(user)).resolves.toMatchObject({ configured: true });
  });

  it('trims api key before save', async () => {
    repository.save.mockResolvedValue({ configured: true, provider: 'firecrawl' });
    await service.save(user, { provider: 'firecrawl', apiKey: '  fc-test-key  ' });
    expect(repository.save).toHaveBeenCalledWith(user, 'firecrawl', 'fc-test-key');
  });

  it('delegates clear to repository', async () => {
    repository.clear.mockResolvedValue({ configured: false });
    await expect(service.clear(user)).resolves.toEqual({ configured: false });
  });

  it('delegates getDecryptedConfig to repository', async () => {
    repository.getDecryptedConfig.mockResolvedValue({ provider: 'tavily', apiKey: 'tv-key' });
    await expect(service.getDecryptedConfig(user)).resolves.toMatchObject({ provider: 'tavily' });
  });
});
