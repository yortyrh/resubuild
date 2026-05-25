/**
 * Scenarios aligned with openspec/specs/authentication (Bearer guard + getUser).
 */

import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { createClient } from '@supabase/supabase-js';
import { SupabaseAuthGuard } from './supabase-auth.guard';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

const mockedCreateClient = jest.mocked(createClient);

function execContext(headers: Record<string, string | undefined>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as ExecutionContext;
}

describe('SupabaseAuthGuard', () => {
  let guard: SupabaseAuthGuard;
  let get: jest.Mock;

  beforeEach(async () => {
    get = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseAuthGuard,
        {
          provide: ConfigService,
          useValue: { get: (k: string) => get(k) },
        },
      ],
    }).compile();

    guard = module.get(SupabaseAuthGuard);
    mockedCreateClient.mockReset();
    get.mockImplementation((key: string) => {
      if (key === 'SUPABASE_URL') return 'https://ex.supabase.co';
      if (key === 'SUPABASE_ANON_KEY') return 'anon';
      return undefined;
    });
  });

  it('Scenario: No bearer THEN 401 Missing bearer token', async () => {
    await expect(guard.canActivate(execContext({}))).rejects.toThrow(
      expect.objectContaining({ message: 'Missing bearer token' }),
    );
  });

  it('Scenario: Bearer missing prefix THEN 401 Missing bearer token', async () => {
    await expect(guard.canActivate(execContext({ authorization: 'Token abc' }))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('Scenario: Missing URL or anon THEN 401 server auth is not configured', async () => {
    get.mockReturnValue(undefined);

    await expect(
      guard.canActivate(execContext({ authorization: 'Bearer valid.jwt.segment' })),
    ).rejects.toThrow(expect.objectContaining({ message: 'Server auth is not configured' }));
  });

  it('Scenario: Supabase rejects token THEN Invalid or expired token', async () => {
    const getUser = jest.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'invalid' },
    });
    mockedCreateClient.mockReturnValue({ auth: { getUser } } as never);

    await expect(
      guard.canActivate(execContext({ authorization: 'Bearer expired' })),
    ).rejects.toThrow(expect.objectContaining({ message: 'Invalid or expired token' }));
    expect(mockedCreateClient).toHaveBeenCalledWith('https://ex.supabase.co', 'anon');
    expect(getUser).toHaveBeenCalledWith('expired');
  });

  it('Scenario: Valid token THEN attaches user.id, email, accessToken', async () => {
    const getUser = jest.fn().mockResolvedValue({
      data: { user: { id: 'uuid-123', email: 'me@test.com' } },
      error: null,
    });
    mockedCreateClient.mockReturnValue({ auth: { getUser } } as never);

    const req: { headers: Record<string, string>; user?: unknown } = {
      headers: { authorization: 'Bearer good.token.part' },
    };

    await expect(
      guard.canActivate({
        switchToHttp: () => ({ getRequest: () => req }),
      } as ExecutionContext),
    ).resolves.toBe(true);

    expect(req.user).toEqual({
      id: 'uuid-123',
      email: 'me@test.com',
      accessToken: 'good.token.part',
    });
  });
});
