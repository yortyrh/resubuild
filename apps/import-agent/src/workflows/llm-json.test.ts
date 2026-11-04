import { describe, expect, it, vi } from 'vitest';
import { resumeDraftSchema } from '../schemas/resume-draft.schema';
import {
  draftModelSettings,
  generateJson,
  type JsonAgent,
  LlmJsonError,
  MAX_DRAFT_OUTPUT_TOKENS,
  parseLlmJson,
  stripNulls,
} from './llm-json';

/** A long resume, like the ones that hit the model's output-token limit. */
function longResume() {
  return {
    basics: { name: 'Jane Doe', label: 'Engineer', email: 'jane@example.com' },
    work: Array.from({ length: 40 }, (_, i) => ({
      name: `Company ${i}`,
      position: 'Senior Engineer',
      startDate: '2010-01',
      endDate: '2012-01',
      highlights: [`Shipped feature ${i}`, `Led team ${i}`, `Cut costs by ${i}%`],
    })),
  };
}

/** What the previous implementation did with the reply. */
function legacyParse(text: string) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  return JSON.parse(text.slice(start, end + 1));
}

describe('parseLlmJson', () => {
  it("recovers a reply truncated inside an array (the \"Expected ',' or ']'\" failure)", () => {
    const full = JSON.stringify(longResume(), null, 2);
    // Cut in the middle of a highlights array, as a max-token stop would.
    const cut = full.indexOf('"Led team 30"');
    const truncated = `Here is the JSON:\n${full.slice(0, cut + 6)}`;

    expect(() => legacyParse(truncated)).toThrow(/Expected ',' or ']' after array element/);

    const parsed = parseLlmJson(truncated) as ReturnType<typeof longResume>;
    expect(parsed.basics.name).toBe('Jane Doe');
    expect(parsed.work.length).toBeGreaterThanOrEqual(30);
    expect(parsed.work[29].highlights).toHaveLength(3);
  });

  it('repairs a missing comma between array elements', () => {
    const text = '{"skills": [{"name": "SQL"} {"name": "Go"}]}';
    expect(parseLlmJson(text)).toEqual({ skills: [{ name: 'SQL' }, { name: 'Go' }] });
  });

  it('handles code fences, surrounding prose, trailing commas and comments', () => {
    const text =
      'Sure!\n```json\n{\n  // the person\n  "basics": {"name": "Jo",},\n  "work": [],\n}\n```\nLet me know.';
    expect(parseLlmJson(text)).toEqual({ basics: { name: 'Jo' }, work: [] });
  });

  it('parses valid JSON unchanged and strips nulls', () => {
    expect(parseLlmJson('{"a": 1, "b": null, "c": [null, {"d": null, "e": "x"}]}')).toEqual({
      a: 1,
      c: [{ e: 'x' }],
    });
  });

  it('throws LlmJsonError when there is no object at all', () => {
    expect(() => parseLlmJson('I cannot help with that.')).toThrow(LlmJsonError);
    expect(() => parseLlmJson('{"a": [1, 2')).not.toThrow();
  });
});

describe('stripNulls', () => {
  it('leaves primitives and non-null values alone', () => {
    expect(stripNulls('x')).toBe('x');
    expect(stripNulls({ a: [1, null, 2], b: { c: null } })).toEqual({ a: [1, 2], b: {} });
  });
});

function fakeAgent(...replies: Array<Awaited<ReturnType<JsonAgent['generate']>> | Error>) {
  const generate = vi.fn(async (_prompt: string, _options?: Record<string, unknown>) => {
    const reply = replies.shift();
    if (!reply) throw new Error('unexpected extra call');
    if (reply instanceof Error) throw reply;
    return reply;
  });
  return { agent: { generate } as JsonAgent, generate };
}

describe('generateJson', () => {
  it('requests structured output and returns the validated object without nulls', async () => {
    const { agent, generate } = fakeAgent({
      text: '{}',
      object: { basics: { name: 'Jane', label: null } },
    });

    const result = await generateJson(agent, 'prompt', {
      schema: resumeDraftSchema,
      generateOptions: { maxSteps: 4 },
    });

    expect(result).toEqual({ basics: { name: 'Jane' } });
    expect(generate).toHaveBeenCalledWith('prompt', {
      maxSteps: 4,
      structuredOutput: {
        schema: resumeDraftSchema,
        errorStrategy: 'warn',
        jsonPromptInjection: 'auto',
      },
    });
  });

  it('repairs the raw text when structured output yields no object (truncated reply)', async () => {
    const full = JSON.stringify(longResume());
    const { agent, generate } = fakeAgent({
      text: full.slice(0, full.length - 200),
      object: undefined,
      finishReason: 'length',
    });

    const result = await generateJson(agent, 'prompt', { schema: resumeDraftSchema });

    expect((result as ReturnType<typeof longResume>).work.length).toBeGreaterThan(30);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('retries without a schema when the provider rejects the structured request', async () => {
    const { agent, generate } = fakeAgent(new Error('response_format not supported'), {
      text: '{"basics": {"name": "Jane"}}',
    });

    await expect(generateJson(agent, 'p', { schema: resumeDraftSchema })).resolves.toEqual({
      basics: { name: 'Jane' },
    });
    expect(generate).toHaveBeenLastCalledWith('p', {});
  });

  it('asks the fix agent (single step) to correct JSON that cannot be repaired', async () => {
    // Two objects with prose between them: neither JSON.parse nor jsonrepair can fix it.
    const broken = '{"basics": {"name": "Jane"}} then {"work": []}';
    const { agent } = fakeAgent({ text: broken });
    const fix = fakeAgent({ text: '{"basics": {"name": "Jane"}, "work": []}' });

    const result = await generateJson(agent, 'p', {
      generateOptions: { maxSteps: 12, modelSettings: { maxOutputTokens: 1000 } },
      fixAgent: fix.agent,
    });

    expect(result).toEqual({ basics: { name: 'Jane' }, work: [] });
    expect(fix.generate).toHaveBeenCalledWith(expect.stringContaining('not valid JSON'), {
      modelSettings: { maxOutputTokens: 1000 },
    });
    expect(fix.generate.mock.calls[0][0]).toContain(broken);
  });

  it('does not retry when the reply contains no JSON at all', async () => {
    const { agent, generate } = fakeAgent({ text: 'Sorry, I cannot read that file.' });
    await expect(generateJson(agent, 'p')).rejects.toThrow('LLM did not return JSON');
    expect(generate).toHaveBeenCalledTimes(1);
  });
});

describe('draftModelSettings', () => {
  it('uses the model output limit, capped, and nothing when unknown', () => {
    expect(draftModelSettings(16384)).toEqual({ modelSettings: { maxOutputTokens: 16384 } });
    expect(draftModelSettings(200_000)).toEqual({
      modelSettings: { maxOutputTokens: MAX_DRAFT_OUTPUT_TOKENS },
    });
    expect(draftModelSettings(undefined)).toEqual({});
    expect(draftModelSettings(0)).toEqual({});
    expect(draftModelSettings(Number.NaN)).toEqual({});
  });
});
