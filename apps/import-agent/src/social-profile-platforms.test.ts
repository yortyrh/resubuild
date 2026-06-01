import { describe, expect, it } from 'vitest';
import {
  buildSearchContextFromDraft,
  extractExistingProfileNetworks,
  normalizeProfileNetwork,
  parseHttpsProfileUrl,
  SOCIAL_PROFILE_PLATFORMS,
} from './social-profile-platforms';

describe('normalizeProfileNetwork', () => {
  it('normalizes common network labels', () => {
    expect(normalizeProfileNetwork('LinkedIn')).toBe('linkedin');
    expect(normalizeProfileNetwork('Twitter')).toBe('x');
    expect(normalizeProfileNetwork('X')).toBe('x');
  });
});

describe('parseHttpsProfileUrl', () => {
  it('accepts https URLs only', () => {
    expect(parseHttpsProfileUrl('https://github.com/jane')?.hostname).toBe('github.com');
    expect(parseHttpsProfileUrl('http://github.com/jane')).toBeNull();
    expect(parseHttpsProfileUrl('not-a-url')).toBeNull();
  });
});

describe('buildSearchContextFromDraft', () => {
  it('extracts name, company, and location from draft', () => {
    const context = buildSearchContextFromDraft({
      basics: {
        name: 'Jane Doe',
        email: 'jane@example.com',
        location: { city: 'Paris', countryCode: 'FR' },
      },
      work: [{ name: 'Acme Corp' }],
    });

    expect(context).toEqual({
      name: 'Jane Doe',
      email: 'jane@example.com',
      company: 'Acme Corp',
      location: 'Paris, FR',
    });
  });

  it('returns null when name is missing', () => {
    expect(buildSearchContextFromDraft({ basics: { email: 'jane@example.com' } })).toBeNull();
  });
});

describe('extractExistingProfileNetworks', () => {
  it('collects normalized networks from basics.profiles', () => {
    const keys = extractExistingProfileNetworks({
      basics: {
        profiles: [{ network: 'GitHub', url: 'https://github.com/jane' }],
      },
    });
    expect(keys.has('github')).toBe(true);
  });
});

describe('platform URL validators', () => {
  it('accepts linkedin profile URLs', () => {
    const linkedin = SOCIAL_PROFILE_PLATFORMS.find((p) => p.key === 'linkedin')!;
    const url = parseHttpsProfileUrl('https://www.linkedin.com/in/jane-doe/')!;
    expect(linkedin.isValidProfileUrl(url)).toBe(true);
    expect(linkedin.deriveUsername(url)).toBe('jane-doe');
  });

  it('rejects github org URLs', () => {
    const github = SOCIAL_PROFILE_PLATFORMS.find((p) => p.key === 'github')!;
    const url = parseHttpsProfileUrl('https://github.com/orgs/acme/')!;
    expect(github.isValidProfileUrl(url)).toBe(false);
  });
});
