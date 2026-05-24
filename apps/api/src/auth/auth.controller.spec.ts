import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from './supabase-auth.guard';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import type { AuthTokenResponse } from './session.types';

describe('AuthController', () => {
  let controller: AuthController;
  const login = jest.fn();
  const register = jest.fn();
  const refresh = jest.fn();

  beforeEach(async () => {
    login.mockReset();
    register.mockReset();
    refresh.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login,
            register,
            refresh,
          },
        },
      ],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get(AuthController);
  });

  it('login forwards to AuthService', async () => {
    const tokenResponse: AuthTokenResponse = {
      access_token: 'a',
      refresh_token: 'r',
      expires_in: 3600,
      expires_at: 1700000000,
      token_type: 'bearer',
      user: { id: 'u1', email: 'user@example.com' },
    };
    login.mockResolvedValue(tokenResponse);

    await expect(
      controller.login({ email: 'user@example.com', password: 'pw123456' }),
    ).resolves.toEqual(tokenResponse);

    expect(login).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'pw123456',
    });
  });

  it('logout is a noop body for client-side token discard', async () => {
    expect(controller.logout()).toBeUndefined();
  });

  it('register forwards payloads to AuthService', async () => {
    register.mockResolvedValue({
      message: 'Check email',
    });

    await expect(
      controller.register({ email: 'neo@test.dev', password: 'pw2345678' }),
    ).resolves.toEqual({
      message: 'Check email',
    });
    expect(register).toHaveBeenCalledWith({ email: 'neo@test.dev', password: 'pw2345678' });
  });

  it('Scenario: authenticated me THEN echoes repository user envelope', async () => {
    const req = {
      user: {
        id: 'user-uuid',
        email: 'me@test.dev',
      },
    } as AuthenticatedRequest;

    expect(controller.me(req)).toEqual({
      user: {
        id: 'user-uuid',
        email: 'me@test.dev',
      },
    });
  });

  it('refresh forwards refresh_token to AuthService', async () => {
    const tokenResponse: AuthTokenResponse = {
      access_token: 'na',
      refresh_token: 'nr',
      expires_in: 3600,
      expires_at: 1700000001,
      token_type: 'bearer',
      user: { id: 'u1' },
    };
    refresh.mockResolvedValue(tokenResponse);

    await expect(controller.refresh({ refresh_token: 'old-refresh-token-abc' })).resolves.toEqual(
      tokenResponse,
    );

    expect(refresh).toHaveBeenCalledWith({ refresh_token: 'old-refresh-token-abc' });
  });

  it('login propagates UnauthorizedException from AuthService', async () => {
    login.mockRejectedValue(new UnauthorizedException('Invalid credentials'));

    await expect(
      controller.login({ email: 'x@example.com', password: 'wrongpw1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
