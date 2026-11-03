import {
  type ArgumentsHost,
  BadRequestException,
  Catch,
  type ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

/**
 * Postgres SQLSTATE classes that mean "the client sent something invalid":
 * 22 = data exception (e.g. `22P02` malformed uuid), 23 = integrity constraint
 * violation (unique, FK, check, not-null).
 */
const CLIENT_ERROR_CLASSES = ['22', '23'];

interface PgLikeError {
  code?: unknown;
  message?: unknown;
  detail?: unknown;
}

function findPgError(error: unknown): PgLikeError | null {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === 'object'; depth++) {
    const candidate = current as PgLikeError & { cause?: unknown };
    if (typeof candidate.code === 'string' && /^[0-9A-Z]{5}$/.test(candidate.code)) {
      return candidate;
    }
    current = candidate.cause;
  }
  return null;
}

/** Maps a database error to the HTTP exception PostgREST used to produce, or null. */
export function toHttpException(error: unknown): HttpException | null {
  if (error instanceof HttpException) return null;
  const pgError = findPgError(error);
  if (!pgError || typeof pgError.code !== 'string') return null;
  if (!CLIENT_ERROR_CLASSES.includes(pgError.code.slice(0, 2))) return null;
  const message = typeof pgError.message === 'string' ? pgError.message : 'Invalid request';
  return new BadRequestException(message);
}

/**
 * Global filter: invalid-input / constraint errors from Postgres become 400s
 * (matching the previous PostgREST behaviour); everything else falls through
 * to Nest's default handling.
 */
@Catch()
export class DatabaseExceptionFilter extends BaseExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    super.catch(toHttpException(exception) ?? exception, host);
  }
}
