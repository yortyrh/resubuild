import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';

const boolFromString = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true')
  .catch(false);

const optionalString = z
  .string()
  .trim()
  .transform((v) => (v === '' ? undefined : v))
  .optional();

const schema = z.object({
  /** Signs session cookies/tokens. At least 32 random characters. */
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
  /** Public base URL of this API (OAuth callbacks are `${url}/api/auth/callback/:provider`). */
  BETTER_AUTH_URL: z.url(),
  /** Public URL of the web app; email links and OAuth redirects land there. */
  WEB_URL: z.url(),
  /** Extra origins allowed to call the auth endpoints (comma-separated, from CORS_ORIGIN). */
  TRUSTED_ORIGINS: z.array(z.string()),
  AUTH_FORGOT_PASSWORD_ENABLED: boolFromString,
  AUTH_EMAIL_VERIFICATION_ENABLED: boolFromString,
  AUTH_PASSWORDLESS_ENABLED: boolFromString,
  GITHUB_CLIENT_ID: optionalString,
  GITHUB_CLIENT_SECRET: optionalString,
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,
  LINKEDIN_CLIENT_ID: optionalString,
  LINKEDIN_CLIENT_SECRET: optionalString,
});

export type AuthConfig = z.infer<typeof schema>;

export type OAuthProviderId = 'github' | 'google' | 'linkedin';

function stripTrailingSlash(url: string | undefined): string | undefined {
  return url?.trim().replace(/\/+$/, '') || undefined;
}

/**
 * Validated auth settings (Better Auth + feature flags).
 *
 * The web app mirrors the feature flags as `NEXT_PUBLIC_AUTH_*` so it can
 * render the right controls without a round-trip; the API enforces them
 * (disabled flows are not registered with Better Auth at all).
 */
@Injectable()
export class AuthConfigService {
  private _config: AuthConfig | null = null;

  constructor(private readonly configService: ConfigService) {}

  get<K extends keyof AuthConfig>(key: K): AuthConfig[K] {
    if (!this._config) {
      this._config = this.loadConfig();
    }
    return this._config[key];
  }

  /** OAuth providers with both client id and secret configured. */
  enabledOAuthProviders(): OAuthProviderId[] {
    const providers: OAuthProviderId[] = [];
    if (this.get('GITHUB_CLIENT_ID') && this.get('GITHUB_CLIENT_SECRET')) providers.push('github');
    if (this.get('GOOGLE_CLIENT_ID') && this.get('GOOGLE_CLIENT_SECRET')) providers.push('google');
    if (this.get('LINKEDIN_CLIENT_ID') && this.get('LINKEDIN_CLIENT_SECRET')) {
      providers.push('linkedin');
    }
    return providers;
  }

  private loadConfig(): AuthConfig {
    const env = (key: string) => this.configService.get<string>(key);
    const webUrl = stripTrailingSlash(env('WEB_URL') ?? env('APP_URL'));
    const apiUrl = stripTrailingSlash(
      env('BETTER_AUTH_URL') ??
        env('PUBLIC_API_URL') ??
        `http://localhost:${env('PORT') ?? '3001'}`,
    );
    const trustedOrigins = (env('CORS_ORIGIN') ?? '')
      .split(',')
      .map((o) => stripTrailingSlash(o))
      .filter((o): o is string => Boolean(o));

    const result = schema.safeParse({
      BETTER_AUTH_SECRET: env('BETTER_AUTH_SECRET'),
      BETTER_AUTH_URL: apiUrl,
      WEB_URL: webUrl,
      TRUSTED_ORIGINS: [...new Set([webUrl, ...trustedOrigins].filter(Boolean))],
      AUTH_FORGOT_PASSWORD_ENABLED: env('AUTH_FORGOT_PASSWORD_ENABLED'),
      AUTH_EMAIL_VERIFICATION_ENABLED: env('AUTH_EMAIL_VERIFICATION_ENABLED'),
      AUTH_PASSWORDLESS_ENABLED: env('AUTH_PASSWORDLESS_ENABLED'),
      GITHUB_CLIENT_ID: env('GITHUB_CLIENT_ID'),
      GITHUB_CLIENT_SECRET: env('GITHUB_CLIENT_SECRET'),
      GOOGLE_CLIENT_ID: env('GOOGLE_CLIENT_ID'),
      GOOGLE_CLIENT_SECRET: env('GOOGLE_CLIENT_SECRET'),
      LINKEDIN_CLIENT_ID: env('LINKEDIN_CLIENT_ID'),
      LINKEDIN_CLIENT_SECRET: env('LINKEDIN_CLIENT_SECRET'),
    });

    if (!result.success) {
      throw new Error(`Auth config validation failed: ${result.error.message}`);
    }

    return result.data;
  }
}
