import { createEmptyResume } from '@resubuild/types';
import { describe, expect, it, vi } from 'vitest';
import { discoverSocialProfilesTool } from './discover-social-profiles.tool';

describe('discoverSocialProfilesTool', () => {
  const baseDraft = {
    ...createEmptyResume(),
    basics: {
      name: 'Jane Doe',
      profiles: [],
    },
    work: [{ name: 'Acme Corp' }],
  };

  it('skips when search key is absent', async () => {
    const searchFn = vi.fn();
    const result = await discoverSocialProfilesTool({ draft: baseDraft }, searchFn);

    expect(result).toEqual({
      skipped: true,
      draft: baseDraft,
      discoveredProfilesCount: 0,
    });
    expect(searchFn).not.toHaveBeenCalled();
  });

  it('merges validated profile URLs from search results', async () => {
    const searchFn = vi.fn().mockImplementation(async (query: string) => {
      if (query.includes('LinkedIn')) {
        return [{ url: 'https://www.linkedin.com/in/jane-doe' }];
      }
      if (query.includes('GitHub')) {
        return [{ url: 'https://github.com/janedoe' }];
      }
      return [];
    });

    const result = await discoverSocialProfilesTool(
      { draft: baseDraft, searchApiKey: 'test-key' },
      searchFn,
    );

    expect(result.skipped).toBe(false);
    expect(result.discoveredProfilesCount).toBeGreaterThan(0);
    const profiles = (result.draft.basics as { profiles?: Array<{ network: string; url: string }> })
      .profiles;
    expect(profiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          network: 'LinkedIn',
          url: 'https://www.linkedin.com/in/jane-doe',
        }),
      ]),
    );
    expect(searchFn.mock.calls.length).toBeLessThanOrEqual(5);
  });

  it('preserves existing GitHub profile when search returns another URL', async () => {
    const draft = {
      ...baseDraft,
      basics: {
        ...baseDraft.basics,
        profiles: [{ network: 'GitHub', url: 'https://github.com/janedoe', username: 'janedoe' }],
      },
    };

    const searchFn = vi.fn().mockResolvedValue([{ url: 'https://github.com/other-user' }]);
    const result = await discoverSocialProfilesTool({ draft, searchApiKey: 'test-key' }, searchFn);

    const profiles = (result.draft.basics as { profiles?: Array<{ url: string }> }).profiles;
    expect(profiles).toEqual([
      { network: 'GitHub', url: 'https://github.com/janedoe', username: 'janedoe' },
    ]);
  });

  it('tolerates search errors without failing', async () => {
    const searchFn = vi.fn().mockRejectedValue(new Error('timeout'));
    const result = await discoverSocialProfilesTool(
      { draft: baseDraft, searchApiKey: 'test-key' },
      searchFn,
    );

    expect(result.skipped).toBe(false);
    expect(result.discoveredProfilesCount).toBe(0);
    expect(result.draft).toEqual(baseDraft);
  });

  it('rejects off-platform URLs', async () => {
    const searchFn = vi.fn().mockResolvedValue([{ url: 'https://example.com/jane-doe' }]);
    const result = await discoverSocialProfilesTool(
      { draft: baseDraft, searchApiKey: 'test-key' },
      searchFn,
    );

    expect(result.discoveredProfilesCount).toBe(0);
  });

  it('rejects candidates whose username does not appear in the source text', async () => {
    const searchFn = vi.fn().mockImplementation(async (query: string) => {
      if (query.includes('LinkedIn')) {
        return [{ url: 'https://www.linkedin.com/in/jane-doe' }];
      }
      if (query.includes('GitHub')) {
        return [{ url: 'https://github.com/someone-else' }];
      }
      if (query.includes('Dribbble')) {
        return [{ url: 'https://dribbble.com/unrelated' }];
      }
      return [];
    });

    const result = await discoverSocialProfilesTool(
      {
        draft: baseDraft,
        searchApiKey: 'test-key',
        sourceText: 'Jane Doe — yorty — yortyrh',
      },
      searchFn,
    );

    const profiles = (
      result.draft.basics as { profiles?: Array<{ network: string; username?: string }> }
    ).profiles;
    expect(profiles ?? []).toEqual([]);
    expect(result.discoveredProfilesCount).toBe(0);
  });

  it('accepts candidates whose username does appear in the source text', async () => {
    const searchFn = vi.fn().mockImplementation(async (query: string) => {
      if (query.includes('GitHub')) {
        return [{ url: 'https://github.com/yorty' }];
      }
      return [];
    });

    const result = await discoverSocialProfilesTool(
      {
        draft: baseDraft,
        searchApiKey: 'test-key',
        sourceText: 'Yorty — yortyrh — yorty',
      },
      searchFn,
    );

    const profiles = (
      result.draft.basics as { profiles?: Array<{ network: string; username?: string }> }
    ).profiles;
    expect(result.discoveredProfilesCount).toBe(1);
    expect(profiles).toEqual([expect.objectContaining({ network: 'GitHub', username: 'yorty' })]);
  });
});
