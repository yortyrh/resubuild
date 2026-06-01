import { createEmptyResume } from '@resumind/types';
import { describe, expect, it, vi } from 'vitest';
import { discoverSocialProfilesTool } from './tools/discover-social-profiles.tool';
import { runTextImportWorkflow } from './workflows/pdf-import.workflow';

vi.mock('./tools/discover-social-profiles.tool', () => ({
  discoverSocialProfilesTool: vi.fn(async ({ draft }: { draft: Record<string, unknown> }) => ({
    skipped: false,
    draft,
    discoveredProfilesCount: 0,
  })),
}));

describe('runTextImportWorkflow', () => {
  it('repairs invalid drafts within the attempt limit', async () => {
    let repairCalls = 0;

    const result = await runTextImportWorkflow({
      sourceText: 'Jane Doe\nSoftware Engineer at Acme Corp',
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'test-key',
      generateDraft: async () => ({ basics: 'invalid' }),
      repairDraft: async () => {
        repairCalls += 1;
        return {
          ...createEmptyResume(),
          basics: { name: 'Jane Doe' },
        };
      },
      finalize: async () => 'cv-456',
    });

    expect(repairCalls).toBeGreaterThan(0);
    expect(result.cvId).toBe('cv-456');
  });

  it('returns validation errors when repair attempts are exhausted', async () => {
    const result = await runTextImportWorkflow({
      sourceText: 'Invalid resume text',
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'test-key',
      generateDraft: async () => ({ basics: 'invalid' }),
      repairDraft: async () => ({ basics: 'still invalid' }),
    });

    expect(result.cvId).toBeUndefined();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('merges discovered profiles after validation succeeds', async () => {
    vi.mocked(discoverSocialProfilesTool).mockResolvedValueOnce({
      skipped: false,
      discoveredProfilesCount: 1,
      draft: {
        ...createEmptyResume(),
        basics: {
          name: 'Jane Doe',
          profiles: [
            {
              network: 'GitHub',
              url: 'https://github.com/janedoe',
              username: 'janedoe',
            },
          ],
        },
      },
    });

    const result = await runTextImportWorkflow({
      sourceText: 'Jane Doe\nSoftware Engineer at Acme Corp',
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'test-key',
      searchApiKey: 'search-key',
      generateDraft: async () => ({
        ...createEmptyResume(),
        basics: { name: 'Jane Doe', profiles: [] },
      }),
    });

    expect(discoverSocialProfilesTool).toHaveBeenCalled();
    expect(result.discoveredProfilesCount).toBe(1);
    expect(result.draft?.basics).toMatchObject({
      profiles: [
        expect.objectContaining({
          network: 'GitHub',
          url: 'https://github.com/janedoe',
        }),
      ],
    });
  });
});
