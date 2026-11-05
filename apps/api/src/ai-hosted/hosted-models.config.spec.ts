import {
  HostedModelsConfigError,
  HostedModelsConfigService,
  parseHostedModelPool,
  parseTokenLimit,
} from './hosted-models.config';

const entry = (overrides: Record<string, unknown> = {}) => ({
  id: 'oa-1',
  model: 'openai/gpt-5-mini',
  apiKey: 'sk-app',
  monthlyTokenLimit: 1_000_000,
  ...overrides,
});

describe('parseHostedModelPool', () => {
  it('is empty when unset or blank', () => {
    expect(parseHostedModelPool(undefined, 'X')).toEqual([]);
    expect(parseHostedModelPool('  ', 'X')).toEqual([]);
  });

  it('parses entries with provider and validated options', () => {
    const raw = JSON.stringify([
      entry({ options: { reasoningEffort: 'low', textVerbosity: '' } }),
      entry({ id: 'an-1', model: 'anthropic/claude-haiku-4-5', apiKey: ' sk-ant ' }),
    ]);
    expect(parseHostedModelPool(raw, 'AI_INCLUDED_MODELS')).toEqual([
      {
        id: 'oa-1',
        modelId: 'openai/gpt-5-mini',
        providerId: 'openai',
        apiKey: 'sk-app',
        monthlyTokenLimit: 1_000_000,
        options: { reasoningEffort: 'low' },
      },
      {
        id: 'an-1',
        modelId: 'anthropic/claude-haiku-4-5',
        providerId: 'anthropic',
        apiKey: 'sk-ant',
        monthlyTokenLimit: 1_000_000,
        options: {},
      },
    ]);
  });

  it.each([
    ['not json', /must be a JSON array/],
    ['{"id":"x"}', /must be a JSON array/],
    [JSON.stringify([entry({ monthlyTokenLimit: 0 })]), /\[0\]\.monthlyTokenLimit/],
    [JSON.stringify([entry({ apiKey: '' })]), /\[0\]\.apiKey/],
    [JSON.stringify([entry({ id: 'bad id' })]), /\[0\]\.id/],
    [JSON.stringify([entry(), entry()]), /duplicate id "oa-1"/],
    [JSON.stringify([entry({ model: 'no-slash' })]), /oa-1/],
    [JSON.stringify([entry({ options: { thinking: 'enabled' } })]), /not supported for openai/],
  ])('rejects invalid config %s', (raw, message) => {
    expect(() => parseHostedModelPool(raw, 'AI_INCLUDED_MODELS')).toThrow(HostedModelsConfigError);
    expect(() => parseHostedModelPool(raw, 'AI_INCLUDED_MODELS')).toThrow(message);
  });
});

describe('parseTokenLimit', () => {
  it('parses whole numbers and defaults when blank', () => {
    expect(parseTokenLimit('250000', 'X')).toBe(250000);
    expect(parseTokenLimit('', 'X', 7)).toBe(7);
    expect(parseTokenLimit(undefined, 'X')).toBe(0);
    expect(() => parseTokenLimit('-1', 'X')).toThrow(HostedModelsConfigError);
    expect(() => parseTokenLimit('1.5', 'X')).toThrow(HostedModelsConfigError);
  });
});

describe('HostedModelsConfigService', () => {
  const service = (env: Record<string, string>) =>
    new HostedModelsConfigService({ get: (key: string) => env[key] } as never);

  it('enables the included tier only with models and a per-user limit', () => {
    const models = JSON.stringify([entry()]);
    expect(service({}).includedEnabled).toBe(false);
    expect(service({ AI_INCLUDED_MODELS: models }).includedEnabled).toBe(false);
    const enabled = service({
      AI_INCLUDED_MODELS: models,
      AI_INCLUDED_USER_MONTHLY_TOKEN_LIMIT: '200000',
    });
    expect(enabled.includedEnabled).toBe(true);
    expect(enabled.includedUserMonthlyTokenLimit).toBe(200000);
    expect(enabled.pool('included')).toHaveLength(1);
  });
});
