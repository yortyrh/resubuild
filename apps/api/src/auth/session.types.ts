export interface AuthTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number | undefined;
  token_type: 'bearer';
  user: {
    id: string;
    email?: string;
  };
}

export interface AuthMeResponse {
  user: {
    id: string;
    email?: string;
    /**
     * Profile picture URL sourced from the authenticated Supabase user's
     * `user_metadata.avatar_url` (falling back to `user_metadata.picture`).
     * `null` when neither metadata key is present or both are empty strings,
     * so the SPA can render a fallback without inspecting Supabase metadata.
     */
    picture?: string | null;
  };
}
