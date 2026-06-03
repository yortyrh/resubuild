import {
  generateMcpApiKeySecret,
  hashMcpApiKey,
  MCP_KEY_PREFIX,
  mcpKeyDisplayPrefix,
  verifyMcpApiKey,
} from './mcp-key-crypto.util';

describe('mcp-key-crypto.util', () => {
  describe('generateMcpApiKeySecret', () => {
    it('returns a string starting with rm_ prefix', () => {
      const secret = generateMcpApiKeySecret();
      expect(secret.startsWith(MCP_KEY_PREFIX)).toBe(true);
    });

    it('generates unique secrets on each call', () => {
      const s1 = generateMcpApiKeySecret();
      const s2 = generateMcpApiKeySecret();
      expect(s1).not.toBe(s2);
    });

    it('returns base64url encoded string of correct length', () => {
      const secret = generateMcpApiKeySecret();
      // prefix (3) + base64url(32 bytes -> ~43 chars)
      expect(secret.length).toBeGreaterThan(40);
      expect(secret).toMatch(/^rm_[A-Za-z0-9_-]+$/);
    });
  });

  describe('mcpKeyDisplayPrefix', () => {
    it('returns first 8 characters of secret', () => {
      const secret = 'rm_abcdefghijk';
      expect(mcpKeyDisplayPrefix(secret)).toBe('rm_abcde');
    });
  });

  describe('hashMcpApiKey', () => {
    it('returns a hex string', () => {
      const hash = hashMcpApiKey('rm_test', 'pepper');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('produces same hash for same input', () => {
      const h1 = hashMcpApiKey('rm_test', 'pepper');
      const h2 = hashMcpApiKey('rm_test', 'pepper');
      expect(h1).toBe(h2);
    });

    it('produces different hash for different peppers', () => {
      const h1 = hashMcpApiKey('rm_test', 'pepper1');
      const h2 = hashMcpApiKey('rm_test', 'pepper2');
      expect(h1).not.toBe(h2);
    });

    it('produces different hash for different secrets', () => {
      const h1 = hashMcpApiKey('rm_test1', 'pepper');
      const h2 = hashMcpApiKey('rm_test2', 'pepper');
      expect(h1).not.toBe(h2);
    });
  });

  describe('verifyMcpApiKey', () => {
    it('returns true for matching secret and pepper', () => {
      const secret = 'rm_test12345678';
      const pepper = 'test-pepper';
      const hash = hashMcpApiKey(secret, pepper);

      expect(verifyMcpApiKey(secret, pepper, hash)).toBe(true);
    });

    it('returns false for wrong secret', () => {
      const pepper = 'test-pepper';
      const hash = hashMcpApiKey('rm_correct', pepper);

      expect(verifyMcpApiKey('rm_wrong', pepper, hash)).toBe(false);
    });

    it('returns false for wrong pepper', () => {
      const secret = 'rm_test';
      const hash = hashMcpApiKey(secret, 'correct-pepper');

      expect(verifyMcpApiKey(secret, 'wrong-pepper', hash)).toBe(false);
    });

    it('returns false for invalid storedHash length', () => {
      expect(verifyMcpApiKey('rm_test', 'pepper', 'not-hex')).toBe(false);
    });
  });
});
