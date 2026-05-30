import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import { WebScrapeController } from './web-scrape.controller';
import type { WebScrapeService } from './web-scrape.service';

describe('WebScrapeController', () => {
  const user = {
    id: 'u1',
    email: 'u@test.dev',
    accessToken: 'tok',
  } as AuthenticatedRequest['user'];
  const req = { user } as AuthenticatedRequest;

  let controller: WebScrapeController;
  let service: jest.Mocked<Pick<WebScrapeService, 'getStatus' | 'save' | 'clear'>>;

  beforeEach(() => {
    service = {
      getStatus: jest.fn(),
      save: jest.fn(),
      clear: jest.fn(),
    };
    controller = new WebScrapeController(service as never);
  });

  it('returns config status for user', async () => {
    service.getStatus.mockResolvedValue({ configured: false });
    await expect(controller.getConfig(req)).resolves.toEqual({ configured: false });
  });

  it('saves config for user', async () => {
    service.save.mockResolvedValue({ configured: true, provider: 'firecrawl' });
    await expect(
      controller.saveConfig(req, { provider: 'firecrawl', apiKey: 'fc-test-key' }),
    ).resolves.toMatchObject({ configured: true, provider: 'firecrawl' });
  });

  it('clears config for user', async () => {
    service.clear.mockResolvedValue({ configured: false });
    await expect(controller.clearConfig(req)).resolves.toEqual({ configured: false });
  });
});
