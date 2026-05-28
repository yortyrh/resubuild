import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import { AiAgentController } from './ai-agent.controller';
import type { AiAgentService } from './ai-agent.service';

describe('AiAgentController', () => {
  const user = {
    id: 'u1',
    email: 'u@test.dev',
    accessToken: 'tok',
  } as AuthenticatedRequest['user'];
  const req = { user } as AuthenticatedRequest;

  let controller: AiAgentController;
  let service: jest.Mocked<
    Pick<
      AiAgentService,
      | 'listProviders'
      | 'listModels'
      | 'listAccounts'
      | 'createAccount'
      | 'updateAccount'
      | 'deleteAccount'
      | 'getActiveStatus'
      | 'setActiveAccount'
    >
  >;

  beforeEach(() => {
    service = {
      listProviders: jest.fn(),
      listModels: jest.fn(),
      listAccounts: jest.fn(),
      createAccount: jest.fn(),
      updateAccount: jest.fn(),
      deleteAccount: jest.fn(),
      getActiveStatus: jest.fn(),
      setActiveAccount: jest.fn(),
    };
    controller = new AiAgentController(service as never);
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

  it('lists accounts', async () => {
    service.listAccounts.mockResolvedValue([]);
    await expect(controller.listAccounts(req)).resolves.toEqual([]);
  });

  it('creates account', async () => {
    service.createAccount.mockResolvedValue({ id: 'acc-1' } as never);
    await expect(
      controller.createAccount(req, {
        modelId: 'openai/gpt-4o-mini',
        apiKey: 'sk-test',
      }),
    ).resolves.toMatchObject({ id: 'acc-1' });
  });

  it('returns active status', async () => {
    service.getActiveStatus.mockResolvedValue({ configured: false });
    await expect(controller.getActive(req)).resolves.toEqual({ configured: false });
  });

  it('sets active account', async () => {
    service.setActiveAccount.mockResolvedValue({ configured: true, accountId: 'acc-1' });
    await expect(controller.setActive(req, { accountId: 'acc-1' })).resolves.toMatchObject({
      configured: true,
    });
  });
});
