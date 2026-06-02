import {
  generateMcpApiKeySecret,
  hashMcpApiKey,
  MCP_KEY_PREFIX,
  mcpKeyDisplayPrefix,
  verifyMcpApiKey,
} from './mcp-key-crypto.util';

describe('mcp-key-crypto.util', () => {
  const pepper = 'test-pepper';

  it('generates secrets with rm_ prefix', () => {
    const secret = generateMcpApiKeySecret();
    expect(secret.startsWith(MCP_KEY_PREFIX)).toBe(true);
    expect(secret.length).toBeGreaterThan(20);
  });

  it('hashes and verifies keys', () => {
    const secret = generateMcpApiKeySecret();
    const hash = hashMcpApiKey(secret, pepper);
    expect(verifyMcpApiKey(secret, pepper, hash)).toBe(true);
    expect(verifyMcpApiKey(`${secret}x`, pepper, hash)).toBe(false);
  });

  it('uses stable display prefix', () => {
    const secret = generateMcpApiKeySecret();
    expect(mcpKeyDisplayPrefix(secret)).toBe(secret.slice(0, 8));
  });
});
