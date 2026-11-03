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
    allowedHeaders: ['Authorization', 'Content-Type'],
    exposedHeaders: ['Content-Disposition', 'set-auth-token'],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  });

  // After CORS (so /api/auth answers preflight requests), before the body parsers.
  const express = app as NestExpressApplication;
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
