/**
 * Mirrors openspec/specs/authentication (guard + JWT validation is separate specs)
 * plus API auth issuance: login/register/refresh and misconfiguration handling.
 */

import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { createClient } from '@supabase/supabase-js';
import { AuthService } from './auth.service';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

const mockedCreateClient = jest.mocked(createClient);

describe('AuthService', () => {
  let service: AuthService;
  let get: jest.Mock;

  beforeEach(async () => {
    get = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => get(key as never) },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    mockedCreateClient.mockReset();
    get.mockImplementation((key: string) => {
      if (key === 'SUPABASE_URL') return 'https://example.supabase.co';
      if (key === 'SUPABASE_ANON_KEY') return 'anon-key';
      return undefined;
    });
  });

  it('Scenario: Missing config THEN login throws UnauthorizedException (misconfiguration)', async () => {
    get.mockReturnValue(undefined);
    await expect(service.login({ email: 'a@example.com', password: 'pw123456' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('Scenario: Valid credentials THEN login returns bearer bundle', async () => {
    const signInWithPassword = jest.fn().mockResolvedValue({
      data: {
        session: {
          access_token: 'access',
          refresh_token: 'refresh',
          expires_in: 7200,
          expires_at: 2000000000,
          user: { id: 'user-uuid', email: 'u@test.com' },
        },
      },
      error: null,
    });

    mockedCreateClient.mockReturnValue({
      auth: { signInWithPassword },
    } as never);

    const result = await service.login({ email: 'u@test.com', password: 'pw123456' });

    expect(result).toEqual({
      access_token: 'access',
      refresh_token: 'refresh',
      expires_in: 7200,
      expires_at: 2000000000,
      token_type: 'bearer',
      user: { id: 'user-uuid', email: 'u@test.com' },
    });
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'u@test.com',
      password: 'pw123456',
    });
  });

  it('Scenario: Invalid credentials THEN login throws Invalid credentials', async () => {
    mockedCreateClient.mockReturnValue({
      auth: {
        signInWithPassword: jest.fn().mockResolvedValue({
          data: { session: null },
          error: { message: 'Invalid login' },
        }),
      },
    } as never);

    await expect(service.login({ email: 'u@test.com', password: 'wrong-pw-ab' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('Scenario: Register with immediate session THEN returns token bundle', async () => {
    const signUp = jest.fn().mockResolvedValue({
      data: {
        session: {
          access_token: 'a',
          refresh_token: 'r',
          expires_in: 3600,
          expires_at: 1700000500,
          user: { id: 'np', email: 'n@test.com' },
        },
      },
      error: null,
    });

    mockedCreateClient.mockReturnValue({
      auth: { signUp },
    } as never);

    const result = await service.register({ email: 'n@test.com', password: 'pw123456' });
    expect('access_token' in result && result.access_token === 'a').toBe(true);
  });

  it('Scenario: Register pending email confirmation THEN returns message-only payload', async () => {
    mockedCreateClient.mockReturnValue({
      auth: {
        signUp: jest.fn().mockResolvedValue({
          data: { session: null, user: { id: 'x' } },
          error: null,
        }),
      },
    } as never);

    await expect(
      service.register({ email: 'pending@test.com', password: 'pw123456' }),
    ).resolves.toEqual({
      message: 'Check your email to confirm your account, then sign in.',
    });
  });

  it('Scenario: Register error THEN throws Invalid credentials', async () => {
    mockedCreateClient.mockReturnValue({
      auth: {
        signUp: jest.fn().mockResolvedValue({
          data: { session: null },
          error: { message: 'boom' },
        }),
      },
    } as never);

    await expect(service.register({ email: 'u@test.com', password: 'pw123456' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('Scenario: Valid refresh THEN returns new bearer bundle', async () => {
    const refreshSession = jest.fn().mockResolvedValue({
      data: {
        session: {
          access_token: 'new-acc',
          refresh_token: 'new-ref',
          expires_in: 3600,
          user: { id: 'u1', email: 'e@example.com' },
        },
      },
      error: null,
    });

    mockedCreateClient.mockReturnValue({
      auth: { refreshSession },
    } as never);

    const dto = { refresh_token: 'rtoken'.repeat(3) }; // satisfies MinLength(10)

    await expect(service.refresh(dto)).resolves.toMatchObject({
      access_token: 'new-acc',
      refresh_token: 'new-ref',
      token_type: 'bearer',
    });
    expect(refreshSession).toHaveBeenCalledWith({ refresh_token: dto.refresh_token });
  });

  it('Scenario: Expired refresh THEN throws Invalid or expired refresh token', async () => {
    mockedCreateClient.mockReturnValue({
      auth: {
        refreshSession: jest.fn().mockResolvedValue({
          data: { session: null },
          error: {},
        }),
      },
    } as never);

    await expect(service.refresh({ refresh_token: 'rtoken-token-long' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('reject token mapping when session user id is missing', async () => {
    mockedCreateClient.mockReturnValue({
      auth: {
        signInWithPassword: jest.fn().mockResolvedValue({
          data: {
            session: {
              access_token: 'access',
              refresh_token: 'refresh',
              expires_in: 3600,
              user: { email: 'u@test.com' },
            },
          },
          error: null,
        }),
      },
    } as never);

    await expect(service.login({ email: 'u@test.com', password: 'pw123456' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('reject token mapping when Supabase omits refresh_token inside session object', async () => {
    mockedCreateClient.mockReturnValue({
      auth: {
        signInWithPassword: jest.fn().mockResolvedValue({
          data: {
            session: {
              access_token: 'only-access',
              user: { id: 'u' },
              // missing refresh_token
            },
          },
          error: null,
        }),
      },
    } as never);

    await expect(service.login({ email: 'u@test.com', password: 'pw123456' })).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
