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
  let aiAgentService: {
    listProviders: jest.Mock;
    listModels: jest.Mock;
    getActiveStatus: jest.Mock;
    saveLegacyConfig: jest.Mock;
  };

  beforeEach(() => {
    aiAgentService = {
      listProviders: jest.fn(),
      listModels: jest.fn(),
      getActiveStatus: jest.fn(),
      saveLegacyConfig: jest.fn(),
    };

    service = new ImportLlmConfigService(aiAgentService as never);
  });

  it('delegates listProviders', () => {
    aiAgentService.listProviders.mockReturnValue([
      { id: 'openai' },
      { id: 'anthropic' },
      { id: 'google' },
      { id: 'openrouter' },
    ]);
    expect(service.listProviders()).toHaveLength(4);
  });

  it('delegates saveLegacyConfig errors', async () => {
    aiAgentService.saveLegacyConfig.mockRejectedValue(new BadRequestException('bad model'));

    await expect(
      service.saveConfig(user, { modelId: 'gpt-4o-mini', apiKey: 'sk-test' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('saves valid configuration via legacy path', async () => {
    aiAgentService.saveLegacyConfig.mockResolvedValue({
      configured: true,
      modelId: 'openai/gpt-4o-mini',
      configuredAt: '2026-01-01T00:00:00.000Z',
    });

    await expect(
      service.saveConfig(user, { modelId: 'openai/gpt-4o-mini', apiKey: 'sk-test' }),
    ).resolves.toMatchObject({ configured: true, modelId: 'openai/gpt-4o-mini' });
  });

  it('returns 422 when key probe fails', async () => {
    aiAgentService.saveLegacyConfig.mockRejectedValue(
      new UnprocessableEntityException('API key probe failed'),
    );

    await expect(
      service.saveConfig(user, { modelId: 'openai/gpt-4o-mini', apiKey: 'invalid-key' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('throws when provider is unknown', () => {
    aiAgentService.listModels.mockImplementation(() => {
      throw new NotFoundException('Provider "unknown-provider" was not found');
    });
    expect(() => service.listModels('unknown-provider')).toThrow(NotFoundException);
  });

  it('returns config status from ai agent service', async () => {
    aiAgentService.getActiveStatus.mockResolvedValue({ configured: false });
    await expect(service.getConfig(user)).resolves.toEqual({ configured: false });
  });
});
