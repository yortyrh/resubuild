import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { account, eq, user as userTable } from '@resubuild/db';
import bcrypt from 'bcryptjs';
import { useTestDb } from '../database/test-db.helpers';
import type { MailService } from '../mail/mail.service';
import { AuthService } from './auth.service';
import { type Auth, createAuth, webLink } from './better-auth';
import { AuthConfigService } from './config/auth.config';
import { SessionAuthGuard } from './session-auth.guard';

const ENV = {
  BETTER_AUTH_SECRET: 'test-secret-that-is-at-least-32-characters',
  BETTER_AUTH_URL: 'http://api.test',
  WEB_URL: 'http://web.test',
  AUTH_FORGOT_PASSWORD_ENABLED: 'true',
  AUTH_EMAIL_VERIFICATION_ENABLED: 'false',
  AUTH_PASSWORDLESS_ENABLED: 'true',
};

function guardContext(authorization?: string) {
  const request: Record<string, unknown> = { headers: authorization ? { authorization } : {} };
  return {
    request,
    context: { switchToHttp: () => ({ getRequest: () => request }) } as never,
  };
}

describe('Better Auth integration', () => {
  const ctx = useTestDb();
  let auth: Auth;
  let mail: { send: jest.Mock };
  let guard: SessionAuthGuard;
  let service: AuthService;

  function build(env: Record<string, string> = ENV) {
    const config = new AuthConfigService({
      get: (key: string) => env[key as keyof typeof env],
    } as unknown as ConfigService);
    auth = createAuth({ db: ctx.db, mail: mail as unknown as MailService, config });
    guard = new SessionAuthGuard(auth);
    service = new AuthService(auth, ctx.db);
  }

  beforeEach(() => {
    mail = { send: jest.fn().mockResolvedValue({ messageId: 'm', delivered: true }) };
    build();
  });

  async function signUp(email = 'jane@test.local', password = 'secret123') {
    const result = await auth.api.signUpEmail({ body: { email, password, name: 'Jane' } });
    return result as unknown as { token: string | null; user: { id: string } };
  }

  async function signIn(email = 'jane@test.local', password = 'secret123') {
    const result = await auth.api.signInEmail({ body: { email, password } });
    return (result as unknown as { token: string }).token;
  }

  it('builds web links for emails', () => {
    expect(webLink('http://web.test', '/auth/verify', 'a b')).toBe(
      'http://web.test/auth/verify?token=a+b',
    );
  });

  it('signs up with UUID ids and authenticates the bearer token in the guard', async () => {
    const { user } = await signUp();
    expect(user.id).toMatch(/^[0-9a-f-]{36}$/);

    const token = await signIn();
    const { request, context } = guardContext(`Bearer ${token}`);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toMatchObject({
      id: user.id,
      email: 'jane@test.local',
      authMethod: 'session',
      userMetadata: { name: 'Jane', picture: null },
    });
  });

  it('rejects missing and invalid tokens', async () => {
    await expect(guard.canActivate(guardContext().context)).rejects.toThrow('Missing bearer token');
    await expect(guard.canActivate(guardContext('Bearer ').context)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(guard.canActivate(guardContext('Bearer nope').context)).rejects.toThrow(
      'Invalid or expired token',
    );
  });

  it('logout revokes the session', async () => {
    await signUp();
    const token = await signIn();
    await service.logout(`Bearer ${token}`);
    await service.logout(undefined);
    await expect(guard.canActivate(guardContext(`Bearer ${token}`).context)).rejects.toThrow(
      'Invalid or expired token',
    );
  });

  it('reports has_password and changes the password', async () => {
    const { user } = await signUp();
    const token = await signIn();
    const authUser = { id: user.id, email: 'jane@test.local', userMetadata: { picture: ' ' } };

    await expect(service.me(authUser)).resolves.toEqual({
      user: { id: user.id, email: 'jane@test.local', picture: null },
      has_password: true,
    });
    await expect(
      service.changePassword(authUser, `Bearer ${token}`, null, 'another-pw'),
    ).rejects.toThrow('Current password is required');
    await expect(
      service.changePassword(authUser, `Bearer ${token}`, 'wrong-pw', 'another-pw'),
    ).rejects.toThrow('Current password is incorrect');
    await expect(
      service.changePassword(authUser, `Bearer ${token}`, 'secret123', 'tiny'),
    ).rejects.toThrow('Password must be at least 6 characters');
    const changed = await service.changePassword(
      authUser,
      `Bearer ${token}`,
      'secret123',
      'another-pw',
    );
    expect(changed).toEqual({ updated: true, token: expect.any(String) });
    // Other sessions (including the old token) are revoked; the new token works.
    await expect(guard.canActivate(guardContext(`Bearer ${token}`).context)).rejects.toThrow();
    await expect(guard.canActivate(guardContext(`Bearer ${changed.token}`).context)).resolves.toBe(
      true,
    );
    await expect(signIn('jane@test.local', 'another-pw')).resolves.toEqual(expect.any(String));
  });

  it('sets a first password for accounts without one', async () => {
    const { user } = await signUp();
    const token = await signIn();
    await ctx.db.delete(account).where(eq(account.userId, user.id));
    const authUser = { id: user.id, userMetadata: { picture: 'https://img.test/a.png' } };

    await expect(service.me(authUser)).resolves.toMatchObject({
      user: { picture: 'https://img.test/a.png' },
      has_password: false,
    });
    await expect(
      service.changePassword(authUser, `Bearer ${token}`, undefined, 'first-password'),
    ).resolves.toEqual({ updated: true });
    await expect(service.hasPassword(user.id)).resolves.toBe(true);
  });

  it('accepts bcrypt hashes migrated from Supabase and upgrades them to scrypt', async () => {
    const { user } = await signUp();
    await ctx.db
      .update(account)
      .set({ password: await bcrypt.hash('legacy-pw', 4) })
      .where(eq(account.userId, user.id));

    await expect(signIn('jane@test.local', 'legacy-pw')).resolves.toEqual(expect.any(String));

    const [row] = await ctx.db.select().from(account).where(eq(account.userId, user.id));
    expect(row.password?.startsWith('$2')).toBe(false);
    await expect(signIn('jane@test.local', 'legacy-pw')).resolves.toEqual(expect.any(String));
  });

  it('sends the reset email with a link to the web app', async () => {
    await signUp();
    await auth.api.requestPasswordReset({ body: { email: 'jane@test.local' } });
    expect(mail.send).toHaveBeenCalledWith('reset-password', 'jane@test.local', {
      url: expect.stringMatching(/^http:\/\/web\.test\/reset-password\?token=.+/),
      expiresInMinutes: 60,
    });
  });

  it('requires verification when enabled and sends the verification email', async () => {
    build({ ...ENV, AUTH_EMAIL_VERIFICATION_ENABLED: 'true' });
    const { token } = await signUp();
    expect(token).toBeNull();
    expect(mail.send).toHaveBeenCalledWith('verify-email', 'jane@test.local', {
      url: expect.stringMatching(/^http:\/\/web\.test\/auth\/verify\?token=.+/),
    });
    await expect(signIn()).rejects.toMatchObject({ body: { code: 'EMAIL_NOT_VERIFIED' } });

    await ctx.db.update(userTable).set({ emailVerified: true });
    await expect(signIn()).resolves.toEqual(expect.any(String));
  });

  it('maps email OTP purposes to the template and registers configured OAuth providers', async () => {
    build({
      ...ENV,
      GITHUB_CLIENT_ID: 'gh-id',
      GITHUB_CLIENT_SECRET: 'gh-secret',
    } as typeof ENV);
    await signUp();

    for (const [type, purpose] of [
      ['sign-in', 'sign-in'],
      ['forget-password', 'forget-password'],
      ['email-verification', 'email-verification'],
    ] as const) {
      // Plugin endpoint: not part of the core-typed `Auth['api']`.
      const pluginApi = auth.api as unknown as {
        sendVerificationOTP: (input: { body: { email: string; type: string } }) => Promise<unknown>;
      };
      await pluginApi.sendVerificationOTP({ body: { email: 'jane@test.local', type } });
      expect(mail.send).toHaveBeenLastCalledWith(
        'otp-code',
        'jane@test.local',
        expect.objectContaining({ code: expect.stringMatching(/^\d{6}$/), purpose }),
      );
    }

    const social = (await auth.api.signInSocial({
      body: {
        provider: 'github',
        callbackURL: 'http://api.test/auth/oauth/complete',
        disableRedirect: true,
      },
    })) as { url?: string };
    expect(social.url).toMatch(/^https:\/\/github\.com\/login\/oauth\/authorize/);
  });

  it('sends a "password changed" notice after a reset', async () => {
    await signUp();
    await auth.api.requestPasswordReset({ body: { email: 'jane@test.local' } });
    const url = mail.send.mock.calls.find((c) => c[0] === 'reset-password')?.[2].url as string;
    const token = new URL(url).searchParams.get('token') as string;
    await auth.api.resetPassword({ body: { token, newPassword: 'brand-new-pw' } });
    expect(mail.send).toHaveBeenCalledWith('password-changed', 'jane@test.local', {});
  });

  it('serves the passwordless endpoints only when enabled', async () => {
    const send = (instance: Auth) =>
      instance.handler(
        new Request('http://api.test/api/auth/sign-in/magic-link', {
          method: 'POST',
          headers: { 'content-type': 'application/json', origin: 'http://web.test' },
          body: JSON.stringify({ email: 'jane@test.local' }),
        }),
      );

    expect((await send(auth)).status).toBe(200);
    expect(mail.send).toHaveBeenCalledWith(
      'magic-link',
      'jane@test.local',
      expect.objectContaining({
        url: expect.stringContaining('http://web.test/auth/magic?token='),
      }),
    );

    build({ ...ENV, AUTH_PASSWORDLESS_ENABLED: 'false', AUTH_FORGOT_PASSWORD_ENABLED: 'false' });
    expect((await send(auth)).status).toBe(404);
  });
});
