import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  InvalidMastraModelIdError,
  InvalidModelOptionsError,
  type ModelOptions,
  parseMastraModelId,
  resolveProviderId,
  validateModelOptions,
} from '@resubuild/import-models';
import { z } from 'zod';

/** App-funded model pools: `guest` (sign-up import wizard) and `included` (signed-in users). */
export type HostedPoolName = 'guest' | 'included';

/** One app-funded model with its own key and monthly token budget. */
export interface HostedModelEntry {
  /** Stable id from the env config; keys the usage counters. */
  id: string;
  modelId: string;
  providerId: string;
  apiKey: string;
  monthlyTokenLimit: number;
  options: ModelOptions;
}

const entrySchema = z.object({
  id: z
    .string()
    .regex(/^[a-z0-9][a-z0-9_-]{0,63}$/i, 'id must be 1-64 letters, digits, "-" or "_"'),
  model: z.string().min(3),
  apiKey: z.string().trim().min(1),
  monthlyTokenLimit: z.number().int().positive(),
  options: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

export class HostedModelsConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HostedModelsConfigError';
  }
}

/**
 * Parse a pool from its env var: a JSON array of
 * `{ id, model, apiKey, monthlyTokenLimit, options? }`. Empty or unset means
 * no pool. Invalid config throws, so a bad deploy fails at startup.
 */
export function parseHostedModelPool(raw: string | undefined, envName: string): HostedModelEntry[] {
  const text = raw?.trim();
  if (!text) return [];

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new HostedModelsConfigError(`${envName} must be a JSON array`);
  }
  if (!Array.isArray(json)) {
    throw new HostedModelsConfigError(`${envName} must be a JSON array`);
  }

  const seen = new Set<string>();
  return json.map((item, index) => {
    const parsed = entrySchema.safeParse(item);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const path = issue?.path.join('.') || 'entry';
      throw new HostedModelsConfigError(`${envName}[${index}].${path}: ${issue?.message}`);
    }
    const entry = parsed.data;
    if (seen.has(entry.id)) {
      throw new HostedModelsConfigError(`${envName}: duplicate id "${entry.id}"`);
    }
    seen.add(entry.id);

    try {
      const providerId = resolveProviderId(parseMastraModelId(entry.model));
      return {
        id: entry.id,
        modelId: entry.model,
        providerId,
        apiKey: entry.apiKey,
        monthlyTokenLimit: entry.monthlyTokenLimit,
        options: validateModelOptions(providerId, entry.options),
      };
    } catch (error) {
      if (error instanceof InvalidMastraModelIdError || error instanceof InvalidModelOptionsError) {
        throw new HostedModelsConfigError(`${envName}[${index}] (${entry.id}): ${error.message}`);
      }
      throw error;
    }
  });
}

/** Non-negative integer from env; `fallback` when unset or blank. */
export function parseTokenLimit(raw: string | undefined, envName: string, fallback = 0): number {
  const text = raw?.trim();
  if (!text) return fallback;
  const value = Number(text);
  if (!Number.isInteger(value) || value < 0) {
    throw new HostedModelsConfigError(`${envName} must be a whole number of tokens (0 = off)`);
  }
  return value;
}

@Injectable()
export class HostedModelsConfigService {
  readonly includedModels: HostedModelEntry[];
  /** Models that run anonymous imports in the sign-up wizard. */
  readonly guestModels: HostedModelEntry[];
  /** Monthly tokens each user may spend on the included models (0 = included tier off). */
  readonly includedUserMonthlyTokenLimit: number;

  constructor(configService: ConfigService) {
    this.includedModels = parseHostedModelPool(
      configService.get<string>('AI_INCLUDED_MODELS'),
      'AI_INCLUDED_MODELS',
    );
    this.guestModels = parseHostedModelPool(
      configService.get<string>('AI_GUEST_MODELS'),
      'AI_GUEST_MODELS',
    );
    this.includedUserMonthlyTokenLimit = parseTokenLimit(
      configService.get<string>('AI_INCLUDED_USER_MONTHLY_TOKEN_LIMIT'),
      'AI_INCLUDED_USER_MONTHLY_TOKEN_LIMIT',
    );
  }

  get includedEnabled(): boolean {
    return this.includedModels.length > 0 && this.includedUserMonthlyTokenLimit > 0;
  }

  pool(name: HostedPoolName): HostedModelEntry[] {
    return name === 'included' ? this.includedModels : this.guestModels;
  }
}
