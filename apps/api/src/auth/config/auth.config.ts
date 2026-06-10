import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';

const boolFromString = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true')
  .catch(false);

const schema = z.object({
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  // Gates server-side forgot-password flows (see ForgotPasswordEnabledGuard).
  // The SPA also reads the corresponding NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED
  // so it can decide whether to render the "Forgot password?" link.
  AUTH_FORGOT_PASSWORD_ENABLED: boolFromString,
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
      SUPABASE_ANON_KEY: this.configService.get<string>('SUPABASE_ANON_KEY'),
      AUTH_FORGOT_PASSWORD_ENABLED: this.configService.get<string>('AUTH_FORGOT_PASSWORD_ENABLED'),
    });

    if (!result.success) {
      throw new Error(`Auth config validation failed: ${result.error.message}`);
    }

    const publishable = result.data.SUPABASE_PUBLISHABLE_KEY ?? result.data.SUPABASE_ANON_KEY;
    if (!publishable) {
      throw new Error(
        'Auth config validation failed: SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY) is required',
      );
    }

    return { ...result.data, SUPABASE_PUBLISHABLE_KEY: publishable };
  }
}
