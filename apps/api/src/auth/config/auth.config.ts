import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';

const boolFromString = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true')
  .catch(false);

const schema = z.object({
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  AUTH_FORGOT_PASSWORD_ENABLED: boolFromString,
  AUTH_EMAIL_VERIFICATION_ENABLED: boolFromString,
  AUTH_PASSWORDLESS_ENABLED: boolFromString,
  SUPABASE_AUTH_EXTERNAL_GITHUB_ENABLED: boolFromString,
  SUPABASE_AUTH_EXTERNAL_GOOGLE_ENABLED: boolFromString,
});

export type AuthConfig = z.infer<typeof schema>;

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

  private loadConfig(): AuthConfig {
    const result = schema.safeParse({
      SUPABASE_PUBLISHABLE_KEY: this.configService.get<string>('SUPABASE_PUBLISHABLE_KEY'),
      AUTH_FORGOT_PASSWORD_ENABLED: this.configService.get<string>('AUTH_FORGOT_PASSWORD_ENABLED'),
      AUTH_EMAIL_VERIFICATION_ENABLED: this.configService.get<string>(
        'AUTH_EMAIL_VERIFICATION_ENABLED',
      ),
      AUTH_PASSWORDLESS_ENABLED: this.configService.get<string>('AUTH_PASSWORDLESS_ENABLED'),
      SUPABASE_AUTH_EXTERNAL_GITHUB_ENABLED: this.configService.get<string>(
        'SUPABASE_AUTH_EXTERNAL_GITHUB_ENABLED',
      ),
      SUPABASE_AUTH_EXTERNAL_GOOGLE_ENABLED: this.configService.get<string>(
        'SUPABASE_AUTH_EXTERNAL_GOOGLE_ENABLED',
      ),
    });

    if (!result.success) {
      throw new Error(`Auth config validation failed: ${result.error.message}`);
    }

    return result.data;
  }
}
