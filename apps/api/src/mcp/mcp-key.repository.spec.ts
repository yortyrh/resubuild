import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthUser } from '../auth/auth-user.types';
import type { CvNormalizedRepository } from '../cv/cv-normalized.repository';
import type { McpApiKeyRow } from './mcp-key.repository';
import { McpKeyRepository } from './mcp-key.repository';
import {
  generateMcpApiKeySecret,
  hashMcpApiKey,
  mcpKeyDisplayPrefix,
  verifyMcpApiKey,
} from './mcp-key-crypto.util';

jest.mock('./mcp-key-crypto.util');
jest.mock('../ai-agent/ai-agent-crypto.util');

const mockGenerateSecret = generateMcpApiKeySecret as jest.MockedFunction<
  typeof generateMcpApiKeySecret
>;
const mockHashKey = hashMcpApiKey as jest.MockedFunction<typeof hashMcpApiKey>;
const mockDisplayPrefix = mcpKeyDisplayPrefix as jest.MockedFunction<typeof mcpKeyDisplayPrefix>;
const mockVerifyKey = verifyMcpApiKey as jest.MockedFunction<typeof verifyMcpApiKey>;

const user = { id: 'user-1', accessToken: 'tok', authMethod: 'jwt' as const } as AuthUser;

describe('McpKeyRepository', () => {
  let repo: McpKeyRepository;
  let mockNormalizedRepo: {
    createClientForUser: jest.Mock;
    createServiceRoleClient: jest.Mock;
  };
  let mockConfigService: { get: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    mockNormalizedRepo = {
      createClientForUser: jest.fn(),
      createServiceRoleClient: jest.fn(),
    };

    mockConfigService = { get: jest.fn() };

    repo = new McpKeyRepository(
      mockNormalizedRepo as unknown as CvNormalizedRepository,
      mockConfigService as unknown as ConfigService,
    );
  });

  describe('pepper', () => {
    it('returns MCP_KEY_PEPPER when configured', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'MCP_KEY_PEPPER') return 'configured-pepper';
        return undefined;
      });

      const pepper = (repo as unknown as { pepper: () => string }).pepper();
      expect(pepper).toBe('configured-pepper');
    });

    it('falls back to SUPABASE_SERVICE_ROLE_KEY', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'MCP_KEY_PEPPER') return undefined;
        if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'fallback-pepper';
        return undefined;
      });

      const pepper = (repo as unknown as { pepper: () => string }).pepper();
      expect(pepper).toBe('fallback-pepper');
    });

    it('throws when no pepper is configured', () => {
      mockConfigService.get.mockReturnValue(undefined);

      expect(() => (repo as unknown as { pepper: () => string }).pepper()).toThrow(
        'MCP_KEY_PEPPER or SUPABASE_SERVICE_ROLE_KEY must be configured',
      );
    });
  });

  describe('encryptionKey', () => {
    it('returns MCP_ENCRYPTION_KEY when configured', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'MCP_ENCRYPTION_KEY') return 'enc-key';
        return undefined;
      });

      const key = (repo as unknown as { encryptionKey: () => string }).encryptionKey();
      expect(key).toBe('enc-key');
    });

    it('falls back to AI_AGENT_ENCRYPTION_KEY', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'MCP_ENCRYPTION_KEY') return undefined;
        if (key === 'AI_AGENT_ENCRYPTION_KEY') return 'fallback-enc-key';
        return undefined;
      });

      const key = (repo as unknown as { encryptionKey: () => string }).encryptionKey();
      expect(key).toBe('fallback-enc-key');
    });

    it('throws when no encryption key is configured', () => {
      mockConfigService.get.mockReturnValue(undefined);

      expect(() => (repo as unknown as { encryptionKey: () => string }).encryptionKey()).toThrow(
        'MCP_ENCRYPTION_KEY or AI_AGENT_ENCRYPTION_KEY must be configured',
      );
    });
  });

  describe('getOrCreateSettings', () => {
    it('returns existing settings row', async () => {
      const row = { user_id: 'user-1', mcp_enabled: true };
      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: row, error: null }),
            }),
          }),
        }),
      };
      mockNormalizedRepo.createClientForUser.mockReturnValue(mockClient as never);

      const result = await repo.getOrCreateSettings(user);

      expect(result).toEqual(row);
    });

    it('throws BadRequestException on select error', async () => {
      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest
                .fn()
                .mockResolvedValue({ data: null, error: { message: 'DB error' } }),
            }),
          }),
        }),
      };
      mockNormalizedRepo.createClientForUser.mockReturnValue(mockClient as never);

      await expect(repo.getOrCreateSettings(user)).rejects.toThrow(BadRequestException);
    });
  });

  describe('setMcpEnabled', () => {
    it('updates mcp_enabled flag', async () => {
      // Mock getOrCreateSettings to avoid needing insert
      jest
        .spyOn(
          repo as unknown as {
            getOrCreateSettings: (user: AuthUser) => Promise<{ mcp_enabled: boolean }>;
          },
          'getOrCreateSettings',
        )
        .mockResolvedValue({ mcp_enabled: false } as never);

      const mockUpdateResult = {
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { mcp_enabled: true }, error: null }),
          }),
        }),
      };
      const mockClient = {
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue(mockUpdateResult),
        }),
      };
      mockNormalizedRepo.createClientForUser.mockReturnValue(mockClient as never);

      await repo.setMcpEnabled(user, true);

      expect(mockClient.from).toHaveBeenCalledWith('user_settings');
    });
  });

  describe('isMcpEnabledForUser', () => {
    it('returns true when mcp_enabled is true', async () => {
      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest
                .fn()
                .mockResolvedValue({ data: { mcp_enabled: true }, error: null }),
            }),
          }),
        }),
      };
      mockNormalizedRepo.createServiceRoleClient.mockReturnValue(mockClient as never);

      const result = await repo.isMcpEnabledForUser('user-1');

      expect(result).toBe(true);
    });

    it('returns false when mcp_enabled is false', async () => {
      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest
                .fn()
                .mockResolvedValue({ data: { mcp_enabled: false }, error: null }),
            }),
          }),
        }),
      };
      mockNormalizedRepo.createServiceRoleClient.mockReturnValue(mockClient as never);

      const result = await repo.isMcpEnabledForUser('user-1');

      expect(result).toBe(false);
    });

    it('returns false when no settings row found', async () => {
      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      };
      mockNormalizedRepo.createServiceRoleClient.mockReturnValue(mockClient as never);

      const result = await repo.isMcpEnabledForUser('user-1');

      expect(result).toBe(false);
    });
  });

  describe('getKey', () => {
    it('returns key row when found', async () => {
      const row: McpApiKeyRow = {
        user_id: 'user-1',
        key_prefix: 'rm_abc',
        key_hash: 'hash',
        encrypted_secret: 'enc',
        created_at: '2024-01-01',
        last_used_at: null,
      };
      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: row, error: null }),
              }),
            }),
          }),
        }),
      };
      mockNormalizedRepo.createClientForUser.mockReturnValue(mockClient as never);

      const result = await repo.getKey(user);

      expect(result).toEqual(row);
    });

    it('returns null when no key found', async () => {
      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        }),
      };
      mockNormalizedRepo.createClientForUser.mockReturnValue(mockClient as never);

      const result = await repo.getKey(user);

      expect(result).toBeNull();
    });

    it('throws BadRequestException on error', async () => {
      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                maybeSingle: jest
                  .fn()
                  .mockResolvedValue({ data: null, error: { message: 'DB error' } }),
              }),
            }),
          }),
        }),
      };
      mockNormalizedRepo.createClientForUser.mockReturnValue(mockClient as never);

      await expect(repo.getKey(user)).rejects.toThrow(BadRequestException);
    });
  });

  describe('createKey', () => {
    it('upserts the single key row for the user and returns the resulting row + secret', async () => {
      mockGenerateSecret.mockReturnValue('rm_newsecret1234');
      mockHashKey.mockReturnValue('hashed');
      mockDisplayPrefix.mockReturnValue('rm_newsec');
      (
        require('../ai-agent/ai-agent-crypto.util') as typeof import('../ai-agent/ai-agent-crypto.util')
      ).encryptSecret = jest.fn().mockReturnValue('encrypted');

      const upsertSingle = jest.fn().mockResolvedValue({
        data: {
          user_id: 'user-1',
          key_prefix: 'rm_newsec',
          key_hash: 'hashed',
          encrypted_secret: 'encrypted',
          created_at: '2024',
          last_used_at: null,
        },
        error: null,
      });
      const upsertSelect = jest.fn().mockReturnValue({ single: upsertSingle });
      const upsertFn = jest.fn().mockReturnValue({ select: upsertSelect });
      const deleteFn = jest.fn();
      const insertFn = jest.fn();

      const mockClient = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'mcp_api_key') {
            return { upsert: upsertFn, delete: deleteFn, insert: insertFn };
          }
          return {};
        }),
      };
      mockNormalizedRepo.createClientForUser.mockReturnValue(mockClient as never);

      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'MCP_KEY_PEPPER') return 'pepper';
        if (key === 'MCP_ENCRYPTION_KEY') return 'enc-key';
        return undefined;
      });

      const result = await repo.createKey(user);

      expect(upsertFn).toHaveBeenCalledTimes(1);
      expect(upsertFn).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          key_prefix: 'rm_newsec',
          key_hash: 'hashed',
          encrypted_secret: 'encrypted',
        }),
        expect.objectContaining({ onConflict: 'user_id' }),
      );
      expect(upsertSelect).toHaveBeenCalledWith('*');
      expect(upsertSingle).toHaveBeenCalledTimes(1);
      expect(deleteFn).not.toHaveBeenCalled();
      expect(insertFn).not.toHaveBeenCalled();
      expect(result.secret).toBe('rm_newsecret1234');
      expect(result.row.user_id).toBe('user-1');
      expect(result.row.key_prefix).toBe('rm_newsec');
    });

    it('surfaces upsert errors as BadRequestException', async () => {
      mockGenerateSecret.mockReturnValue('rm_newsecret1234');
      mockHashKey.mockReturnValue('hashed');
      mockDisplayPrefix.mockReturnValue('rm_newsec');
      (
        require('../ai-agent/ai-agent-crypto.util') as typeof import('../ai-agent/ai-agent-crypto.util')
      ).encryptSecret = jest.fn().mockReturnValue('encrypted');

      const upsertFn = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'permission denied for table mcp_api_key' },
          }),
        }),
      });

      const mockClient = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'mcp_api_key') {
            return { upsert: upsertFn };
          }
          return {};
        }),
      };
      mockNormalizedRepo.createClientForUser.mockReturnValue(mockClient as never);

      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'MCP_KEY_PEPPER') return 'pepper';
        if (key === 'MCP_ENCRYPTION_KEY') return 'enc-key';
        return undefined;
      });

      await expect(repo.createKey(user)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findActiveKeyBySecret', () => {
    it('returns null when secret does not start with MCP_KEY_PREFIX', async () => {
      const result = await repo.findActiveKeyBySecret('invalid_prefix');
      expect(result).toBeNull();
    });

    it('finds key by prefix and verifies', async () => {
      mockDisplayPrefix.mockReturnValue('rm_abc123');
      const row: McpApiKeyRow = {
        user_id: 'user-1',
        key_prefix: 'rm_abc123',
        key_hash: 'stored-hash',
        encrypted_secret: 'enc',
        created_at: '2024',
        last_used_at: null,
      };
      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: row, error: null }),
              }),
            }),
          }),
        }),
      };
      mockNormalizedRepo.createServiceRoleClient.mockReturnValue(mockClient as never);
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'MCP_KEY_PEPPER') return 'pepper';
        return undefined;
      });
      mockVerifyKey.mockReturnValue(true);

      const result = await repo.findActiveKeyBySecret('rm_abc123456789');

      expect(result).toEqual(row);
    });

    it('returns null when key not found', async () => {
      mockDisplayPrefix.mockReturnValue('rm_notfound');
      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        }),
      };
      mockNormalizedRepo.createServiceRoleClient.mockReturnValue(mockClient as never);
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'MCP_KEY_PEPPER') return 'pepper';
        return undefined;
      });

      const result = await repo.findActiveKeyBySecret('rm_notfound12345678');

      expect(result).toBeNull();
    });

    it('returns null when key found but verification fails', async () => {
      mockDisplayPrefix.mockReturnValue('rm_valid');
      const row: McpApiKeyRow = {
        user_id: 'user-1',
        key_prefix: 'rm_valid',
        key_hash: 'wrong-hash',
        encrypted_secret: 'enc',
        created_at: '2024',
        last_used_at: null,
      };
      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: row, error: null }),
              }),
            }),
          }),
        }),
      };
      mockNormalizedRepo.createServiceRoleClient.mockReturnValue(mockClient as never);
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'MCP_KEY_PEPPER') return 'pepper';
        return undefined;
      });
      mockVerifyKey.mockReturnValue(false);

      const result = await repo.findActiveKeyBySecret('rm_valid1234567890');

      expect(result).toBeNull();
    });
  });

  describe('touchLastUsedAt', () => {
    it('updates last_used_at non-blocking', () => {
      const mockClient = {
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            // biome-ignore lint/suspicious/noThenProperty: mocks the real Supabase thenable chain used in production
            eq: jest.fn().mockReturnValue({ then: jest.fn() }),
          }),
        }),
      };
      mockNormalizedRepo.createServiceRoleClient.mockReturnValue(mockClient as never);

      repo.touchLastUsedAt('user-1');

      expect(mockNormalizedRepo.createServiceRoleClient).toHaveBeenCalled();
    });
  });

  describe('decryptKeySecret', () => {
    it('throws when encrypted_secret is missing', () => {
      const row = { user_id: 'user-1', encrypted_secret: '' } as McpApiKeyRow;
      mockConfigService.get.mockReturnValue('enc-key');

      expect(() => repo.decryptKeySecret(row)).toThrow('API key secret not available');
    });

    it('throws when decryption fails', () => {
      const row = { user_id: 'user-1', encrypted_secret: 'encrypted' } as McpApiKeyRow;
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'MCP_ENCRYPTION_KEY') return 'enc-key';
        return undefined;
      });
      (
        require('../ai-agent/ai-agent-crypto.util') as typeof import('../ai-agent/ai-agent-crypto.util')
      ).tryDecryptSecret = jest.fn().mockReturnValue(null);

      expect(() => repo.decryptKeySecret(row)).toThrow('Failed to decrypt API key secret');
    });

    it('returns decrypted secret when successful', () => {
      const row = { user_id: 'user-1', encrypted_secret: 'encrypted' } as McpApiKeyRow;
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'MCP_ENCRYPTION_KEY') return 'enc-key';
        return undefined;
      });
      (
        require('../ai-agent/ai-agent-crypto.util') as typeof import('../ai-agent/ai-agent-crypto.util')
      ).tryDecryptSecret = jest.fn().mockReturnValue('decrypted-secret');

      const result = repo.decryptKeySecret(row);

      expect(result).toBe('decrypted-secret');
    });
  });
});
