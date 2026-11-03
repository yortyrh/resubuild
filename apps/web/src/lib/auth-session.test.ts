// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import {
  clearSession,
  getSessionToken,
  getValidAccessToken,
  hasSession,
  STORAGE_KEYS,
  saveSessionToken,
} from './auth-session';

describe('auth-session', () => {
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('persists the session token in localStorage', () => {
    expect(hasSession()).toBe(false);
    saveSessionToken('tok-1');
    expect(localStorage.getItem(STORAGE_KEYS.access_token)).toBe('tok-1');
    expect(getSessionToken()).toBe('tok-1');
    expect(hasSession()).toBe(true);
  });

  it('clearSession removes the token and legacy Supabase mirror keys', () => {
    saveSessionToken('tok-1');
    localStorage.setItem('resubuild.refresh_token', 'r');
    sessionStorage.setItem(STORAGE_KEYS.access_token, 'old');
    sessionStorage.setItem('resubuild.expires_at', '1');

    clearSession();

    expect(localStorage.getItem(STORAGE_KEYS.access_token)).toBeNull();
    expect(localStorage.getItem('resubuild.refresh_token')).toBeNull();
    expect(sessionStorage.length).toBe(0);
    expect(hasSession()).toBe(false);
  });

  it('getValidAccessToken returns the stored token or throws', async () => {
    await expect(getValidAccessToken()).rejects.toThrow('Not authenticated');
    saveSessionToken('tok-2');
    await expect(getValidAccessToken('http://ignored')).resolves.toBe('tok-2');
  });
});
