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
  };
}
