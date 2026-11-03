import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from './auth-user.types';
import { type Auth, BETTER_AUTH } from './better-auth';

export type { AuthenticatedRequest, AuthUser } from './auth-user.types';

/**
 * Validates `Authorization: Bearer <session token>` against the Better Auth
 * session table. Cookies are ignored on purpose: the SPA authenticates with
 * bearer tokens only, which keeps the API immune to CSRF.
 */
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(@Inject(BETTER_AUTH) private readonly auth: Auth) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.toLowerCase().startsWith('bearer ') || !authHeader.slice(7).trim()) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const result = await this.auth.api
      .getSession({ headers: new Headers({ authorization: authHeader }) })
      .catch(() => null);

    if (!result?.user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    request.user = {
      id: result.user.id,
      email: result.user.email,
      authMethod: 'session',
      userMetadata: { name: result.user.name, picture: result.user.image ?? null },
    };

    return true;
  }
}
