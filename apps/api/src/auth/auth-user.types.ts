import type { Request } from 'express';

/** Authenticated principal for REST (JWT) or MCP (API key). */
export interface AuthUser {
  id: string;
  email?: string;
  /** Present for Supabase JWT auth; omitted for MCP API key auth. */
  accessToken?: string;
  authMethod?: 'jwt' | 'mcp';
  /**
   * Raw `user_metadata` returned by Supabase on `auth.getUser`. Present only
   * for Supabase JWT auth; omitted for MCP API key auth. Used to derive
   * profile fields such as `avatar_url` / `picture` without re-querying.
   */
  userMetadata?: Record<string, unknown>;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}
