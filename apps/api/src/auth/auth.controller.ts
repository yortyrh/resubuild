import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from './auth-user.types';
import { type Auth, BETTER_AUTH } from './better-auth';
import { AuthConfigService, type OAuthProviderId } from './config/auth.config';
import { ChangePasswordDto, OAuthExchangeDto } from './dto/auth.dto';
import { OAuthHandoffService } from './oauth-handoff.service';
import { safeRedirectPath } from './safe-redirect';
import type { AuthMeResponse, OAuthExchangeResponse } from './session.types';
import { SessionAuthGuard } from './session-auth.guard';
import { resolveWebOrigin } from './web-origin';

/** Session cookies Better Auth may set on the API origin during OAuth. */
const SESSION_COOKIES = [
  'better-auth.session_token',
  '__Secure-better-auth.session_token',
  'better-auth.session_data',
  '__Secure-better-auth.session_data',
];

/**
 * App-specific auth endpoints. Email/password, verification, reset, magic
 * link and OTP are served by Better Auth itself under `/api/auth/*`.
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authConfig: AuthConfigService,
    private readonly handoff: OAuthHandoffService,
    @Inject(BETTER_AUTH) private readonly auth: Auth,
  ) {}

  /** The requesting web origin when allowed (REQ-AUTH-011), else the configured WEB_URL. */
  private webOrigin(requested: unknown): string {
    return resolveWebOrigin(
      requested,
      this.authConfig.get('TRUSTED_ORIGINS'),
      this.authConfig.get('WEB_URL'),
    );
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  me(@Req() req: AuthenticatedRequest): Promise<AuthMeResponse> {
    return this.authService.me(req.user);
  }

  @Post('password')
  @HttpCode(200)
  @UseGuards(SessionAuthGuard)
  changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ updated: true; token?: string }> {
    return this.authService.changePassword(
      req.user,
      req.headers.authorization as string,
      dto.current_password,
      dto.new_password,
    );
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Req() req: Request): Promise<void> {
    return this.authService.logout(req.headers.authorization);
  }

  /**
   * Step 2 — Better Auth redirects here after the provider callback, with the
   * new session in a cookie on the API origin. Trade it for a one-time code and
   * send the browser back to the SPA; the cookie is cleared. Declared before
   * `oauth/:provider` so Express does not treat "complete" as a provider id.
   */
  @Get('oauth/complete')
  async completeOAuth(
    @Req() req: Request,
    @Query('redirect') redirect: string | undefined,
    @Query('origin') origin: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const webUrl = this.webOrigin(origin);
    const session = await this.auth.api
      .getSession({ headers: fromNodeHeaders(req.headers) })
      .catch(() => null);

    for (const name of SESSION_COOKIES) {
      res.clearCookie(name, { path: '/' });
    }

    if (!session?.session?.token) {
      res.redirect(302, `${webUrl}/login?error=oauth`);
      return;
    }

    const code = await this.handoff.issue(session.session.token);
    const target = new URL('/auth/callback', `${webUrl}/`);
    target.searchParams.set('code', code);
    target.searchParams.set('redirect', safeRedirectPath(redirect));
    res.redirect(302, target.toString());
  }

  /**
   * Step 1 — top-level navigation from the SPA: starts the provider flow on
   * the API origin so Better Auth's state cookie is first-party.
   */
  @Get('oauth/:provider')
  async startOAuth(
    @Param('provider') provider: string,
    @Query('redirect') redirect: string | undefined,
    @Query('origin') origin: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    if (!this.authConfig.enabledOAuthProviders().includes(provider as OAuthProviderId)) {
      throw new NotFoundException(`OAuth provider "${provider}" is not enabled`);
    }

    const apiUrl = this.authConfig.get('BETTER_AUTH_URL');
    const webUrl = this.webOrigin(origin);
    const next = safeRedirectPath(redirect);
    let callbackURL = `${apiUrl}/auth/oauth/complete?redirect=${encodeURIComponent(next)}`;
    if (webUrl !== this.authConfig.get('WEB_URL')) {
      callbackURL += `&origin=${encodeURIComponent(webUrl)}`;
    }
    const errorCallbackURL = `${webUrl}/login?error=oauth`;

    const { headers, response } = await this.auth.api.signInSocial({
      body: { provider, callbackURL, errorCallbackURL, disableRedirect: true },
      returnHeaders: true,
    });

    for (const cookie of headers.getSetCookie()) {
      res.append('Set-Cookie', cookie);
    }
    if (!response?.url) {
      throw new BadRequestException('Could not start OAuth sign-in');
    }
    res.redirect(302, response.url);
  }

  /** Step 3 — the SPA exchanges the one-time code for its bearer token. */
  @Post('oauth/exchange')
  @HttpCode(200)
  async exchange(@Body() dto: OAuthExchangeDto): Promise<OAuthExchangeResponse> {
    const token = await this.handoff.redeem(dto.code);
    if (!token) {
      throw new UnauthorizedException('Invalid or expired sign-in code');
    }
    return { token };
  }
}
