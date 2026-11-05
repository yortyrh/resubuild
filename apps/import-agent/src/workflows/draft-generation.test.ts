import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resumeDraftSchema } from '../schemas/resume-draft.schema';

const generate = vi.fn();

vi.mock('@mastra/core/agent', () => ({
  Agent: class {
    generate = generate;
  },
}));

vi.mock('../tools/discover-social-profiles.tool', () => ({
  discoverSocialProfilesTool: vi.fn(async ({ draft }: { draft: Record<string, unknown> }) => ({
    skipped: true,
    draft,
    discoveredProfilesCount: 0,
  })),
}));

import { runTextImportWorkflow } from './pdf-import.workflow';
import { runWebsiteImportWorkflow } from './website-import.workflow';

describe('draft generation against the model', () => {
  beforeEach(() => {
    generate.mockReset();
  });

  it('text import asks for structured output with the model output limit', async () => {
    generate.mockResolvedValue({ text: '', object: { basics: { name: 'Jane Doe', label: null } } });

    const result = await runTextImportWorkflow({
      sourceText: 'Jane Doe — engineer',
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'k',
      maxOutputTokens: 16384,
    });

    expect(result.errors).toEqual([]);
    expect(result.draft).toMatchObject({ basics: { name: 'Jane Doe' } });
    expect(generate).toHaveBeenCalledWith(expect.stringContaining('Jane Doe'), {
      modelSettings: { maxOutputTokens: 16384 },
      structuredOutput: expect.objectContaining({ schema: resumeDraftSchema }),
    });
  });

  it('text import survives a reply truncated by the token limit', async () => {
    const full = JSON.stringify({
      basics: { name: 'Jane Doe' },
      work: Array.from({ length: 20 }, (_, i) => ({ name: `Co ${i}`, highlights: ['a', 'b'] })),
    });
    generate.mockResolvedValue({
      text: full.slice(0, -60),
      object: undefined,
      finishReason: 'length',
    });

    const result = await runTextImportWorkflow({
      sourceText: 'Jane Doe',
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'k',
    });

    expect(result.errors).toEqual([]);
    expect((result.draft?.work as unknown[]).length).toBeGreaterThanOrEqual(19);
    expect(generate.mock.calls[0][1]).not.toHaveProperty('modelSettings');
  });

  it('website import uses a separate structuring pass and the output limit', async () => {
    generate.mockResolvedValue({ text: '', object: { basics: { name: 'Jo' } } });

    const result = await runWebsiteImportWorkflow({
      sourceUrl: 'https://jo.example.com',
      modelId: 'anthropic/claude-haiku-4-5',
      apiKey: 'k',
      maxOutputTokens: 64000,
      toolsConfig: {},
    });

    expect(result.errors).toEqual([]);
    const options = generate.mock.calls[0][1];
    expect(options).toMatchObject({
      maxSteps: 12,
      modelSettings: { maxOutputTokens: 32768 },
      structuredOutput: { schema: resumeDraftSchema },
    });
    expect(options.structuredOutput.model).toBeDefined();
  });

  it('website import reports drafting once the page content is loaded', async () => {
    generate.mockImplementation(
      async (_prompt: string, options: { onStepFinish?: (step: unknown) => void }) => {
        options.onStepFinish?.({ toolResults: [] });
        options.onStepFinish?.({ toolResults: [{ toolName: 'fetchHtml' }] });
        options.onStepFinish?.({ toolResults: [{ toolName: 'webLookup' }] });
        return { text: '', object: { basics: { name: 'Jo' } } };
      },
    );
    const steps: string[] = [];

    await runWebsiteImportWorkflow({
      sourceUrl: 'https://jo.example.com',
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'k',
      toolsConfig: {},
      onProgress: (step) => steps.push(step),
    });

    expect(steps.slice(0, 3)).toEqual(['extracting', 'drafting', 'verifying']);
    expect(steps.filter((s) => s === 'drafting')).toHaveLength(1);
  });
});
