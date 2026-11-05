import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseTokenLimit } from '../ai-hosted/hosted-models.config';

export const DEFAULT_GUEST_IMPORTS_PER_IP_PER_DAY = 3;

/** Settings of the anonymous "import your CV, then sign up" wizard. */
@Injectable()
export class GuestImportConfig {
  private readonly logger = new Logger(GuestImportConfig.name);
  /** Operator switch; the wizard also needs AI_GUEST_MODELS with budget left. */
  readonly enabled: boolean;
  readonly importsPerIpPerDay: number;
  readonly turnstileSecretKey?: string;
  readonly turnstileSiteKey?: string;

  constructor(configService: ConfigService) {
    const flag = configService.get<string>('AI_GUEST_IMPORT_ENABLED')?.trim().toLowerCase();
    this.enabled = flag !== 'false';
    this.importsPerIpPerDay = parseTokenLimit(
      configService.get<string>('AI_GUEST_IMPORTS_PER_IP_PER_DAY'),
      'AI_GUEST_IMPORTS_PER_IP_PER_DAY',
      DEFAULT_GUEST_IMPORTS_PER_IP_PER_DAY,
    );
    this.turnstileSecretKey =
      configService.get<string>('TURNSTILE_SECRET_KEY')?.trim() || undefined;
    this.turnstileSiteKey = configService.get<string>('TURNSTILE_SITE_KEY')?.trim() || undefined;

    if (Boolean(this.turnstileSecretKey) !== Boolean(this.turnstileSiteKey)) {
      throw new Error('Set both TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY, or neither');
    }
    if (configService.get<string>('AI_GUEST_MODELS')?.trim() && !this.turnstileSecretKey) {
      this.logger.warn(
        'Guest import runs without a Turnstile challenge (TURNSTILE_* unset); only the per-IP limit protects the guest budget',
      );
    }
  }
}
