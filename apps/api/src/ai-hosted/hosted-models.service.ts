import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ModelTokenUsage, UsageMeter } from '@resubuild/import-agent';
import { toProviderOptions } from '@resubuild/import-models';
import { AiUsageRepository } from './ai-usage.repository';
import { HostedModelPool, HostedPoolExhaustedError } from './hosted-model-pool';
import {
  type HostedModelEntry,
  HostedModelsConfigService,
  type HostedPoolName,
} from './hosted-models.config';
import { usagePeriod, usagePeriodResetsAt } from './usage-period';

export const INCLUDED_QUOTA_EXCEEDED = 'AI_INCLUDED_QUOTA_EXCEEDED';
export const INCLUDED_DISPLAY_NAME = 'Resubuild included AI';

/** Model call credentials for one run on an app-funded model. */
export interface HostedCredentials {
  pool: HostedPoolName;
  entryId: string;
  modelId: string;
  apiKey: string;
  providerOptions?: Record<string, Record<string, unknown>>;
  /** Counts the run's tokens against the pool entry (and the user, for `included`). */
  usageMeter: UsageMeter;
  /** Call when the run fails, so a rejected or rate-limited key cools down. */
  onRunError(error: unknown): void;
}

export interface IncludedUsage {
  used: number;
  limit: number;
  remaining: number;
  /** When the monthly counter resets (start of next UTC month). */
  resetsAt: string;
}

export interface IncludedStatus {
  enabled: boolean;
  /** At least one included model has budget left this month. */
  available: boolean;
  usage?: IncludedUsage;
}

/**
 * App-funded (included) models. Which provider and model serve
 * a run is an operator detail: nothing here is returned to clients, so models
 * can be swapped (e.g. for a smaller fine-tuned one) without users noticing.
 */
@Injectable()
export class HostedModelsService {
  private readonly logger = new Logger(HostedModelsService.name);
  private readonly includedPool: HostedModelPool;
  private readonly guestPool: HostedModelPool;

  constructor(
    private readonly config: HostedModelsConfigService,
    private readonly usage: AiUsageRepository,
  ) {
    this.includedPool = new HostedModelPool('included', config.includedModels, usage);
    this.guestPool = new HostedModelPool('guest', config.guestModels, usage);
  }

  get includedEnabled(): boolean {
    return this.config.includedEnabled;
  }

  async getIncludedUsage(userId: string, now = new Date()): Promise<IncludedUsage> {
    const limit = this.config.includedUserMonthlyTokenLimit;
    const used = await this.usage.userTotal(userId, usagePeriod(now));
    return {
      used,
      limit,
      remaining: Math.max(0, limit - used),
      resetsAt: usagePeriodResetsAt(now),
    };
  }

  async getIncludedStatus(userId: string): Promise<IncludedStatus> {
    if (!this.includedEnabled) {
      return { enabled: false, available: false };
    }
    const [usage, withBudget] = await Promise.all([
      this.getIncludedUsage(userId),
      this.includedPool.entriesWithBudget(),
    ]);
    return {
      enabled: true,
      available: withBudget.length > 0,
      usage,
    };
  }

  /**
   * Credentials for one run on the included models: checks the user's monthly
   * limit, then picks the next pool entry with budget.
   */
  async acquireIncluded(userId: string): Promise<HostedCredentials> {
    if (!this.includedEnabled) {
      throw new ServiceUnavailableException('Included AI is not available on this server');
    }
    const usage = await this.getIncludedUsage(userId);
    if (usage.remaining <= 0) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          code: INCLUDED_QUOTA_EXCEEDED,
          resetsAt: usage.resetsAt,
          message: `You have used this month's included AI (resets ${usage.resetsAt.slice(0, 10)}). Add your own API key in AI settings to continue.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return this.acquire(this.includedPool, userId);
  }

  /** Whether guest models are configured and at least one has budget left this month. */
  async guestHasCapacity(): Promise<boolean> {
    return this.guestPool.configured && (await this.guestPool.hasCapacity());
  }

  /** Credentials for one anonymous wizard import on the guest models (pool budget only). */
  acquireGuest(): Promise<HostedCredentials> {
    if (!this.guestPool.configured) {
      return Promise.reject(new ServiceUnavailableException('Free AI import is not available'));
    }
    return this.acquire(this.guestPool);
  }

  private async acquire(pool: HostedModelPool, userId?: string): Promise<HostedCredentials> {
    let entry: HostedModelEntry;
    try {
      entry = await pool.acquire();
    } catch (error) {
      if (error instanceof HostedPoolExhaustedError) {
        throw new ServiceUnavailableException(
          pool.name === 'included'
            ? "Included AI has reached this month's budget. Add your own API key in AI settings to continue."
            : 'Free AI import is not available right now',
        );
      }
      throw error;
    }

    const period = usagePeriod();
    return {
      pool: pool.name,
      entryId: entry.id,
      modelId: entry.modelId,
      apiKey: entry.apiKey,
      providerOptions: toProviderOptions(entry.providerId, entry.options),
      usageMeter: {
        record: async (tokens: ModelTokenUsage) => {
          pool.noteUsage(entry.id, tokens.totalTokens);
          try {
            await this.usage.record(tokens, { pool: pool.name, entryId: entry.id, period, userId });
          } catch (error) {
            // Never fail the user's job over accounting; the counter only under-reports.
            this.logger.error(
              `Could not record ${tokens.totalTokens} ${pool.name} AI tokens for ${entry.id}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          }
        },
      },
      onRunError: (error: unknown) => pool.reportFailure(entry.id, error),
    };
  }
}
