import { describe, expect, it } from 'vitest';
import { mergeDiscoveredProfiles, mergeProfilesIntoDraft } from './merge-discovered-profiles';

describe('mergeDiscoveredProfiles', () => {
  it('appends new profiles with derived username', () => {
    const { profiles, addedCount } = mergeDiscoveredProfiles([], [
      {
        network: 'GitHub',
        url: 'https://github.com/janedoe',
      },
    ]);

    expect(addedCount).toBe(1);
    expect(profiles).toEqual([
      {
        network: 'GitHub',
        url: 'https://github.com/janedoe',
        username: 'janedoe',
      },
    ]);
  });

  it('preserves existing network entries', () => {
    const { profiles, addedCount } = mergeDiscoveredProfiles(
      [{ network: 'GitHub', url: 'https://github.com/janedoe', username: 'janedoe' }],
      [{ network: 'GitHub', url: 'https://github.com/other-user' }],
    );

    expect(addedCount).toBe(0);
    expect(profiles).toHaveLength(1);
    expect(profiles[0]?.url).toBe('https://github.com/janedoe');
  });

  it('deduplicates by normalized URL', () => {
    const { profiles, addedCount } = mergeDiscoveredProfiles(
      [{ network: 'LinkedIn', url: 'https://linkedin.com/in/jane/', username: 'jane' }],
      [{ network: 'LinkedIn', url: 'https://www.linkedin.com/in/jane' }],
    );

    expect(addedCount).toBe(0);
    expect(profiles).toHaveLength(1);
  });

  it('rejects invalid URLs', () => {
    const { profiles, addedCount } = mergeDiscoveredProfiles([], [
      { network: 'GitHub', url: 'http://github.com/jane' },
      { network: 'GitHub', url: 'not-a-url' },
    ]);

    expect(addedCount).toBe(0);
    expect(profiles).toEqual([]);
  });
});

describe('mergeProfilesIntoDraft', () => {
  it('merges profiles into basics without mutating other fields', () => {
    const { draft, addedCount } = mergeProfilesIntoDraft(
      {
        basics: { name: 'Jane Doe', email: 'jane@example.com', profiles: [] },
        work: [{ name: 'Acme' }],
      },
      [{ network: 'LinkedIn', url: 'https://www.linkedin.com/in/jane-doe', username: 'jane-doe' }],
    );

    expect(addedCount).toBe(1);
    expect(draft.basics).toMatchObject({
      name: 'Jane Doe',
      email: 'jane@example.com',
      profiles: [
        {
          network: 'LinkedIn',
          url: 'https://www.linkedin.com/in/jane-doe',
          username: 'jane-doe',
        },
      ],
    });
    expect(draft.work).toEqual([{ name: 'Acme' }]);
  });
});
