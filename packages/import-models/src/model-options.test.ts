import { describe, expect, it } from 'vitest';
import {
  describeModelOptions,
  getModelOptionFields,
  InvalidModelOptionsError,
  toProviderOptions,
  validateModelOptions,
} from './model-options';

describe('validateModelOptions', () => {
  it('returns an empty object for missing options', () => {
    expect(validateModelOptions('openai', undefined)).toEqual({});
    expect(validateModelOptions('openai', null)).toEqual({});
  });

  it('keeps valid values and drops empty ones (provider default)', () => {
    expect(
      validateModelOptions('openai', {
        reasoningEffort: 'high',
        textVerbosity: '',
        serviceTier: null,
      }),
    ).toEqual({ reasoningEffort: 'high' });
  });

  it('rejects unknown keys and values', () => {
    expect(() => validateModelOptions('openai', { thinking: 'enabled' })).toThrow(
      InvalidModelOptionsError,
    );
    expect(() => validateModelOptions('openai', { reasoningEffort: 'ultra' })).toThrow(
      /Reasoning effort must be one of/,
    );
    expect(() => validateModelOptions('mistral', { reasoningEffort: 'low' })).toThrow(
      InvalidModelOptionsError,
    );
    expect(() => validateModelOptions('openai', ['high'])).toThrow(InvalidModelOptionsError);
  });

  it('parses and bounds integer options', () => {
    expect(
      validateModelOptions('anthropic', { thinking: 'enabled', budgetTokens: '4096' }),
    ).toEqual({ thinking: 'enabled', budgetTokens: 4096 });
    expect(() =>
      validateModelOptions('anthropic', { thinking: 'enabled', budgetTokens: 10 }),
    ).toThrow(/between 1024 and 128000/);
    expect(() =>
      validateModelOptions('anthropic', { thinking: 'enabled', budgetTokens: 2048.5 }),
    ).toThrow(InvalidModelOptionsError);
  });

  it('drops dependent options whose condition does not hold', () => {
    expect(validateModelOptions('anthropic', { thinking: 'adaptive', budgetTokens: 4096 })).toEqual(
      { thinking: 'adaptive' },
    );
    expect(validateModelOptions('anthropic', { budgetTokens: 4096 })).toEqual({});
  });
});

describe('toProviderOptions', () => {
  it('returns undefined when nothing is set', () => {
    expect(toProviderOptions('openai', {})).toBeUndefined();
    expect(toProviderOptions('openai', undefined)).toBeUndefined();
    expect(toProviderOptions('mistral', { anything: 'x' })).toBeUndefined();
  });

  it('passes flat OpenAI, xAI and Groq options through', () => {
    expect(toProviderOptions('openai', { reasoningEffort: 'high', serviceTier: 'flex' })).toEqual({
      openai: { reasoningEffort: 'high', serviceTier: 'flex' },
    });
    expect(toProviderOptions('xai', { reasoningSummary: 'concise' })).toEqual({
      xai: { reasoningSummary: 'concise' },
    });
    expect(toProviderOptions('groq', { reasoningEffort: 'low' })).toEqual({
      groq: { reasoningEffort: 'low' },
    });
  });

  it('nests Anthropic thinking', () => {
    expect(
      toProviderOptions('anthropic', { thinking: 'enabled', budgetTokens: 8000, effort: 'high' }),
    ).toEqual({ anthropic: { effort: 'high', thinking: { type: 'enabled', budgetTokens: 8000 } } });
    expect(toProviderOptions('anthropic', { thinking: 'adaptive' })).toEqual({
      anthropic: { thinking: { type: 'adaptive' } },
    });
  });

  it('nests Google thinkingConfig', () => {
    expect(toProviderOptions('google', { thinkingLevel: 'low', serviceTier: 'flex' })).toEqual({
      google: { serviceTier: 'flex', thinkingConfig: { thinkingLevel: 'low' } },
    });
    expect(toProviderOptions('google', { thinkingBudget: 0 })).toEqual({
      google: { thinkingConfig: { thinkingBudget: 0 } },
    });
  });

  it('maps DeepSeek thinking and OpenRouter reasoning', () => {
    expect(toProviderOptions('deepseek', { thinking: 'disabled' })).toEqual({
      deepseek: { thinking: { type: 'disabled' } },
    });
    expect(toProviderOptions('openrouter', { reasoningEffort: 'medium' })).toEqual({
      openrouter: { reasoning: { effort: 'medium' } },
    });
  });
});

describe('getModelOptionFields / describeModelOptions', () => {
  it('lists fields per provider', () => {
    expect(getModelOptionFields('openai').map((field) => field.key)).toContain('reasoningEffort');
    expect(getModelOptionFields('unknown-provider')).toEqual([]);
  });

  it('describes set options in field order', () => {
    expect(
      describeModelOptions('anthropic', {
        effort: 'high',
        thinking: 'enabled',
        budgetTokens: 2048,
      }),
    ).toEqual(['Extended thinking: enabled', 'Thinking budget (tokens): 2048', 'Effort: high']);
  });
});
