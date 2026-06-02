import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const MCP_KEY_PREFIX = 'rm_';
const KEY_RANDOM_BYTES = 32;

export function generateMcpApiKeySecret(): string {
  return `${MCP_KEY_PREFIX}${randomBytes(KEY_RANDOM_BYTES).toString('base64url')}`;
}

export function mcpKeyDisplayPrefix(secret: string): string {
  return secret.slice(0, 8);
}

export function hashMcpApiKey(secret: string, pepper: string): string {
  return createHmac('sha256', pepper).update(secret).digest('hex');
}

export function verifyMcpApiKey(secret: string, pepper: string, storedHash: string): boolean {
  const computed = hashMcpApiKey(secret, pepper);
  const a = Buffer.from(computed, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}
