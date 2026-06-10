import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { AuthConfigService } from './auth.config';

describe('AuthConfigService', () => {
  let env: Record<string, string | undefined>;
  let service: AuthConfigService;

  beforeEach(async () => {
    env = {
      SUPABASE_PUBLISHABLE_KEY: undefined,
      SUPABASE_ANON_KEY: undefined,
      AUTH_FORGOT_PASSWORD_ENABLED: 'true',
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthConfigService,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => env[key] },
        },
      ],
    }).compile();

    service = module.get(AuthConfigService);
  });

  it('falls back to SUPABASE_ANON_KEY when SUPABASE_PUBLISHABLE_KEY is absent', () => {
    env.SUPABASE_ANON_KEY = 'legacy-anon-key';
    expect(service.get('SUPABASE_PUBLISHABLE_KEY')).toBe('legacy-anon-key');
  });

  it('prefers SUPABASE_PUBLISHABLE_KEY when both are set', () => {
    env.SUPABASE_PUBLISHABLE_KEY = 'new-publishable';
    env.SUPABASE_ANON_KEY = 'legacy-anon';
    expect(service.get('SUPABASE_PUBLISHABLE_KEY')).toBe('new-publishable');
  });

  it('parses AUTH_FORGOT_PASSWORD_ENABLED with the legacy string convention', () => {
    // Need at least one of the publishable keys so the loader does
    // not throw before reaching the boolean parsing branch.
    env.SUPABASE_ANON_KEY = 'anon-key';
    expect(service.get('AUTH_FORGOT_PASSWORD_ENABLED')).toBe(true);
  });

  it('throws when neither SUPABASE_PUBLISHABLE_KEY nor SUPABASE_ANON_KEY is set', () => {
    expect(() => service.get('AUTH_FORGOT_PASSWORD_ENABLED')).toThrow(
      /SUPABASE_PUBLISHABLE_KEY.*SUPABASE_ANON_KEY/,
    );
  });
});
