import { type INestApplication, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { toNodeHandler } from 'better-auth/node';
import { AUTH_BASE_PATH, type Auth, BETTER_AUTH } from './auth/better-auth';

/**
 * HTTP wiring shared by `main.ts` and the e2e harness.
 *
 * Requires the app to be created with `bodyParser: false`: Better Auth reads
 * the raw request itself, so its handler (`/api/auth/*`) is mounted first and
 * Nest's JSON/urlencoded parsers are registered after it.
 */
export function configureApp(app: INestApplication): void {
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',')
      .map((o) => o.trim())
      .filter(Boolean) ?? ['http://localhost:3000'],
    credentials: false,
    // Turnstile token and guest job token of the anonymous import wizard.
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'cf-turnstile-response',
      'x-guest-import-token',
    ],
    exposedHeaders: ['Content-Disposition', 'set-auth-token'],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  });

  const express = app as NestExpressApplication;
  // Behind a reverse proxy, `req.ip` must come from X-Forwarded-For (per-IP guest limits).
  const trustProxy = parseTrustProxy(process.env.TRUST_PROXY);
  if (trustProxy !== undefined) express.set('trust proxy', trustProxy);

  // After CORS (so /api/auth answers preflight requests), before the body parsers.
  const auth = app.get<Auth>(BETTER_AUTH);
  express.getHttpAdapter().getInstance().all(`${AUTH_BASE_PATH}/*splat`, toNodeHandler(auth));
  express.useBodyParser('json');
  express.useBodyParser('urlencoded', { extended: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
}

/**
 * Express `trust proxy` from env: `true`/`false`, a hop count, or a list of
 * addresses/subnets. Undefined when unset (Express default: no proxy trusted).
 */
export function parseTrustProxy(raw: string | undefined): boolean | number | string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^\d+$/.test(value)) return Number(value);
  return value;
}
