import { buildGravatarImageUrl } from './gravatar.util';

describe('buildGravatarImageUrl', () => {
  it('builds a Gravatar URL with d=404 for a valid email', () => {
    expect(buildGravatarImageUrl('MyEmail@Example.com')).toBe(
      'https://www.gravatar.com/avatar/60a6c20d49f49bc210ac98d7e47c74a0?s=512&d=404',
    );
  });

  it('returns null for empty or invalid emails', () => {
    expect(buildGravatarImageUrl('')).toBeNull();
    expect(buildGravatarImageUrl('not-an-email')).toBeNull();
  });
});
