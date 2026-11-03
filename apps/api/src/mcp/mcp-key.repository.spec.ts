import type { ConfigService } from '@nestjs/config';
import { mcpApiKey } from '@resubuild/db';
import type { AuthUser } from '../auth/auth-user.types';
import { useTestDb } from '../database/test-db.helpers';
import type { McpApiKeyRow } from './mcp-key.repository';
import { McpKeyRepository } from './mcp-key.repository';
import { MCP_KEY_PREFIX } from './mcp-key-crypto.util';

const ENV: Record<string, string> = {
  MCP_KEY_PEPPER: 'test-pepper',
  MCP_ENCRYPTION_KEY: 'mcp-encryption-key-at-least-32-characters',
};

describe('McpKeyRepository', () => {
  const ctx = useTestDb();
  let repo: McpKeyRepository;
  let env: Record<string, string | undefined>;
  let user: AuthUser;

  beforeEach(async () => {
    env = { ...ENV };
    const config = { get: (key: string) => env[key] } as unknown as ConfigService;
    repo = new McpKeyRepository(ctx.db, config);
    user = await ctx.createUser();
  });

  describe('pepper', () => {
    const pepper = () => (repo as unknown as { pepper: () => string }).pepper();

    it('returns MCP_KEY_PEPPER when configured', () => {
      expect(pepper()).toBe('test-pepper');
    });

    it('falls back to SUPABASE_SERVICE_ROLE_KEY', () => {
      env = { SUPABASE_SERVICE_ROLE_KEY: 'fallback-pepper' };
      expect(pepper()).toBe('fallback-pepper');
    });

    it('throws when no pepper is configured', () => {
      env = {};
      expect(pepper).toThrow('MCP_KEY_PEPPER or SUPABASE_SERVICE_ROLE_KEY must be configured');
    });
  });

  describe('encryptionKey', () => {
    const encryptionKey = () =>
      (repo as unknown as { encryptionKey: () => string }).encryptionKey();

    it('prefers MCP_ENCRYPTION_KEY and falls back to AI_AGENT_ENCRYPTION_KEY', () => {
      expect(encryptionKey()).toBe(ENV.MCP_ENCRYPTION_KEY);
      env = { AI_AGENT_ENCRYPTION_KEY: 'fallback-enc-key' };
      expect(encryptionKey()).toBe('fallback-enc-key');
    });

    it('throws when no encryption key is configured', () => {
      env = {};
      expect(encryptionKey).toThrow(
        'MCP_ENCRYPTION_KEY or AI_AGENT_ENCRYPTION_KEY must be configured',
      );
    });
  });

  describe('settings', () => {
    it('getOrCreateSettings creates a disabled row once', async () => {
      const first = await repo.getOrCreateSettings(user);
      const second = await repo.getOrCreateSettings(user);
      expect(first).toMatchObject({ user_id: user.id, mcp_enabled: false });
      expect(second.created_at).toBe(first.created_at);
    });

    it('setMcpEnabled upserts the flag; isMcpEnabledForUser reads it', async () => {
      await expect(repo.isMcpEnabledForUser(user.id)).resolves.toBe(false);
      await expect(repo.setMcpEnabled(user, true)).resolves.toMatchObject({ mcp_enabled: true });
      await expect(repo.isMcpEnabledForUser(user.id)).resolves.toBe(true);
      await repo.setMcpEnabled(user, false);
      await expect(repo.isMcpEnabledForUser(user.id)).resolves.toBe(false);
    });
  });

  describe('keys', () => {
    it('getKey returns null before a key exists', async () => {
      await expect(repo.getKey(user)).resolves.toBeNull();
    });

    it('createKey stores only the hash and an encrypted copy of the secret', async () => {
      const { row, secret } = await repo.createKey(user);

      expect(secret.startsWith(MCP_KEY_PREFIX)).toBe(true);
      expect(row.user_id).toBe(user.id);
      expect(row.key_hash).not.toContain(secret);
      expect(row.encrypted_secret).not.toContain(secret);
      expect(secret.startsWith(row.key_prefix)).toBe(true);
      expect(repo.decryptKeySecret(row)).toBe(secret);
      await expect(repo.getKey(user)).resolves.toMatchObject({ key_hash: row.key_hash });
    });

    it('rotating replaces the single key row and invalidates the old secret', async () => {
      const first = await repo.createKey(user);
      const second = await repo.createKey(user);

      expect(await ctx.db.select().from(mcpApiKey)).toHaveLength(1);
      await expect(repo.findActiveKeyBySecret(first.secret)).resolves.toBeNull();
      await expect(repo.findActiveKeyBySecret(second.secret)).resolves.toMatchObject({
        user_id: user.id,
      });
    });

    it('findActiveKeyBySecret rejects foreign prefixes and wrong secrets', async () => {
      const { secret } = await repo.createKey(user);
      await expect(repo.findActiveKeyBySecret('sk_not_ours')).resolves.toBeNull();
      const tampered = `${secret.slice(0, -1)}${secret.endsWith('a') ? 'b' : 'a'}`;
      await expect(repo.findActiveKeyBySecret(tampered)).resolves.toBeNull();
    });

    it('findActiveKeyBySecret fails when the pepper changed', async () => {
      const { secret } = await repo.createKey(user);
      env.MCP_KEY_PEPPER = 'rotated-pepper';
      await expect(repo.findActiveKeyBySecret(secret)).resolves.toBeNull();
    });

    it('touchLastUsedAt updates last_used_at without blocking', async () => {
      await repo.createKey(user);
      repo.touchLastUsedAt(user.id);
      await new Promise((resolve) => setTimeout(resolve, 50));
      const [row] = await ctx.db.select().from(mcpApiKey);
      expect(row.last_used_at).toMatch(/Z$/);
    });
  });

  describe('decryptKeySecret', () => {
    it('throws when encrypted_secret is missing', () => {
      const row = { user_id: user.id, encrypted_secret: '' } as McpApiKeyRow;
      expect(() => repo.decryptKeySecret(row)).toThrow('API key secret not available');
    });

    it('throws when decryption fails', async () => {
      const { row } = await repo.createKey(user);
      env.MCP_ENCRYPTION_KEY = 'another-encryption-key-of-at-least-32-chars';
      expect(() => repo.decryptKeySecret(row)).toThrow('Failed to decrypt API key secret');
    });
  });
});
