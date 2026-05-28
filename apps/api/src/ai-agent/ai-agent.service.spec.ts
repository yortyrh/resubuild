import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import type { AiAgentRepository } from './ai-agent.repository';
import { AiAgentService } from './ai-agent.service';

describe('AiAgentService', () => {
  const user = {
    id: 'u1',
    email: 'u@test.dev',
    accessToken: 'tok',
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

  beforeEach(() => {
    repository = {
      listAccounts: jest.fn(),
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
    service = new AiAgentService(repository as never, configService as never);
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
    repository.createAccount.mockResolvedValue({ id: 'acc-1' } as never);

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
    } as never);
    repository.getDecryptedAccount.mockResolvedValue({
      apiKey: 'sk-stored',
      modelId: 'openai/gpt-4o-mini',
    } as never);
    repository.updateAccount.mockResolvedValue({ id: 'acc-1' } as never);

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
    } as never);
    repository.getDecryptedAccount.mockResolvedValue({
      apiKey: 'sk-stored',
      modelId: 'openai/gpt-4o-mini',
    } as never);
    repository.updateAccount.mockResolvedValue({ id: 'acc-1' } as never);

    await expect(
      service.updateAccount(user, 'acc-1', { modelId: 'openai/gpt-4o' }),
    ).resolves.toMatchObject({ id: 'acc-1' });
  });

  it('requires API key when changing model without stored key', async () => {
    repository.getAccountRow.mockResolvedValue({
      model_id: 'openai/gpt-4o-mini',
    } as never);
    repository.getDecryptedAccount.mockResolvedValue(null);

    await expect(
      service.updateAccount(user, 'acc-1', { modelId: 'openai/gpt-4o' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates first legacy config when no accounts exist', async () => {
    repository.listAccounts.mockResolvedValue([]);
    repository.getActiveStatus.mockResolvedValue({ configured: true, accountId: 'acc-1' });
    repository.createAccount.mockResolvedValue({ id: 'acc-1' } as never);

    await expect(
      service.saveLegacyConfig(user, {
        modelId: 'openai/gpt-4o-mini',
        apiKey: 'sk-test',
      }),
    ).resolves.toMatchObject({ configured: true });

    expect(repository.createAccount).toHaveBeenCalled();
  });

  it('updates existing account via legacy save', async () => {
    repository.listAccounts.mockResolvedValue([{ id: 'acc-1' } as never]);
    repository.getActiveStatus.mockResolvedValue({ configured: true, accountId: 'acc-1' });
    repository.updateAccount.mockResolvedValue({ id: 'acc-1' } as never);

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
    repository.listAccounts.mockResolvedValue([{ id: 'acc-1' } as never]);
    repository.getActiveStatus
      .mockResolvedValueOnce({ configured: false })
      .mockResolvedValueOnce({ configured: true, accountId: 'acc-1' });
    repository.updateAccount.mockResolvedValue({ id: 'acc-1' } as never);

    await service.saveLegacyConfig(user, {
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'sk-test',
    });

    expect(repository.setActiveAccount).toHaveBeenCalledWith(user, 'acc-1');
  });

  it('uses stored key for legacy save when keepExistingApiKey is set', async () => {
    repository.listAccounts.mockResolvedValue([{ id: 'acc-1' } as never]);
    repository.getActiveStatus.mockResolvedValue({ configured: true, accountId: 'acc-1' });
    repository.getDecryptedAccount.mockResolvedValue({
      apiKey: 'sk-stored',
      modelId: 'openai/gpt-4o-mini',
    } as never);
    repository.updateAccount.mockResolvedValue({ id: 'acc-1' } as never);

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

  it('delegates deleteAccount', async () => {
    repository.deleteAccount.mockResolvedValue(undefined);
    await service.deleteAccount(user, 'acc-1');
    expect(repository.deleteAccount).toHaveBeenCalledWith(user, 'acc-1');
  });
});
