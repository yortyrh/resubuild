import { describe, expect, it } from 'vitest';
import {
  allSocialNetworkOptions,
  isProfileVisible,
  normalizeSocialNetworkKey,
  resolveProfileUrl,
  SOCIAL_NETWORK_SUGGESTIONS,
  socialNetworkLabel,
} from './social-networks';

describe('normalizeSocialNetworkKey', () => {
  it('maps common aliases to canonical keys', () => {
    expect(normalizeSocialNetworkKey('LinkedIn')).toBe('linkedin');
    expect(normalizeSocialNetworkKey('GITHUB')).toBe('github');
    expect(normalizeSocialNetworkKey('Twitter')).toBe('x');
    expect(normalizeSocialNetworkKey('x.com')).toBe('x');
    expect(normalizeSocialNetworkKey('  Git Hub  ')).toBe('github');
    expect(normalizeSocialNetworkKey('Pinterest')).toBe('pinterest');
  });

  it('returns null for unknown networks', () => {
    expect(normalizeSocialNetworkKey('My Blog')).toBe(null);
    expect(normalizeSocialNetworkKey('')).toBe(null);
    expect(normalizeSocialNetworkKey(undefined)).toBe(null);
  });
});

describe('SOCIAL_NETWORK_SUGGESTIONS', () => {
  it('lists prioritized platforms', () => {
    expect(SOCIAL_NETWORK_SUGGESTIONS).toContain('LinkedIn');
    expect(SOCIAL_NETWORK_SUGGESTIONS).toContain('GitHub');
    expect(SOCIAL_NETWORK_SUGGESTIONS).toContain('X');
    expect(SOCIAL_NETWORK_SUGGESTIONS).toContain('Twitter');
    expect(SOCIAL_NETWORK_SUGGESTIONS).toContain('Pinterest');
  });

  it('allSocialNetworkOptions includes suggestions', () => {
    const options = allSocialNetworkOptions();
    for (const label of SOCIAL_NETWORK_SUGGESTIONS) {
      expect(options).toContain(label);
    }
  });
});

describe('socialNetworkLabel', () => {
  it('returns display label for canonical key', () => {
    expect(socialNetworkLabel('github')).toBe('GitHub');
    expect(socialNetworkLabel('x')).toBe('X');
  });
});

describe('resolveProfileUrl', () => {
  it('prefers explicit url', () => {
    expect(
      resolveProfileUrl({
        network: 'GitHub',
        username: 'janedoe',
        url: 'github.com/custom',
      }),
    ).toBe('https://github.com/custom');
  });

  it('builds platform url from username when url omitted', () => {
    expect(resolveProfileUrl({ network: 'GitHub', username: 'janedoe' })).toBe(
      'https://github.com/janedoe',
    );
    expect(resolveProfileUrl({ network: 'LinkedIn', username: 'in/jane-doe' })).toBe(
      'https://www.linkedin.com/in/jane-doe',
    );
    expect(resolveProfileUrl({ network: 'X', username: '@jane' })).toBe('https://x.com/jane');
    expect(resolveProfileUrl({ network: 'Pinterest', username: 'janedoe' })).toBe(
      'https://www.pinterest.com/janedoe/',
    );
  });

  it('treats username as url when it looks like a host or path', () => {
    expect(resolveProfileUrl({ network: 'My Blog', username: 'example.com/me' })).toBe(
      'https://example.com/me',
    );
  });

  it('returns null for discord username only', () => {
    expect(resolveProfileUrl({ network: 'Discord', username: 'user#1234' })).toBe(null);
  });
});

describe('isProfileVisible', () => {
  it('requires network and url or username', () => {
    expect(isProfileVisible({ network: 'GitHub', username: 'a' })).toBe(true);
    expect(isProfileVisible({ network: 'GitHub', url: 'https://github.com/a' })).toBe(true);
    expect(isProfileVisible({ network: 'GitHub' })).toBe(false);
    expect(isProfileVisible({ username: 'a' })).toBe(false);
  });
});
