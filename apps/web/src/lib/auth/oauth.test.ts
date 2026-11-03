// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { oauthStartUrl, signInWithGitHub, signInWithGoogle, signInWithLinkedIn } from './oauth';

describe('OAuth sign-in', () => {
  const assign = vi.fn();
  const originalLocation = window.location;

  beforeEach(() => {
    assign.mockReset();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, assign },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  });

  it('builds the API start URL with a relative redirect', () => {
    expect(oauthStartUrl('github')).toBe(
      'http://localhost:3001/auth/oauth/github?redirect=%2Fdashboard',
    );
    expect(oauthStartUrl('google', '/dashboard/cv')).toBe(
      'http://localhost:3001/auth/oauth/google?redirect=%2Fdashboard%2Fcv',
    );
  });

  it.each([
    ['github', signInWithGitHub],
    ['google', signInWithGoogle],
    ['linkedin', signInWithLinkedIn],
  ] as const)('%s navigates the browser to the API start route', async (provider, signIn) => {
    await expect(signIn()).resolves.toEqual({ navigated: true });
    expect(assign).toHaveBeenCalledWith(
      `http://localhost:3001/auth/oauth/${provider}?redirect=%2Fdashboard`,
    );
  });
});
