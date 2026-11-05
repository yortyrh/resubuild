import { Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import { type UsageMeter, withModelRunContext } from '@resubuild/import-agent';
import { toProviderOptions } from '@resubuild/import-models';
import { providerErrorStatus } from '../ai-hosted/hosted-model-pool';
import { HostedModelsService } from '../ai-hosted/hosted-models.service';
import type { AuthenticatedRequest } from '../auth/session-auth.guard';
import { AiAgentRepository, type AiAgentSource } from './ai-agent.repository';

export interface ActiveAiAgentCredentials {
  /** `account`: the user's own key; `included`: an app-funded model (metered). */
  source: AiAgentSource;
  modelId: string;
  apiKey: string;
  /** Set for `account` runs. */
  accountId?: string;
  /** Mastra `providerOptions` from the model options; undefined = provider defaults. */
  providerOptions?: Record<string, Record<string, unknown>>;
  /** Counts tokens for app-funded models. */
  usageMeter?: UsageMeter;
  /** Lets an app-funded key cool down after a provider error. */
  onRunError?: (error: unknown) => void;
}

/** Which AI the user's runs use right now. */
export type AiAgentSelection =
  | { kind: 'account'; accountId: string }
  | { kind: 'included' }
  | { kind: 'none' };

export const AI_NOT_CONFIGURED_MESSAGE =
  'Active AI agent configuration is required — add an account in AI agent settings';

const hostedRunLogger = new Logger('HostedAiRun');

/** Shown instead of provider errors on app-funded runs (which never reveal the model). */
export const HOSTED_AI_ERROR_MESSAGE =
  'The AI service could not finish this request. Please try again in a few minutes.';

/** An error raised by a model provider call (AI SDK errors carry `AI_*` names or an HTTP status). */
export function isModelProviderError(error: unknown): boolean {
  if (providerErrorStatus(error) !== undefined) return true;
  return error instanceof Error && error.name.startsWith('AI_');
}

/**
 * Run `action` (a workflow) with the credentials' model options and usage
 * meter applied to every model call, reporting provider failures to the pool.
 * Provider errors on app-funded runs are replaced by a generic message, since
 * they can name the provider or model.
 */
export async function runWithAiCredentials<T>(
  llm: ActiveAiAgentCredentials,
  action: () => Promise<T>,
): Promise<T> {
  try {
    return await withModelRunContext(
      { providerOptions: llm.providerOptions, usageMeter: llm.usageMeter },
      action,
    );
  } catch (error) {
    llm.onRunError?.(error);
    if (llm.source === 'included' && isModelProviderError(error)) {
      // Keep the real cause in the server log only.
      hostedRunLogger.warn(
        `App-funded model call failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new Error(HOSTED_AI_ERROR_MESSAGE);
    }
    throw error;
  }
}

@Injectable()
export class AiAgentCredentialService {
  constructor(
    private readonly repository: AiAgentRepository,
    private readonly hostedModels: HostedModelsService,
  ) {}

  /**
   * Included models when the user picked them (or has no account of their own)
   * and the server offers them; otherwise the user's active account.
   */
  async resolveSelection(user: AuthenticatedRequest['user']): Promise<AiAgentSelection> {
    const { activeAccountId, source } = await this.repository.getPreference(user);
    const includedEnabled = this.hostedModels.includedEnabled;
    if (source === 'included' && includedEnabled) return { kind: 'included' };
    if (activeAccountId) return { kind: 'account', accountId: activeAccountId };
    if (includedEnabled) return { kind: 'included' };
    return { kind: 'none' };
  }

  async getActiveCredentials(
    user: AuthenticatedRequest['user'],
  ): Promise<ActiveAiAgentCredentials> {
    const selection = await this.resolveSelection(user);

    if (selection.kind === 'included') {
      const hosted = await this.hostedModels.acquireIncluded(user.id);
      return {
        source: 'included',
        modelId: hosted.modelId,
        apiKey: hosted.apiKey,
        providerOptions: hosted.providerOptions,
        usageMeter: hosted.usageMeter,
        onRunError: hosted.onRunError,
      };
    }

    const account =
      selection.kind === 'account'
        ? await this.repository.getDecryptedAccount(user, selection.accountId)
        : null;
    if (!account) {
      throw new UnprocessableEntityException(AI_NOT_CONFIGURED_MESSAGE);
    }

    return {
      source: 'account',
      modelId: account.modelId,
      apiKey: account.apiKey,
      accountId: account.id,
      providerOptions: toProviderOptions(account.providerId, account.modelOptions),
    };
  }
}
