import { Injectable, Logger } from '@nestjs/common';
import { GuestImportConfig } from './guest-import.config';

export const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** Server-side check of a Cloudflare Turnstile token. */
@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);

  constructor(private readonly config: GuestImportConfig) {}

  get enabled(): boolean {
    return Boolean(this.config.turnstileSecretKey);
  }

  /** True when the token is valid (always true when Turnstile is not configured). */
  async verify(token: string | undefined, remoteIp?: string): Promise<boolean> {
    const secret = this.config.turnstileSecretKey;
    if (!secret) return true;
    if (!token?.trim()) return false;

    const body = new URLSearchParams({ secret, response: token.trim() });
    if (remoteIp) body.set('remoteip', remoteIp);
    try {
      const response = await fetch(TURNSTILE_VERIFY_URL, {
        method: 'POST',
        body,
        signal: AbortSignal.timeout(10_000),
      });
      const result = (await response.json()) as { success?: boolean; 'error-codes'?: string[] };
      if (!result.success) {
        this.logger.debug(
          `Turnstile rejected a token: ${(result['error-codes'] ?? []).join(', ')}`,
        );
      }
      return result.success === true;
    } catch (error) {
      this.logger.warn(
        `Turnstile verification failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }
}
