import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import { AuthController } from './auth.controller';
import type { AuthService } from './auth.service';
import type { Auth } from './better-auth';
import type { AuthConfigService } from './config/auth.config';
import type { OAuthHandoffService } from './oauth-handoff.service';

function mockResponse() {
  return {
    append: jest.fn(),
    clearCookie: jest.fn(),
    redirect: jest.fn(),
  } as unknown as Response & { append: jest.Mock; clearCookie: jest.Mock; redirect: jest.Mock };
}

describe('AuthController', () => {
  let authService: jest.Mocked<Pick<AuthService, 'me' | 'changePassword' | 'logout'>>;
  let handoff: jest.Mocked<Pick<OAuthHandoffService, 'issue' | 'redeem'>>;
  let api: { signInSocial: jest.Mock; getSession: jest.Mock };
  let controller: AuthController;

  beforeEach(() => {
    authService = {
      me: jest.fn().mockResolvedValue({ user: { id: 'u1' }, has_password: true }),
      changePassword: jest.fn().mockResolvedValue({ updated: true }),
      logout: jest.fn().mockResolvedValue(undefined),
    };
    handoff = { issue: jest.fn().mockResolvedValue('one-time-code'), redeem: jest.fn() };
    api = { signInSocial: jest.fn(), getSession: jest.fn() };
    const config = {
      get: (key: string) =>
        ({ BETTER_AUTH_URL: 'http://api.test', WEB_URL: 'http://web.test' })[key],
      enabledOAuthProviders: () => ['github'],
    } as unknown as AuthConfigService;
    controller = new AuthController(
      authService as unknown as AuthService,
      config,
      handoff as unknown as OAuthHandoffService,
      { api } as unknown as Auth,
    );
  });

  it('delegates me, password and logout to AuthService', async () => {
    const req = { user: { id: 'u1' }, headers: { authorization: 'Bearer t' } } as never;
    await expect(controller.me(req)).resolves.toMatchObject({ has_password: true });
    await controller.changePassword(req, { current_password: 'a', new_password: 'bbbbbb' });
    expect(authService.changePassword).toHaveBeenCalledWith(
      { id: 'u1' },
      'Bearer t',
      'a',
      'bbbbbb',
    );
    await controller.logout(req);
    expect(authService.logout).toHaveBeenCalledWith('Bearer t');
  });

  describe('startOAuth', () => {
    it('starts the provider flow, forwarding the state cookie and redirecting', async () => {
      const headers = new Headers();
      headers.append('set-cookie', 'better-auth.state=abc; Path=/; HttpOnly');
      api.signInSocial.mockResolvedValue({
        headers,
        response: { url: 'https://github.com/login/oauth/authorize?x=1', redirect: true },
      });
      const res = mockResponse();

      await controller.startOAuth('github', '/dashboard/cv', res);

      expect(api.signInSocial).toHaveBeenCalledWith({
        body: {
          provider: 'github',
          callbackURL: 'http://api.test/auth/oauth/complete?redirect=%2Fdashboard%2Fcv',
          errorCallbackURL: 'http://web.test/login?error=oauth',
          disableRedirect: true,
        },
        returnHeaders: true,
      });
      expect(res.append).toHaveBeenCalledWith(
        'Set-Cookie',
        'better-auth.state=abc; Path=/; HttpOnly',
      );
      expect(res.redirect).toHaveBeenCalledWith(
        302,
        'https://github.com/login/oauth/authorize?x=1',
      );
    });

    it('sanitises the redirect and rejects disabled providers', async () => {
      api.signInSocial.mockResolvedValue({
        headers: new Headers(),
        response: { url: 'https://p' },
      });
      await controller.startOAuth('github', 'https://evil.test', mockResponse());
      expect(api.signInSocial.mock.calls[0][0].body.callbackURL).toContain('redirect=%2Fdashboard');
      await expect(controller.startOAuth('google', undefined, mockResponse())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('fails when Better Auth returns no provider URL', async () => {
      api.signInSocial.mockResolvedValue({ headers: new Headers(), response: {} });
      await expect(controller.startOAuth('github', undefined, mockResponse())).rejects.toThrow(
        'Could not start OAuth sign-in',
      );
    });
  });

  describe('completeOAuth', () => {
    it('swaps the cookie session for a one-time code and clears the cookies', async () => {
      api.getSession.mockResolvedValue({ session: { token: 'session-token' }, user: {} });
      const res = mockResponse();

      await controller.completeOAuth(
        { headers: { cookie: 'better-auth.session_token=x' } } as never,
        '/dashboard',
        res,
      );

      expect(handoff.issue).toHaveBeenCalledWith('session-token');
      expect(res.clearCookie).toHaveBeenCalledWith('better-auth.session_token', { path: '/' });
      expect(res.redirect).toHaveBeenCalledWith(
        302,
        'http://web.test/auth/callback?code=one-time-code&redirect=%2Fdashboard',
      );
    });

    it('sends the user back to login when there is no session', async () => {
      api.getSession.mockRejectedValue(new Error('no session'));
      const res = mockResponse();
      await controller.completeOAuth({ headers: {} } as never, undefined, res);
      expect(handoff.issue).not.toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith(302, 'http://web.test/login?error=oauth');
    });
  });

  it('exchange returns the token for a valid code and 401 otherwise', async () => {
    handoff.redeem.mockResolvedValueOnce('session-token').mockResolvedValueOnce(null);
    await expect(controller.exchange({ code: 'good-code-123' })).resolves.toEqual({
      token: 'session-token',
    });
    await expect(controller.exchange({ code: 'bad-code-1234' })).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
