import type { Request } from 'express';

/** Authenticated principal for REST (session bearer token) or MCP (API key). */
export interface AuthUser {
  id: string;
  email?: string;
  authMethod?: 'session' | 'mcp';
  /**
   * Profile fields of the signed-in user (`name`, `picture`), used to derive
   * display data without re-querying. Omitted for MCP API key auth.
   */
  userMetadata?: Record<string, unknown>;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}
