import { HttpException, ServiceUnavailableException } from '@nestjs/common';
import type { HostedModelEntry } from './hosted-models.config';
import { HostedModelsService, INCLUDED_QUOTA_EXCEEDED } from './hosted-models.service';

const entry = (id: string, modelId = 'openai/gpt-5-mini'): HostedModelEntry => ({
  id,
  modelId,
  providerId: modelId.split('/')[0],
  apiKey: `sk-${id}`,
  monthlyTokenLimit: 1000,
  options: { reasoningEffort: 'low' },
});

function setup(options: { userTotal?: number; poolTotals?: Record<string, number> } = {}) {
  const config = {
    includedModels: [entry('oa-1'), entry('oa-2')],
    guestModels: [entry('g-1', 'anthropic/claude-haiku-4-5')],
    includedUserMonthlyTokenLimit: 500,
    includedEnabled: true,
  };
  const usage = {
    record: jest.fn().mockResolvedValue(undefined),
    poolTotals: jest.fn(async () => new Map(Object.entries(options.poolTotals ?? {}))),
    userTotal: jest.fn(async () => options.userTotal ?? 0),
  };
  const service = new HostedModelsService(config as never, usage as never);
  return { service, usage, config };
}

describe('HostedModelsService', () => {
  it('reports included status with usage but never the models behind it', async () => {
    const { service } = setup({ userTotal: 120 });
    const status = await service.getIncludedStatus('u1');
    expect(status).toMatchObject({
      enabled: true,
      available: true,
      usage: { used: 120, limit: 500, remaining: 380 },
    });
    expect(JSON.stringify(status)).not.toMatch(/openai|gpt|sk-/i);
    expect(status.usage?.resetsAt).toMatch(/^\d{4}-\d{2}-01T00:00:00.000Z$/);
  });

  it('reports disabled when the server offers no included models', async () => {
    const { service, config } = setup();
    config.includedEnabled = false;
    await expect(service.getIncludedStatus('u1')).resolves.toEqual({
      enabled: false,
      available: false,
    });
  });

  it('hands out pool credentials with provider options and a metering hook', async () => {
    const { service, usage } = setup();
    const credentials = await service.acquireIncluded('u1');
    expect(credentials).toMatchObject({
      pool: 'included',
      entryId: 'oa-1',
      modelId: 'openai/gpt-5-mini',
      apiKey: 'sk-oa-1',
      providerOptions: { openai: { reasoningEffort: 'low' } },
    });

    await credentials.usageMeter.record({ inputTokens: 8, outputTokens: 2, totalTokens: 10 });
    expect(usage.record).toHaveBeenCalledWith(
      { inputTokens: 8, outputTokens: 2, totalTokens: 10 },
      expect.objectContaining({ pool: 'included', entryId: 'oa-1', userId: 'u1' }),
    );
  });

  it('never fails a run because usage could not be recorded', async () => {
    const { service, usage } = setup();
    usage.record.mockRejectedValue(new Error('db down'));
    const credentials = await service.acquireIncluded('u1');
    await expect(
      credentials.usageMeter.record({ inputTokens: 1, outputTokens: 1, totalTokens: 2 }),
    ).resolves.toBeUndefined();
  });

  it('rejects with 429 once the user used the monthly allowance', async () => {
    const { service } = setup({ userTotal: 500 });
    const error = await service.acquireIncluded('u1').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(429);
    expect((error as HttpException).getResponse()).toMatchObject({ code: INCLUDED_QUOTA_EXCEEDED });
  });

  it('rejects with 503 when every pool model used its budget', async () => {
    const { service } = setup({ poolTotals: { 'oa-1': 1000, 'oa-2': 1000 } });
    await expect(service.acquireIncluded('u1')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('moves to the next model after a rate-limited run', async () => {
    const { service } = setup();
    const first = await service.acquireIncluded('u1');
    first.onRunError({ statusCode: 429 });
    expect((await service.acquireIncluded('u1')).entryId).toBe('oa-2');
    expect((await service.acquireIncluded('u1')).entryId).toBe('oa-2');
  });

  it('is unavailable when included models are off', async () => {
    const { service, config } = setup();
    config.includedEnabled = false;
    await expect(service.acquireIncluded('u1')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  describe('guest pool', () => {
    it('reports capacity from the guest models budget', async () => {
      await expect(setup().service.guestHasCapacity()).resolves.toBe(true);
      await expect(setup({ poolTotals: { 'g-1': 1000 } }).service.guestHasCapacity()).resolves.toBe(
        false,
      );
    });

    it('meters guest runs on the pool only (no user)', async () => {
      const { service, usage } = setup();
      const credentials = await service.acquireGuest();
      expect(credentials).toMatchObject({ pool: 'guest', entryId: 'g-1' });
      await credentials.usageMeter.record({ inputTokens: 1, outputTokens: 1, totalTokens: 2 });
      expect(usage.record).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ pool: 'guest', entryId: 'g-1', userId: undefined }),
      );
    });

    it('is unavailable without guest models or budget', async () => {
      const { service, config } = setup();
      config.guestModels = [];
      const fresh = new HostedModelsService(
        config as never,
        { poolTotals: async () => new Map(), userTotal: async () => 0, record: jest.fn() } as never,
        { getCatalog: () => catalog as ImportModelCatalog } as never,
      );
      await expect(fresh.guestHasCapacity()).resolves.toBe(false);
      await expect(fresh.acquireGuest()).rejects.toBeInstanceOf(ServiceUnavailableException);
      await expect(
        setup({ poolTotals: { 'g-1': 5000 } }).service.acquireGuest(),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(service).toBeDefined();
    });
  });
});
