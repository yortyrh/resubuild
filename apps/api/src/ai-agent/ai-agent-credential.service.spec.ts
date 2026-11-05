import { UnprocessableEntityException } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/session-auth.guard';
import {
  AiAgentCredentialService,
  HOSTED_AI_ERROR_MESSAGE,
  isModelProviderError,
  runWithAiCredentials,
} from './ai-agent-credential.service';

jest.mock('@resubuild/import-agent', () => ({
  withModelRunContext: jest.fn((_context: unknown, action: () => Promise<unknown>) => action()),
}));

describe('AiAgentCredentialService', () => {
  const user = {
    id: 'u1',
    email: 'u@test.dev',
  } as AuthenticatedRequest['user'];

  let service: AiAgentCredentialService;
  let repository: { getPreference: jest.Mock; getDecryptedAccount: jest.Mock };
  let hosted: { includedEnabled: boolean; acquireIncluded: jest.Mock };

  beforeEach(() => {
    repository = {
      getPreference: jest.fn().mockResolvedValue({ activeAccountId: 'acc-1', source: 'account' }),
      getDecryptedAccount: jest.fn(),
    };
    hosted = { includedEnabled: false, acquireIncluded: jest.fn() };
    service = new AiAgentCredentialService(repository as never, hosted as never);
  });

  it('returns active credentials when configured', async () => {
    repository.getDecryptedAccount.mockResolvedValue({
      id: 'acc-1',
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'sk-test',
      providerId: 'openai',
      modelOptions: {},
      label: 'Default',
      updatedAt: 'now',
    });

    await expect(service.getActiveCredentials(user)).resolves.toEqual({
      source: 'account',
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'sk-test',
      accountId: 'acc-1',
      providerOptions: undefined,
    });
    expect(repository.getDecryptedAccount).toHaveBeenCalledWith(user, 'acc-1');
  });

  it('maps the account model options to provider options', async () => {
    repository.getDecryptedAccount.mockResolvedValue({
      id: 'acc-1',
      modelId: 'anthropic/claude-sonnet-4-5-20250929',
      apiKey: 'sk-test',
      providerId: 'anthropic',
      modelOptions: { thinking: 'enabled', budgetTokens: 4096 },
      label: null,
      updatedAt: 'now',
    });

    await expect(service.getActiveCredentials(user)).resolves.toMatchObject({
      providerOptions: { anthropic: { thinking: { type: 'enabled', budgetTokens: 4096 } } },
    });
  });

  it('throws when no active account and no included models', async () => {
    repository.getPreference.mockResolvedValue({ activeAccountId: null, source: 'account' });

    await expect(service.getActiveCredentials(user)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('throws when the active key cannot be read', async () => {
    repository.getDecryptedAccount.mockResolvedValue(null);

    await expect(service.getActiveCredentials(user)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  describe('resolveSelection', () => {
    it('uses included models when selected and offered', async () => {
      hosted.includedEnabled = true;
      repository.getPreference.mockResolvedValue({ activeAccountId: 'acc-1', source: 'included' });
      await expect(service.resolveSelection(user)).resolves.toEqual({ kind: 'included' });
    });

    it('falls back to the account when included models are switched off', async () => {
      repository.getPreference.mockResolvedValue({ activeAccountId: 'acc-1', source: 'included' });
      await expect(service.resolveSelection(user)).resolves.toEqual({
        kind: 'account',
        accountId: 'acc-1',
      });
    });

    it('defaults users without an account to included models', async () => {
      hosted.includedEnabled = true;
      repository.getPreference.mockResolvedValue({ activeAccountId: null, source: 'account' });
      await expect(service.resolveSelection(user)).resolves.toEqual({ kind: 'included' });
    });

    it('reports none without account or included models', async () => {
      repository.getPreference.mockResolvedValue({ activeAccountId: null, source: 'account' });
      await expect(service.resolveSelection(user)).resolves.toEqual({ kind: 'none' });
    });
  });

  it('returns metered included credentials', async () => {
    hosted.includedEnabled = true;
    repository.getPreference.mockResolvedValue({ activeAccountId: null, source: 'included' });
    const usageMeter = { record: jest.fn() };
    const onRunError = jest.fn();
    hosted.acquireIncluded.mockResolvedValue({
      pool: 'included',
      entryId: 'oa-1',
      modelId: 'openai/gpt-5-mini',
      apiKey: 'sk-app',
      providerOptions: { openai: { reasoningEffort: 'low' } },
      usageMeter,
      onRunError,
    });

    await expect(service.getActiveCredentials(user)).resolves.toEqual({
      source: 'included',
      modelId: 'openai/gpt-5-mini',
      apiKey: 'sk-app',
      providerOptions: { openai: { reasoningEffort: 'low' } },
      usageMeter,
      onRunError,
    });
    expect(hosted.acquireIncluded).toHaveBeenCalledWith('u1');
  });
});

describe('runWithAiCredentials', () => {
  it('reports run failures to the credentials and rethrows', async () => {
    const onRunError = jest.fn();
    const failure = new Error('rate limited');
    await expect(
      runWithAiCredentials(
        { source: 'included', modelId: 'm/x', apiKey: 'k', onRunError },
        async () => {
          throw failure;
        },
      ),
    ).rejects.toBe(failure);
    expect(onRunError).toHaveBeenCalledWith(failure);
  });

  it('returns the action result', async () => {
    await expect(
      runWithAiCredentials({ source: 'account', modelId: 'm/x', apiKey: 'k' }, async () => 42),
    ).resolves.toBe(42);
  });

  it('hides provider errors of app-funded runs behind a generic message', async () => {
    const providerError = Object.assign(new Error('claude-haiku-5-5: overloaded'), {
      name: 'AI_APICallError',
      statusCode: 529,
    });
    await expect(
      runWithAiCredentials({ source: 'included', modelId: 'm/x', apiKey: 'k' }, async () => {
        throw providerError;
      }),
    ).rejects.toThrow(HOSTED_AI_ERROR_MESSAGE);
  });

  it('keeps provider errors of the user own key as they are', async () => {
    const providerError = Object.assign(new Error('invalid x-api-key'), { statusCode: 401 });
    await expect(
      runWithAiCredentials({ source: 'account', modelId: 'm/x', apiKey: 'k' }, async () => {
        throw providerError;
      }),
    ).rejects.toBe(providerError);
  });
});

describe('isModelProviderError', () => {
  it('recognises AI SDK and HTTP errors only', () => {
    expect(isModelProviderError({ statusCode: 429 })).toBe(true);
    expect(isModelProviderError(Object.assign(new Error('x'), { name: 'AI_RetryError' }))).toBe(
      true,
    );
    expect(isModelProviderError(new Error('Could not extract text from PDF'))).toBe(false);
  });
});
