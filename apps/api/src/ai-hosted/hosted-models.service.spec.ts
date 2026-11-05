import { HttpException, ServiceUnavailableException } from '@nestjs/common';
import type { ImportModelCatalog } from '@resubuild/import-models';
import catalog from '@resubuild/import-models/catalog.json';
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
    includedUserMonthlyTokenLimit: 500,
    includedEnabled: true,
  };
  const usage = {
    record: jest.fn().mockResolvedValue(undefined),
    poolTotals: jest.fn(async () => new Map(Object.entries(options.poolTotals ?? {}))),
    userTotal: jest.fn(async () => options.userTotal ?? 0),
  };
  const catalogService = { getCatalog: () => catalog as ImportModelCatalog };
  const service = new HostedModelsService(config as never, usage as never, catalogService as never);
  return { service, usage, config };
}

describe('HostedModelsService', () => {
  it('reports included status with usage and distinct models', async () => {
    const { service } = setup({ userTotal: 120 });
    const status = await service.getIncludedStatus('u1');
    expect(status).toMatchObject({
      enabled: true,
      available: true,
      usage: { used: 120, limit: 500, remaining: 380 },
      models: [
        { providerId: 'openai', providerDisplayName: 'OpenAI', modelDisplayName: 'GPT-5 Mini' },
      ],
    });
    expect(status.usage?.resetsAt).toMatch(/^\d{4}-\d{2}-01T00:00:00.000Z$/);
  });

  it('reports disabled when the server offers no included models', async () => {
    const { service, config } = setup();
    config.includedEnabled = false;
    await expect(service.getIncludedStatus('u1')).resolves.toEqual({
      enabled: false,
      available: false,
      models: [],
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
});
