import { ConflictException } from '@nestjs/common';
import type { McpKeyRepository } from './mcp-key.repository';
import { McpSettingsService } from './mcp-settings.service';

describe('McpSettingsService', () => {
  const user = { id: 'user-1', accessToken: 'tok', authMethod: 'jwt' as const };

  let repo: jest.Mocked<
    Pick<
      McpKeyRepository,
      | 'getOrCreateSettings'
      | 'setMcpEnabled'
      | 'listKeys'
      | 'countActiveKeys'
      | 'createKey'
      | 'revokeKey'
    >
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
      listKeys: jest.fn().mockResolvedValue([]),
      countActiveKeys: jest.fn().mockResolvedValue(0),
      createKey: jest.fn(),
      revokeKey: jest.fn(),
    };
    service = new McpSettingsService(repo as never);
  });

  it('rejects third active key', async () => {
    repo.countActiveKeys.mockResolvedValue(2);
    await expect(service.createKey(user, 'third')).rejects.toThrow(ConflictException);
  });

  it('returns secret on create', async () => {
    repo.createKey.mockResolvedValue({
      row: {
        id: 'k1',
        user_id: user.id,
        label: null,
        key_prefix: 'rm_abcd',
        key_hash: 'hash',
        created_at: '2026-01-01T00:00:00Z',
        last_used_at: null,
        revoked_at: null,
      },
      secret: 'rm_secret',
    });

    const result = await service.createKey(user, 'Agent');
    expect(result.secret).toBe('rm_secret');
    expect(result.key.id).toBe('k1');
  });
});
