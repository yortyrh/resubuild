import { describe, expect, it } from 'vitest';
import type { AiModelOptionField } from '@/lib/api';
import {
  defaultAccountName,
  describeModelOptions,
  formatTokens,
  pruneModelOptions,
  shortProviderName,
  visibleOptionFields,
} from './ai-model-display';

const fields: AiModelOptionField[] = [
  {
    key: 'thinking',
    label: 'Extended thinking',
    description: '',
    kind: 'enum',
    values: ['adaptive', 'enabled', 'disabled'],
    reasoningOnly: true,
  },
  {
    key: 'budgetTokens',
    label: 'Thinking budget (tokens)',
    description: '',
    kind: 'integer',
    min: 1024,
    max: 128000,
    reasoningOnly: true,
    dependsOn: { key: 'thinking', values: ['enabled'] },
  },
  {
    key: 'speed',
    label: 'Speed',
    description: '',
    kind: 'enum',
    values: ['standard', 'fast'],
    reasoningOnly: false,
  },
];

describe('ai-model-display', () => {
  it('shortens provider names and builds the default account name', () => {
    expect(shortProviderName('OpenAI (BYOK — API key from platform.openai.com)')).toBe('OpenAI');
    expect(defaultAccountName('Anthropic (BYOK — bring your own API key)', 'Claude Opus 4.5')).toBe(
      'Anthropic · Claude Opus 4.5',
    );
  });

  it('shows reasoning fields only for reasoning models and respects dependsOn', () => {
    expect(visibleOptionFields(fields, false, {}).map((f) => f.key)).toEqual(['speed']);
    expect(visibleOptionFields(fields, true, {}).map((f) => f.key)).toEqual(['thinking', 'speed']);
    expect(visibleOptionFields(fields, true, { thinking: 'enabled' }).map((f) => f.key)).toEqual([
      'thinking',
      'budgetTokens',
      'speed',
    ]);
  });

  it('prunes options that no longer apply', () => {
    expect(
      pruneModelOptions(fields, false, { thinking: 'enabled', budgetTokens: 2048, speed: 'fast' }),
    ).toEqual({ speed: 'fast' });
    expect(pruneModelOptions(fields, true, { budgetTokens: 2048 })).toEqual({});
  });

  it('describes set options', () => {
    expect(describeModelOptions(fields, { speed: 'fast', thinking: 'adaptive' })).toEqual([
      'Extended thinking: adaptive',
      'Speed: fast',
    ]);
    expect(describeModelOptions(fields, undefined)).toEqual([]);
  });

  it('formats token counts compactly', () => {
    expect(formatTokens(950)).toBe('950');
    expect(formatTokens(12_300)).toBe('12.3k');
    expect(formatTokens(200_000)).toBe('200k');
    expect(formatTokens(2_000_000)).toBe('2M');
    expect(formatTokens(-5)).toBe('0');
  });
});
