import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { and, type Database, eq, gt, verification } from '@resubuild/db';
import { DATABASE } from '../database/database.tokens';

const PREFIX = 'oauth-handoff:';
const TTL_MS = 2 * 60 * 1000;

/**
 * One-time codes that hand an OAuth session from the API origin to the SPA.
 *
 * After the provider callback the session exists only as a cookie on the API
 * origin; the API swaps it for a short-lived code in the redirect URL and the
 * SPA exchanges the code for the bearer token. Codes live in Better Auth's
 * `verification` table, expire after two minutes and are single-use.
 */
@Injectable()
export class OAuthHandoffService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async issue(sessionToken: string): Promise<string> {
    const code = randomBytes(32).toString('base64url');
    await this.db.insert(verification).values({
      identifier: `${PREFIX}${code}`,
      value: sessionToken,
      expiresAt: new Date(Date.now() + TTL_MS),
    });
    return code;
  }

  /** Returns the session token and deletes the code, or null when unknown/expired. */
  async redeem(code: string): Promise<string | null> {
    if (!code) return null;
    const [row] = await this.db
      .delete(verification)
      .where(
        and(
          eq(verification.identifier, `${PREFIX}${code}`),
          gt(verification.expiresAt, new Date()),
        ),
      )
      .returning({ value: verification.value });
    return row?.value ?? null;
  }
}
