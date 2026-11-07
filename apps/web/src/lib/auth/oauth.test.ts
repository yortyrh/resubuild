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
      value: { ...originalLocation, assign, origin: 'https://app.test' },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  });

  it('builds the API start URL with a relative redirect and the current web origin', () => {
    expect(oauthStartUrl('github')).toBe(
      'http://localhost:3001/auth/oauth/github?redirect=%2Fdashboard&origin=https%3A%2F%2Fapp.test',
    );
    expect(oauthStartUrl('google', '/dashboard/cv')).toBe(
      'http://localhost:3001/auth/oauth/google?redirect=%2Fdashboard%2Fcv&origin=https%3A%2F%2Fapp.test',
    );
  });

  it('reports the origin the user is on, including a non-default port', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, assign, origin: 'http://localhost:3000' },
    });
    const url = new URL(oauthStartUrl('linkedin', '/dashboard/cv'));
    expect(url.searchParams.get('origin')).toBe('http://localhost:3000');
    expect(url.searchParams.get('redirect')).toBe('/dashboard/cv');
  });

  it('sends exactly the redirect and origin query params', () => {
    const url = new URL(oauthStartUrl('github'));
    expect([...url.searchParams.keys()].sort()).toEqual(['origin', 'redirect']);
  });

  it.each([
    ['github', signInWithGitHub],
    ['google', signInWithGoogle],
    ['linkedin', signInWithLinkedIn],
  ] as const)('%s navigates the browser to the API start route', async (provider, signIn) => {
    await expect(signIn()).resolves.toEqual({ navigated: true });
    expect(assign).toHaveBeenCalledWith(
      `http://localhost:3001/auth/oauth/${provider}?redirect=%2Fdashboard&origin=https%3A%2F%2Fapp.test`,
    );
  });
});
