import { AsyncLocalStorage } from 'node:async_hooks';
import type { AuthUser } from '../auth/auth-user.types';

export const mcpAuthStorage = new AsyncLocalStorage<AuthUser>();

export function getMcpAuthUser(): AuthUser {
  const user = mcpAuthStorage.getStore();
  if (!user) {
    throw new Error('MCP auth context is not set');
  }
  return user;
}
