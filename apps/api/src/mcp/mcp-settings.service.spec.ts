import type { McpKeyRepository } from './mcp-key.repository';
import { McpSettingsService } from './mcp-settings.service';

describe('McpSettingsService', () => {
  const user = { id: 'user-1', accessToken: 'tok', authMethod: 'jwt' as const };

  let repo: jest.Mocked<
    Pick<McpKeyRepository, 'getOrCreateSettings' | 'setMcpEnabled' | 'getKey' | 'createKey'>
  >;
  let service: McpSettingsService;

  beforeEach(() => {
    repo = {
      getOrCreateSettings: jest.fn().mockResolvedValue({
        user_id: user.id,
        mcp_enabled: false,
        created_at: '',
        updated_at: '',
      }),
      setMcpEnabled: jest.fn(),
      getKey: jest.fn().mockResolvedValue(null),
      createKey: jest.fn(),
    };
    service = new McpSettingsService(repo as never);
  });

  it('returns secret on create', async () => {
    repo.createKey.mockResolvedValue({
      row: {
        id: 'k1',
        user_id: user.id,
        key_prefix: 'rm_abcd',
        key_hash: 'hash',
        encrypted_secret: 'enc',
        created_at: '2026-01-01T00:00:00Z',
        last_used_at: null,
      },
      secret: 'rm_secret',
    });

    const result = await service.createKey(user);
    expect(result.secret).toBe('rm_secret');
    expect(result.key.keyPrefix).toBe('rm_abcd');
  });
});
