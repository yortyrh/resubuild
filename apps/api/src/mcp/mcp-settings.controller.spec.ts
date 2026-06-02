import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import { McpSettingsController } from './mcp-settings.controller';
import type { McpSettingsService } from './mcp-settings.service';

describe('McpSettingsController', () => {
  const req = {
    user: { id: 'u1', accessToken: 'tok', authMethod: 'jwt' },
  } as AuthenticatedRequest;

  let service: jest.Mocked<
    Pick<McpSettingsService, 'getSettings' | 'patchSettings' | 'createKey' | 'revokeKey'>
  >;
  let controller: McpSettingsController;

  beforeEach(() => {
    service = {
      getSettings: jest.fn(),
      patchSettings: jest.fn(),
      createKey: jest.fn(),
      revokeKey: jest.fn(),
    };
    controller = new McpSettingsController(service as never);
  });

  it('gets settings', async () => {
    service.getSettings.mockResolvedValue({ mcpEnabled: false, keys: [] });
    await expect(controller.getSettings(req)).resolves.toEqual({ mcpEnabled: false, keys: [] });
  });

  it('creates key', async () => {
    service.createKey.mockResolvedValue({
      key: {
        id: 'k1',
        label: null,
        keyPrefix: 'rm_abc',
        createdAt: '',
        lastUsedAt: null,
        revoked: false,
      },
      secret: 'rm_full',
    });
    await expect(controller.createKey(req, { label: 'Cursor' })).resolves.toMatchObject({
      secret: 'rm_full',
    });
  });
});
