/**
 * Mirrors import LLM config endpoints.
 */

import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import { ImportLlmConfigService } from './import-llm-config.service';

describe('ImportLlmConfigService', () => {
  const user = {
    id: 'u1',
    email: 'u@test.dev',
    accessToken: 'tok',
  } as AuthenticatedRequest['user'];

  let service: ImportLlmConfigService;
  let repository: {
    getStatus: jest.Mock;
    getDecryptedConfig: jest.Mock;
    saveConfig: jest.Mock;
  };

  beforeEach(() => {
    repository = {
      getStatus: jest.fn(),
      getDecryptedConfig: jest.fn(),
      saveConfig: jest.fn(),
    };

    service = new ImportLlmConfigService(
      repository as never,
      {
        get: jest.fn((key: string) => (key === 'NODE_ENV' ? 'test' : undefined)),
      } as never,
    );
  });

  it('rejects malformed model ids', async () => {
    await expect(
      service.saveConfig(user, { modelId: 'gpt-4o-mini', apiKey: 'sk-test' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects out-of-catalog models', async () => {
    await expect(
      service.saveConfig(user, { modelId: 'openai/nonexistent-model-xyz', apiKey: 'sk-test' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('saves valid configuration', async () => {
    repository.saveConfig.mockResolvedValue({
      configured: true,
      modelId: 'openai/gpt-4o-mini',
      configuredAt: '2026-01-01T00:00:00.000Z',
    });

    await expect(
      service.saveConfig(user, { modelId: 'openai/gpt-4o-mini', apiKey: 'sk-test' }),
    ).resolves.toMatchObject({ configured: true, modelId: 'openai/gpt-4o-mini' });
  });

  it('returns 422 when key probe fails', async () => {
    await expect(
      service.saveConfig(user, { modelId: 'openai/gpt-4o-mini', apiKey: 'invalid-key' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('throws when provider is unknown', () => {
    expect(() => service.listModels('unknown-provider')).toThrow(NotFoundException);
  });

  it('lists providers from catalog', () => {
    expect(service.listProviders().map((entry) => entry.id)).toEqual([
      'openai',
      'anthropic',
      'google',
    ]);
  });

  it('returns config status from repository', async () => {
    repository.getStatus.mockResolvedValue({ configured: false });
    await expect(service.getConfig(user)).resolves.toEqual({ configured: false });
  });

  it('requires api key on first save', async () => {
    await expect(
      service.saveConfig(user, { modelId: 'openai/gpt-4o-mini' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.saveConfig(user, { modelId: 'openai/gpt-4o-mini', apiKey: '   ' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reuses existing api key when keepExistingApiKey is set', async () => {
    repository.getDecryptedConfig.mockResolvedValue({
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'sk-existing',
      configuredAt: 'now',
    });
    repository.saveConfig.mockResolvedValue({
      configured: true,
      modelId: 'openai/gpt-4o-mini',
      configuredAt: 'now',
    });

    await service.saveConfig(user, {
      modelId: 'openai/gpt-4o-mini',
      keepExistingApiKey: true,
    });

    expect(repository.saveConfig).toHaveBeenCalledWith(user, 'openai/gpt-4o-mini', 'sk-existing');
  });

  it('requires api key when keepExistingApiKey cannot decrypt stored config', async () => {
    repository.getDecryptedConfig.mockRejectedValue(
      new UnprocessableEntityException('Unable to decrypt import LLM configuration'),
    );

    await expect(
      service.saveConfig(user, {
        modelId: 'openai/gpt-4o-mini',
        keepExistingApiKey: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires api key when keepExistingApiKey is set without prior config', async () => {
    repository.getDecryptedConfig.mockResolvedValue(null);

    await expect(
      service.saveConfig(user, {
        modelId: 'openai/gpt-4o-mini',
        keepExistingApiKey: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists models for a known provider', () => {
    expect(service.listModels('openai').some((model) => model.id === 'openai/gpt-4o-mini')).toBe(
      true,
    );
  });
});
