import type { McpApiKeyRow } from './mcp-key.repository';
import { McpKeyRepository } from './mcp-key.repository';
import { McpSettingsService } from './mcp-settings.service';
import { MCP_TOOL_NAMES } from './tool-definitions';

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

  describe('listRegisteredToolNames', () => {
    it('returns the static MCP_TOOL_NAMES list when the wrapper registry is not injected', () => {
      const names = service.listRegisteredToolNames();

      expect(names).toEqual([...MCP_TOOL_NAMES]);
    });

    it('returns the registry-discovered names when the wrapper registry is injected', () => {
      const mockRegistry = {
        getMcpModuleIds: jest.fn().mockReturnValue(['mcp-1']),
        getTools: jest
          .fn()
          .mockReturnValue([{ metadata: { name: 'list_cvs' } }, { metadata: { name: 'get_cv' } }]),
      };

      const serviceWithRegistry = new McpSettingsService(
        mockRepo as unknown as McpKeyRepository,
        mockRegistry as never,
      );

      const names = serviceWithRegistry.listRegisteredToolNames();

      // The static MCP_TOOL_NAMES is the source of truth — when the registry
      // reports a subset that is fully contained, we still return the static
      // list so the public catalog stays byte-compatible.
      expect(names).toEqual([...MCP_TOOL_NAMES]);
    });

    it('appends a registry-only tool when the wrapper picks up a new @Tool', () => {
      const mockRegistry = {
        getMcpModuleIds: jest.fn().mockReturnValue(['mcp-1']),
        getTools: jest
          .fn()
          .mockReturnValue([
            { metadata: { name: 'list_cvs' } },
            { metadata: { name: 'experimental_tool' } },
          ]),
      };

      const serviceWithRegistry = new McpSettingsService(
        mockRepo as unknown as McpKeyRepository,
        mockRegistry as never,
      );

      const names = serviceWithRegistry.listRegisteredToolNames();

      expect(names).toContain('experimental_tool');
    });
  });
});
