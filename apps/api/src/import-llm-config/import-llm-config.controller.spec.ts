/**
 * Mirrors import LLM config controller endpoints.
 */

import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import { ImportLlmConfigController } from './import-llm-config.controller';
import type { ImportLlmConfigService } from './import-llm-config.service';

describe('ImportLlmConfigController', () => {
  const user = {
    id: 'u1',
    email: 'u@test.dev',
    accessToken: 'tok',
  } as AuthenticatedRequest['user'];
  const req = { user } as AuthenticatedRequest;

  let controller: ImportLlmConfigController;
  let service: jest.Mocked<
    Pick<ImportLlmConfigService, 'listProviders' | 'listModels' | 'getConfig' | 'saveConfig'>
  >;

  beforeEach(() => {
    service = {
      listProviders: jest.fn(),
      listModels: jest.fn(),
      getConfig: jest.fn(),
      saveConfig: jest.fn(),
    };
    controller = new ImportLlmConfigController(service as never);
  });

  it('lists providers', () => {
    service.listProviders.mockReturnValue([{ id: 'openai', displayName: 'OpenAI' } as never]);
    expect(controller.listProviders()).toHaveLength(1);
  });

  it('lists models for provider', () => {
    service.listModels.mockReturnValue([
      { id: 'openai/gpt-4o-mini', displayName: 'GPT-4o Mini' } as never,
    ]);
    expect(controller.listModels('openai')).toHaveLength(1);
  });

  it('returns config for user', async () => {
    service.getConfig.mockResolvedValue({ configured: false });
    await expect(controller.getConfig(req)).resolves.toEqual({ configured: false });
  });

  it('saves config for user', async () => {
    service.saveConfig.mockResolvedValue({ configured: true, modelId: 'openai/gpt-4o-mini' });
    await expect(
      controller.saveConfig(req, { modelId: 'openai/gpt-4o-mini', apiKey: 'sk-test' }),
    ).resolves.toMatchObject({ configured: true });
  });
});
