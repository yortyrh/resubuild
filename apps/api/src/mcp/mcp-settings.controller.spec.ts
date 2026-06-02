import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import { McpSettingsController } from './mcp-settings.controller';
import type { McpSettingsService } from './mcp-settings.service';

describe('McpSettingsController', () => {
  const req = {
    user: { id: 'u1', accessToken: 'tok', authMethod: 'jwt' },
  } as AuthenticatedRequest;

  let service: jest.Mocked<Pick<McpSettingsService, 'getSettings' | 'patchSettings' | 'createKey'>>;
  let controller: McpSettingsController;

  beforeEach(() => {
    service = {
      getSettings: jest.fn(),
      patchSettings: jest.fn(),
      createKey: jest.fn(),
    };
    controller = new McpSettingsController(service as never);
  });

  it('gets settings', async () => {
    service.getSettings.mockResolvedValue({ mcpEnabled: false, key: null });
    await expect(controller.getSettings(req)).resolves.toEqual({ mcpEnabled: false, key: null });
  });

  it('creates key', async () => {
    service.createKey.mockResolvedValue({
      key: { keyPrefix: 'rm_abc', createdAt: '', lastUsedAt: null },
      secret: 'rm_full',
    });
    await expect(controller.createKey(req, {})).resolves.toMatchObject({ secret: 'rm_full' });
  });
});
