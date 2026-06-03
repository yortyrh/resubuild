import type { McpApiKeyRow } from './mcp-key.repository';
import { McpKeyRepository } from './mcp-key.repository';
import { McpSettingsService } from './mcp-settings.service';

const user = { id: 'user-1', accessToken: 'tok', authMethod: 'jwt' as const };

describe('McpSettingsService', () => {
  let service: McpSettingsService;
  let mockRepo: {
    getOrCreateSettings: jest.Mock;
    getKey: jest.Mock;
    setMcpEnabled: jest.Mock;
    createKey: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepo = {
      getOrCreateSettings: jest.fn(),
      getKey: jest.fn(),
      setMcpEnabled: jest.fn(),
      createKey: jest.fn(),
    };

    service = new McpSettingsService(mockRepo as unknown as McpKeyRepository);
  });

  describe('toKey', () => {
    it('returns null when row is null', () => {
      const toKey = (service as unknown as { toKey: (row: McpApiKeyRow | null) => never }).toKey;
      expect(toKey(null)).toBeNull();
    });

    it('returns key info when row is provided', () => {
      const toKey = (service as unknown as { toKey: (row: McpApiKeyRow | null) => never }).toKey;
      const row: McpApiKeyRow = {
        id: 'key-1',
        user_id: 'user-1',
        key_prefix: 'rm_abc123',
        key_hash: 'hash',
        encrypted_secret: 'enc',
        created_at: '2024-01-01',
        last_used_at: '2024-06-01',
      };

      const result = toKey(row);

      expect(result).toEqual({
        keyPrefix: 'rm_abc123',
        createdAt: '2024-01-01',
        lastUsedAt: '2024-06-01',
      });
    });

    it('handles null last_used_at', () => {
      const toKey = (service as unknown as { toKey: (row: McpApiKeyRow | null) => never }).toKey;
      const row: McpApiKeyRow = {
        id: 'key-1',
        user_id: 'user-1',
        key_prefix: 'rm_abc123',
        key_hash: 'hash',
        encrypted_secret: 'enc',
        created_at: '2024-01-01',
        last_used_at: null,
      };

      const result = toKey(row);

      expect(result).toEqual({
        keyPrefix: 'rm_abc123',
        createdAt: '2024-01-01',
        lastUsedAt: null,
      });
    });
  });

  describe('getSettings', () => {
    it('returns settings and key info', async () => {
      mockRepo.getOrCreateSettings.mockResolvedValue({ mcp_enabled: true });
      mockRepo.getKey.mockResolvedValue({
        id: 'key-1',
        user_id: 'user-1',
        key_prefix: 'rm_abc',
        key_hash: 'hash',
        encrypted_secret: 'enc',
        created_at: '2024-01-01',
        last_used_at: null,
      });

      const result = await service.getSettings(user);

      expect(result).toEqual({
        mcpEnabled: true,
        key: {
          keyPrefix: 'rm_abc',
          createdAt: '2024-01-01',
          lastUsedAt: null,
        },
      });
    });

    it('returns null key when none exists', async () => {
      mockRepo.getOrCreateSettings.mockResolvedValue({ mcp_enabled: false });
      mockRepo.getKey.mockResolvedValue(null);

      const result = await service.getSettings(user);

      expect(result).toEqual({
        mcpEnabled: false,
        key: null,
      });
    });
  });

  describe('patchSettings', () => {
    it('updates mcp_enabled when provided', async () => {
      mockRepo.getOrCreateSettings.mockResolvedValue({ mcp_enabled: true });
      mockRepo.getKey.mockResolvedValue(null);
      mockRepo.setMcpEnabled.mockResolvedValue({ mcp_enabled: true });

      const result = await service.patchSettings(user, true);

      expect(mockRepo.setMcpEnabled).toHaveBeenCalledWith(user, true);
      expect(result.mcpEnabled).toBe(true);
    });

    it('returns current settings when no patch provided', async () => {
      mockRepo.getOrCreateSettings.mockResolvedValue({ mcp_enabled: false });
      mockRepo.getKey.mockResolvedValue(null);

      const result = await service.patchSettings(user);

      expect(mockRepo.setMcpEnabled).not.toHaveBeenCalled();
      expect(result.mcpEnabled).toBe(false);
    });
  });

  describe('createKey', () => {
    it('creates key and returns response with secret', async () => {
      mockRepo.createKey.mockResolvedValue({
        row: {
          id: 'key-new',
          user_id: 'user-1',
          key_prefix: 'rm_newkey',
          key_hash: 'hash',
          encrypted_secret: 'enc',
          created_at: '2024-06-01',
          last_used_at: null,
        },
        secret: 'rm_newsecret12345678',
      });

      const result = await service.createKey(user);

      expect(result).toEqual({
        key: {
          keyPrefix: 'rm_newkey',
          createdAt: '2024-06-01',
          lastUsedAt: null,
        },
        secret: 'rm_newsecret12345678',
      });
    });
  });
});
