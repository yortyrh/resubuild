import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { account, and, type Database, eq, isNotNull } from '@resubuild/db';
import { DATABASE } from '../database/database.tokens';
import type { AuthUser } from './auth-user.types';
import { type Auth, BETTER_AUTH } from './better-auth';
import type { AuthMeResponse } from './session.types';

function errorMessage(error: unknown, fallback: string): string {
  const e = error as { body?: { message?: unknown }; message?: unknown };
  const message = e?.body?.message ?? e?.message;
  return typeof message === 'string' && message ? message : fallback;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(BETTER_AUTH) private readonly auth: Auth,
    @Inject(DATABASE) private readonly db: Database,
  ) {}

  async hasPassword(userId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: account.id })
      .from(account)
      .where(
        and(
          eq(account.userId, userId),
          eq(account.providerId, 'credential'),
          isNotNull(account.password),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  async me(user: AuthUser): Promise<AuthMeResponse> {
    const candidate = user.userMetadata?.picture;
    const picture =
      typeof candidate === 'string' && candidate.trim().length > 0 ? candidate.trim() : null;

    return {
      user: { id: user.id, email: user.email, picture },
      has_password: await this.hasPassword(user.id),
    };
  }

  /**
   * Changes the password (current one required) or sets a first password for
   * OAuth/passwordless accounts. Changing a password revokes every session
   * and returns a fresh token (`token`) that replaces the caller's one.
   */
  async changePassword(
    user: AuthUser,
    authorization: string,
    currentPassword: string | null | undefined,
    newPassword: string,
  ): Promise<{ updated: true; token?: string }> {
    const headers = new Headers({ authorization });
    try {
      if (await this.hasPassword(user.id)) {
        if (!currentPassword) {
          throw new BadRequestException('Current password is required');
        }
        const result = (await this.auth.api.changePassword({
          headers,
          body: { currentPassword, newPassword, revokeOtherSessions: true },
        })) as { token?: string | null };
        return result.token ? { updated: true, token: result.token } : { updated: true };
      } else {
        await this.auth.api.setPassword({ headers, body: { newPassword } });
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(errorMessage(error, 'Password update failed'));
    }
    return { updated: true };
  }

  /** Revokes the session behind the bearer token. */
  async logout(authorization: string | undefined): Promise<void> {
    if (!authorization) return;
    await this.auth.api.signOut({ headers: new Headers({ authorization }) }).catch(() => undefined);
  }
}
