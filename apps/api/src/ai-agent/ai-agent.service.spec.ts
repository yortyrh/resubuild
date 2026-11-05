import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { ImportModelCatalog } from '@resubuild/import-models';
import catalog from '@resubuild/import-models/catalog.json';
import type { AuthenticatedRequest } from '../auth/session-auth.guard';
import type { ImportModelsCatalogService } from '../import-models-catalog/import-models-catalog.service';
import type { AiAgentRepository } from './ai-agent.repository';
import { AiAgentService } from './ai-agent.service';

jest.mock('@mastra/core/agent', () => ({
  Agent: jest.fn().mockImplementation(() => ({
    generate: jest.fn().mockResolvedValue(undefined),
  })),
}));

const testCatalog = catalog as ImportModelCatalog;

describe('AiAgentService', () => {
  const user = {
    id: 'u1',
    email: 'u@test.dev',
  } as AuthenticatedRequest['user'];

  let service: AiAgentService;
  let repository: jest.Mocked<
    Pick<
      AiAgentRepository,
      | 'listAccounts'
      | 'getActiveStatus'
      | 'setActiveAccount'
      | 'createAccount'
      | 'updateAccount'
      | 'deleteAccount'
      | 'getDecryptedAccount'
      | 'getAccountRow'
    >
  >;
  let configService: { get: jest.Mock };
  let catalogService: Pick<ImportModelsCatalogService, 'getCatalog'>;

  beforeEach(() => {
    catalogService = {
      getCatalog: () => testCatalog,
    };
    repository = {
      listAccounts: jest.fn().mockResolvedValue([]),
      getActiveStatus: jest.fn(),
      setActiveAccount: jest.fn(),
      createAccount: jest.fn(),
      updateAccount: jest.fn(),
      deleteAccount: jest.fn(),
      getDecryptedAccount: jest.fn(),
      getAccountRow: jest.fn(),
    };
    configService = {
      get: jest.fn().mockReturnValue('test'),
    };
    service = new AiAgentService(
      repository as never,
      configService as never,
      catalogService as never,
    );
  });

  it('lists catalog providers', () => {
    expect(service.listProviders().length).toBeGreaterThan(0);
  });

  it('lists models for a known provider', () => {
    expect(service.listModels('openai').length).toBeGreaterThan(0);
  });

  it('throws when provider is unknown', () => {
    expect(() => service.listModels('unknown-provider')).toThrow(NotFoundException);
  });

  it('delegates listAccounts', async () => {
    repository.listAccounts.mockResolvedValue([]);
    await expect(service.listAccounts(user)).resolves.toEqual([]);
  });

  it('creates account after key probe succeeds', async () => {
    repository.createAccount.mockResolvedValue({
      id: 'acc-1',
      modelId: 'openai/gpt-4o-mini',
      label: null,
    } as never);

    await expect(
      service.createAccount(user, {
        modelId: 'openai/gpt-4o-mini',
        apiKey: 'sk-test',
        label: 'Work',
      }),
    ).resolves.toMatchObject({ id: 'acc-1' });

    expect(repository.createAccount).toHaveBeenCalledWith(user, {
      label: 'Work',
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'sk-test',
      modelOptions: {},
    });
  });

  it('rejects empty API key on create', async () => {
    await expect(
      service.createAccount(user, { modelId: 'openai/gpt-4o-mini', apiKey: '   ' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invalid model id on create', async () => {
    await expect(
      service.createAccount(user, { modelId: 'invalid/model', apiKey: 'sk-test' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns 422 when key probe fails on create', async () => {
    await expect(
      service.createAccount(user, { modelId: 'openai/gpt-4o-mini', apiKey: 'invalid-key' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('updates account using stored key when keepExistingApiKey is set', async () => {
    repository.getAccountRow.mockResolvedValue({
      model_id: 'openai/gpt-4o-mini',
      provider_id: 'openai',
      label: null,
      model_options: {},
    } as never);
    repository.getDecryptedAccount.mockResolvedValue({
      apiKey: 'sk-stored',
      modelId: 'openai/gpt-4o-mini',
    } as never);
    repository.updateAccount.mockResolvedValue({
      id: 'acc-1',
      modelId: 'openai/gpt-4o-mini',
      label: null,
    } as never);

    await expect(
      service.updateAccount(user, 'acc-1', {
        label: 'Updated',
        keepExistingApiKey: true,
      }),
    ).resolves.toMatchObject({ id: 'acc-1' });

    expect(repository.updateAccount).toHaveBeenCalledWith(user, 'acc-1', {
      label: 'Updated',
      modelId: undefined,
      apiKey: 'sk-stored',
      modelOptions: undefined,
    });
  });

  it('requires API key when stored key cannot be read on update', async () => {
    repository.getDecryptedAccount.mockResolvedValue(null);

    await expect(
      service.updateAccount(user, 'acc-1', { keepExistingApiKey: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('probes model change with stored key when api key omitted', async () => {
    repository.getAccountRow.mockResolvedValue({
      model_id: 'openai/gpt-4o-mini',
      provider_id: 'openai',
      label: null,
      model_options: {},
    } as never);
    repository.getDecryptedAccount.mockResolvedValue({
      apiKey: 'sk-stored',
      modelId: 'openai/gpt-4o-mini',
    } as never);
    repository.updateAccount.mockResolvedValue({
      id: 'acc-1',
      modelId: 'openai/gpt-4o-mini',
      label: null,
    } as never);

    await expect(
      service.updateAccount(user, 'acc-1', { modelId: 'openai/gpt-4o' }),
    ).resolves.toMatchObject({ id: 'acc-1' });
  });

  it('requires API key when changing model without stored key', async () => {
    repository.getAccountRow.mockResolvedValue({
      model_id: 'openai/gpt-4o-mini',
      provider_id: 'openai',
      label: null,
      model_options: {},
    } as never);
    repository.getDecryptedAccount.mockResolvedValue(null);

    await expect(
      service.updateAccount(user, 'acc-1', { modelId: 'openai/gpt-4o' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates first legacy config when no accounts exist', async () => {
    repository.listAccounts.mockResolvedValue([]);
    repository.getActiveStatus.mockResolvedValue({ configured: true, accountId: 'acc-1' });
    repository.createAccount.mockResolvedValue({
      id: 'acc-1',
      modelId: 'openai/gpt-4o-mini',
      label: null,
    } as never);

    await expect(
      service.saveLegacyConfig(user, {
        modelId: 'openai/gpt-4o-mini',
        apiKey: 'sk-test',
      }),
    ).resolves.toMatchObject({ configured: true });

    expect(repository.createAccount).toHaveBeenCalled();
  });

  it('updates existing account via legacy save', async () => {
    repository.listAccounts.mockResolvedValue([
      { id: 'acc-1', modelId: 'openai/gpt-4o-mini', label: null } as never,
    ]);
    repository.getActiveStatus.mockResolvedValue({ configured: true, accountId: 'acc-1' });
    repository.updateAccount.mockResolvedValue({
      id: 'acc-1',
      modelId: 'openai/gpt-4o-mini',
      label: null,
    } as never);

    await expect(
      service.saveLegacyConfig(user, {
        modelId: 'openai/gpt-4o-mini',
        apiKey: 'sk-test',
      }),
    ).resolves.toMatchObject({ configured: true });

    expect(repository.updateAccount).toHaveBeenCalledWith(user, 'acc-1', {
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'sk-test',
    });
  });

  it('activates first account when legacy save has no active account', async () => {
    repository.listAccounts.mockResolvedValue([
      { id: 'acc-1', modelId: 'openai/gpt-4o-mini', label: null } as never,
    ]);
    repository.getActiveStatus
      .mockResolvedValueOnce({ configured: false })
      .mockResolvedValueOnce({ configured: true, accountId: 'acc-1' });
    repository.updateAccount.mockResolvedValue({
      id: 'acc-1',
      modelId: 'openai/gpt-4o-mini',
      label: null,
    } as never);

    await service.saveLegacyConfig(user, {
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'sk-test',
    });

    expect(repository.setActiveAccount).toHaveBeenCalledWith(user, 'acc-1');
  });

  it('uses stored key for legacy save when keepExistingApiKey is set', async () => {
    repository.listAccounts.mockResolvedValue([
      { id: 'acc-1', modelId: 'openai/gpt-4o-mini', label: null } as never,
    ]);
    repository.getActiveStatus.mockResolvedValue({ configured: true, accountId: 'acc-1' });
    repository.getDecryptedAccount.mockResolvedValue({
      apiKey: 'sk-stored',
      modelId: 'openai/gpt-4o-mini',
    } as never);
    repository.updateAccount.mockResolvedValue({
      id: 'acc-1',
      modelId: 'openai/gpt-4o-mini',
      label: null,
    } as never);

    await service.saveLegacyConfig(user, {
      modelId: 'openai/gpt-4o-mini',
      keepExistingApiKey: true,
    });

    expect(repository.updateAccount).toHaveBeenCalledWith(user, 'acc-1', {
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'sk-stored',
    });
  });

  it('requires API key for first-time legacy save', async () => {
    repository.listAccounts.mockResolvedValue([]);
    repository.getActiveStatus.mockResolvedValue({ configured: false });

    await expect(
      service.saveLegacyConfig(user, {
        modelId: 'openai/gpt-4o-mini',
        keepExistingApiKey: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects legacy save when stored key cannot be read', async () => {
    repository.listAccounts.mockResolvedValue([
      { id: 'acc-1', modelId: 'openai/gpt-4o-mini', label: null } as never,
    ]);
    repository.getActiveStatus.mockResolvedValue({ configured: true, accountId: 'acc-1' });
    repository.getDecryptedAccount.mockResolvedValue(null);

    await expect(
      service.saveLegacyConfig(user, {
        modelId: 'openai/gpt-4o-mini',
        keepExistingApiKey: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rethrows unexpected model validation errors', async () => {
    catalogService = {
      getCatalog: () => {
        throw new Error('catalog unavailable');
      },
    };
    service = new AiAgentService(
      repository as never,
      configService as never,
      catalogService as never,
    );

    await expect(
      service.createAccount(user, { modelId: 'openai/gpt-4o-mini', apiKey: 'sk-test' }),
    ).rejects.toThrow('catalog unavailable');
  });

  it('probes API keys outside test environment', async () => {
    configService.get.mockImplementation((key: string) =>
      key === 'NODE_ENV' ? 'production' : undefined,
    );
    repository.createAccount.mockResolvedValue({
      id: 'acc-1',
      modelId: 'openai/gpt-4o-mini',
      label: null,
    } as never);

    await expect(
      service.createAccount(user, {
        modelId: 'openai/gpt-4o-mini',
        apiKey: 'sk-test',
      }),
    ).resolves.toMatchObject({ id: 'acc-1' });

    configService.get.mockReturnValue('test');
  });

  it('delegates getActiveStatus and setActiveAccount', async () => {
    repository.getActiveStatus.mockResolvedValue({ configured: true, accountId: 'acc-1' });
    repository.setActiveAccount.mockResolvedValue({ configured: true, accountId: 'acc-1' });

    await expect(service.getActiveStatus(user)).resolves.toMatchObject({ configured: true });
    await expect(service.setActiveAccount(user, 'acc-1')).resolves.toMatchObject({
      accountId: 'acc-1',
    });
  });

  it('rejects legacy save without API key', async () => {
    repository.listAccounts.mockResolvedValue([
      { id: 'acc-1', modelId: 'openai/gpt-4o-mini', label: null } as never,
    ]);
    repository.getActiveStatus.mockResolvedValue({ configured: true, accountId: 'acc-1' });

    await expect(
      service.saveLegacyConfig(user, { modelId: 'openai/gpt-4o-mini' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('delegates deleteAccount', async () => {
    repository.deleteAccount.mockResolvedValue(undefined);
    await service.deleteAccount(user, 'acc-1');
    expect(repository.deleteAccount).toHaveBeenCalledWith(user, 'acc-1');
  });

  describe('model options', () => {
    it('lists option fields per provider and the reasoning flag per model', () => {
      const openai = service.listProviders().find((provider) => provider.id === 'openai');
      expect(openai?.modelOptions.map((field) => field.key)).toContain('reasoningEffort');
      const gpt5 = service.listModels('openai').find((model) => model.id === 'openai/gpt-5');
      expect(gpt5?.reasoning).toBe(true);
    });

    it('stores validated options for a reasoning model', async () => {
      repository.createAccount.mockResolvedValue({ id: 'acc-1', modelId: 'openai/gpt-5' } as never);

      await service.createAccount(user, {
        modelId: 'openai/gpt-5',
        apiKey: 'sk-test',
        modelOptions: { reasoningEffort: 'high', textVerbosity: '' },
      });

      expect(repository.createAccount).toHaveBeenCalledWith(
        user,
        expect.objectContaining({ modelOptions: { reasoningEffort: 'high' } }),
      );
    });

    it('rejects options the provider does not accept', async () => {
      await expect(
        service.createAccount(user, {
          modelId: 'openai/gpt-5',
          apiKey: 'sk-test',
          modelOptions: { reasoningEffort: 'extreme' },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.createAccount(user, {
          modelId: 'openai/gpt-5',
          apiKey: 'sk-test',
          modelOptions: { thinking: 'enabled' },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('drops reasoning-only options for models that do not reason', async () => {
      repository.createAccount.mockResolvedValue({ id: 'acc-1', modelId: 'openai/gpt-4' } as never);

      await service.createAccount(user, {
        modelId: 'openai/gpt-4',
        apiKey: 'sk-test',
        modelOptions: { reasoningEffort: 'high', serviceTier: 'flex' },
      });

      expect(repository.createAccount).toHaveBeenCalledWith(
        user,
        expect.objectContaining({ modelOptions: { serviceTier: 'flex' } }),
      );
    });

    it('resets options when the provider changes', async () => {
      repository.getAccountRow.mockResolvedValue({
        model_id: 'openai/gpt-5',
        provider_id: 'openai',
        label: null,
        model_options: { reasoningEffort: 'high' },
      } as never);
      repository.getDecryptedAccount.mockResolvedValue({ apiKey: 'sk-stored' } as never);
      repository.updateAccount.mockResolvedValue({
        id: 'acc-1',
        modelId: 'google/gemini-2.5-flash',
      } as never);

      await service.updateAccount(user, 'acc-1', { modelId: 'google/gemini-2.5-flash' });

      expect(repository.updateAccount).toHaveBeenCalledWith(
        user,
        'acc-1',
        expect.objectContaining({ modelOptions: {} }),
      );
    });

    it('keeps stored options when only the label changes', async () => {
      repository.getAccountRow.mockResolvedValue({
        model_id: 'openai/gpt-5',
        provider_id: 'openai',
        label: 'Old',
        model_options: { reasoningEffort: 'high' },
      } as never);
      repository.updateAccount.mockResolvedValue({ id: 'acc-1', modelId: 'openai/gpt-5' } as never);

      await service.updateAccount(user, 'acc-1', { label: 'New' });

      expect(repository.updateAccount).toHaveBeenCalledWith(
        user,
        'acc-1',
        expect.objectContaining({ label: 'New', modelOptions: undefined }),
      );
      expect(repository.getDecryptedAccount).not.toHaveBeenCalled();
    });
  });

  describe('display names and labels', () => {
    it('adds provider and model names, defaulting the display name', async () => {
      repository.listAccounts.mockResolvedValue([
        { id: 'a', label: null, modelId: 'openai/gpt-5' },
        { id: 'b', label: 'Work', modelId: 'anthropic/claude-sonnet-4-5-20250929' },
        { id: 'c', label: null, modelId: 'unknown/some-model' },
      ] as never);

      const accounts = await service.listAccounts(user);

      expect(accounts[0]).toMatchObject({
        providerDisplayName: 'OpenAI',
        modelDisplayName: 'GPT-5',
        displayName: 'OpenAI · GPT-5',
      });
      expect(accounts[1]).toMatchObject({ providerDisplayName: 'Anthropic', displayName: 'Work' });
      expect(accounts[2]).toMatchObject({ displayName: 'unknown · some-model' });
    });

    it('adds display names to the active status', async () => {
      repository.getActiveStatus.mockResolvedValue({
        configured: true,
        accountId: 'a',
        label: null,
        modelId: 'openai/gpt-5',
      });
      await expect(service.getActiveStatus(user)).resolves.toMatchObject({
        displayName: 'OpenAI · GPT-5',
      });
      repository.getActiveStatus.mockResolvedValue({ configured: false });
      await expect(service.getActiveStatus(user)).resolves.toEqual({ configured: false });
    });

    it('requires a label for a second account with the same model', async () => {
      repository.listAccounts.mockResolvedValue([
        { id: 'a', label: null, modelId: 'openai/gpt-5' },
      ] as never);

      await expect(
        service.createAccount(user, { modelId: 'openai/gpt-5', apiKey: 'sk-test' }),
      ).rejects.toBeInstanceOf(ConflictException);

      repository.createAccount.mockResolvedValue({ id: 'b', modelId: 'openai/gpt-5' } as never);
      await expect(
        service.createAccount(user, { modelId: 'openai/gpt-5', apiKey: 'sk-test', label: 'Two' }),
      ).resolves.toMatchObject({ id: 'b' });
    });

    it('does not count the account being edited as a duplicate', async () => {
      repository.listAccounts.mockResolvedValue([
        { id: 'acc-1', label: 'Old', modelId: 'openai/gpt-4o-mini' },
      ] as never);
      repository.getAccountRow.mockResolvedValue({
        model_id: 'openai/gpt-4o-mini',
        provider_id: 'openai',
        label: 'Old',
        model_options: {},
      } as never);
      repository.updateAccount.mockResolvedValue({
        id: 'acc-1',
        modelId: 'openai/gpt-4o-mini',
      } as never);

      await expect(service.updateAccount(user, 'acc-1', { label: '' })).resolves.toMatchObject({
        id: 'acc-1',
      });
    });
  });
});
