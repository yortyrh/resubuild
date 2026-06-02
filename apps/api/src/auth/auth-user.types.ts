import type { Request } from 'express';

/** Authenticated principal for REST (JWT) or MCP (API key). */
export interface AuthUser {
  id: string;
  email?: string;
  /** Present for Supabase JWT auth; omitted for MCP API key auth. */
  accessToken?: string;
  authMethod?: 'jwt' | 'mcp';
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}
