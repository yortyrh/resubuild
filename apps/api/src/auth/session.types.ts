export interface AuthMeResponse {
  user: {
    id: string;
    email?: string;
    /** Profile picture URL (e.g. from the OAuth provider); `null` when unset. */
    picture?: string | null;
  };
  /** Whether the account has an email/password credential (OAuth-only accounts do not). */
  has_password: boolean;
}

export interface OAuthExchangeResponse {
  /** Session token for `Authorization: Bearer`. */
  token: string;
}
