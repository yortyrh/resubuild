import { account, and, type Database, eq, session, user, verification } from '@resubuild/db';
import { type Auth as BetterAuthInstance, betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createAuthMiddleware } from 'better-auth/api';
import { bearer, emailOTP, magicLink } from 'better-auth/plugins';
import type { MailService } from '../mail/mail.service';
import type { AuthConfigService } from './config/auth.config';
import { hashPassword, isLegacyBcryptHash, verifyPassword } from './password-hash';
import { resolveRequestWebOrigin } from './web-origin';

export const AUTH_BASE_PATH = '/api/auth';

export interface CreateAuthDeps {
  db: Database;
  mail: MailService;
  config: AuthConfigService;
}

/** Links in emails point at web pages, which call the API with the token. */
export function webLink(webUrl: string, path: string, token: string): string {
  const url = new URL(path, `${webUrl}/`);
  url.searchParams.set('token', token);
  return url.toString();
}

/**
 * Better Auth over the application Postgres (tables `user`, `session`,
 * `account`, `verification` from `@resubuild/db`).
 *
 * Clients authenticate with `Authorization: Bearer <session token>` (bearer
 * plugin; the token is returned in the `set-auth-token` response header).
 * Sessions live in the database, so sign-out revokes them.
 */
export function createAuth({ db, mail, config }: CreateAuthDeps): Auth {
  const webUrl = config.get('WEB_URL');
  const trustedOrigins = config.get('TRUSTED_ORIGINS');
  /** Web origin the triggering request came from, else the configured WEB_URL. */
  const webOrigin = (request: Request | null | undefined) =>
    resolveRequestWebOrigin(request, trustedOrigins, webUrl);
  const passwordless = config.get('AUTH_PASSWORDLESS_ENABLED');
  const requireVerification = config.get('AUTH_EMAIL_VERIFICATION_ENABLED');

  const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};
  for (const provider of config.enabledOAuthProviders()) {
    const prefix = provider.toUpperCase() as 'GITHUB' | 'GOOGLE' | 'LINKEDIN';
    socialProviders[provider] = {
      clientId: config.get(`${prefix}_CLIENT_ID`) as string,
      clientSecret: config.get(`${prefix}_CLIENT_SECRET`) as string,
    };
  }

  const auth = betterAuth({
    appName: 'Resubuild',
    baseURL: config.get('BETTER_AUTH_URL'),
    basePath: AUTH_BASE_PATH,
    secret: config.get('BETTER_AUTH_SECRET'),
    trustedOrigins,
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: { user, session, account, verification },
    }),
    advanced: {
      database: { generateId: 'uuid' },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 6,
      requireEmailVerification: requireVerification,
      revokeSessionsOnPasswordReset: true,
      password: { hash: hashPassword, verify: verifyPassword },
      ...(config.get('AUTH_FORGOT_PASSWORD_ENABLED')
        ? {
            resetPasswordTokenExpiresIn: 60 * 60,
            sendResetPassword: async ({ user: target, token }, request) => {
              await mail.send('reset-password', target.email, {
                url: webLink(webOrigin(request), '/reset-password', token),
                expiresInMinutes: 60,
              });
            },
            onPasswordReset: async ({ user: target }) => {
              await mail.send('password-changed', target.email, {});
            },
          }
        : {}),
    },
    emailVerification: {
      sendOnSignUp: requireVerification,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user: target, token }, request) => {
        await mail.send('verify-email', target.email, {
          url: webLink(webOrigin(request), '/auth/verify', token),
        });
      },
    },
    account: {
      accountLinking: { enabled: true, trustedProviders: ['github', 'google', 'linkedin'] },
    },
    socialProviders,
    plugins: [
      bearer(),
      ...(passwordless
        ? [
            magicLink({
              expiresIn: 60 * 5,
              sendMagicLink: async ({ email, token }, ctx) => {
                await mail.send('magic-link', email, {
                  url: webLink(webOrigin(ctx?.request), '/auth/magic', token),
                  expiresInMinutes: 5,
                });
              },
            }),
            emailOTP({
              expiresIn: 60 * 5,
              sendVerificationOTP: async ({ email, otp, type }) => {
                await mail.send('otp-code', email, {
                  code: otp,
                  purpose:
                    type === 'sign-in'
                      ? 'sign-in'
                      : type === 'forget-password'
                        ? 'forget-password'
                        : 'email-verification',
                  expiresInMinutes: 5,
                });
              },
            }),
          ]
        : []),
    ],
    hooks: {
      // Accounts migrated from Supabase keep bcrypt hashes; upgrade them to
      // scrypt on the first successful password sign-in.
      after: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== '/sign-in/email') return;
        const newSession = ctx.context.newSession;
        const password = (ctx.body as { password?: unknown } | undefined)?.password;
        if (!newSession || typeof password !== 'string') return;

        const [credential] = await db
          .select({ id: account.id, password: account.password })
          .from(account)
          .where(and(eq(account.userId, newSession.user.id), eq(account.providerId, 'credential')))
          .limit(1);
        if (!credential?.password || !isLegacyBcryptHash(credential.password)) return;

        await db
          .update(account)
          .set({ password: await hashPassword(password) })
          .where(eq(account.id, credential.id));
      }),
    },
  });

  return auth as unknown as Auth;
}

/**
 * Typed with the core options only: server code calls core endpoints
 * (`getSession`, `setPassword`, …); plugin endpoints are reached over HTTP.
 */
export interface Auth {
  handler: (request: Request) => Promise<Response>;
  api: BetterAuthInstance['api'];
}

/** Injection token for the Better Auth instance. */
export const BETTER_AUTH = Symbol('BETTER_AUTH');
