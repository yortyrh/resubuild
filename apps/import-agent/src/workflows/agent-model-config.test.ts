import { describe, expect, it, vi } from 'vitest';

const generateMock = vi.fn().mockResolvedValue({ text: 'ok' });

vi.mock('@mastra/core/agent', () => ({
  Agent: vi.fn().mockImplementation(function (this: Record<string, unknown>, config: unknown) {
    this.config = config;
    this.generate = generateMock;
  }),
}));

import {
  createModelAgent,
  currentModelRunContext,
  withModelRunContext,
  withRunProviderOptions,
} from './agent-model-config';

describe('withRunProviderOptions', () => {
  it('returns options unchanged without run provider options', () => {
    const options = { maxSteps: 2 };
    expect(withRunProviderOptions(options, undefined)).toBe(options);
  });

  it('adds provider options and lets call-site values win', () => {
    expect(
      withRunProviderOptions(
        { providerOptions: { openai: { textVerbosity: 'low' } } },
        { openai: { reasoningEffort: 'high', textVerbosity: 'high' } },
      ),
    ).toEqual({
      providerOptions: { openai: { reasoningEffort: 'high', textVerbosity: 'low' } },
    });
  });

  it('applies them to a separate structuring model too', () => {
    const merged = withRunProviderOptions(
      { structuredOutput: { schema: {}, model: { id: 'openai/gpt-5' } } },
      { openai: { reasoningEffort: 'low' } },
    );
    expect(merged?.structuredOutput).toMatchObject({
      providerOptions: { openai: { reasoningEffort: 'low' } },
    });
  });

  it('leaves structured output without its own model alone', () => {
    const merged = withRunProviderOptions(
      { structuredOutput: { schema: {} } },
      { openai: { reasoningEffort: 'low' } },
    );
    expect(merged?.structuredOutput).toEqual({ schema: {} });
  });
});

describe('createModelAgent', () => {
  it('passes the model and key explicitly', () => {
    const agent = createModelAgent('openai/gpt-5', 'sk-test', {
      id: 'a',
      name: 'a',
      instructions: 'x',
    });
    expect((agent as unknown as { config: { model: unknown } }).config.model).toEqual({
      id: 'openai/gpt-5',
      apiKey: 'sk-test',
    });
  });

  it('adds the run provider options to generate calls', async () => {
    generateMock.mockClear();
    await withModelRunContext({ providerOptions: { anthropic: { effort: 'low' } } }, async () => {
      expect(currentModelRunContext().providerOptions).toEqual({ anthropic: { effort: 'low' } });
      const agent = createModelAgent('anthropic/claude', 'k', {
        id: 'a',
        name: 'a',
        instructions: 'x',
      });
      await agent.generate('hi', { maxSteps: 1 } as never);
    });
    expect(generateMock).toHaveBeenCalledWith('hi', {
      maxSteps: 1,
      providerOptions: { anthropic: { effort: 'low' } },
    });
  });

  it('does not touch generate outside a run context', async () => {
    generateMock.mockClear();
    const agent = createModelAgent('openai/gpt-5', 'k', { id: 'a', name: 'a', instructions: 'x' });
    await agent.generate('hi');
    expect(generateMock).toHaveBeenCalledWith('hi');
    expect(currentModelRunContext()).toEqual({});
  });
});
