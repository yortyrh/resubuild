import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSession,
  getValidAccessToken,
  hasSession,
  STORAGE_KEYS,
  saveSession,
} from './auth-session';

function installBrowserSessionStorage() {
  const store = new Map<string, string>();
  const sessionStorage = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
  vi.stubGlobal('sessionStorage', sessionStorage);
  vi.stubGlobal('window', { sessionStorage } as Pick<Window, 'sessionStorage'>);
}

describe('auth-session', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe('saveSession / clearSession / hasSession', () => {
    beforeEach(() => {
      installBrowserSessionStorage();
    });

    it('persists access and refresh tokens; optional expires_at', () => {
      saveSession({
        access_token: 'a',
        refresh_token: 'r',
        expires_in: 3600,
        token_type: 'bearer',
        user: { id: 'u1' },
      });
      expect(sessionStorage.getItem(STORAGE_KEYS.access_token)).toBe('a');
      expect(sessionStorage.getItem(STORAGE_KEYS.refresh_token)).toBe('r');
      expect(sessionStorage.getItem(STORAGE_KEYS.expires_at)).toBeNull();

      saveSession({
        access_token: 'a2',
        refresh_token: 'r2',
        expires_in: 3600,
        expires_at: 1_700_000_000,
        token_type: 'bearer',
        user: { id: 'u1', email: 'x@y.com' },
      });
      expect(sessionStorage.getItem(STORAGE_KEYS.access_token)).toBe('a2');
      expect(sessionStorage.getItem(STORAGE_KEYS.refresh_token)).toBe('r2');
      expect(sessionStorage.getItem(STORAGE_KEYS.expires_at)).toBe(String(1_700_000_000));
    });

    it('clearSession removes known keys', () => {
      saveSession({
        access_token: 'x',
        refresh_token: 'y',
        expires_in: 1,
        expires_at: 1,
        token_type: 'bearer',
        user: { id: 'u' },
      });
      clearSession();
      expect(sessionStorage.getItem(STORAGE_KEYS.access_token)).toBeNull();
      expect(sessionStorage.getItem(STORAGE_KEYS.refresh_token)).toBeNull();
      expect(sessionStorage.getItem(STORAGE_KEYS.expires_at)).toBeNull();
    });

    it('hasSession reflects presence of access token only', () => {
      expect(hasSession()).toBe(false);
      sessionStorage.setItem(STORAGE_KEYS.access_token, 'tok');
      expect(hasSession()).toBe(true);
    });
  });

  describe('SSR / no window', () => {
    beforeEach(() => {
      vi.stubGlobal('window', undefined);
    });

    it('persists nothing when window is unavailable', () => {
      saveSession({
        access_token: 'ignored',
        refresh_token: 'ignored',
        expires_in: 1,
        token_type: 'bearer',
        user: { id: 'u' },
      });
      expect(hasSession()).toBe(false);
    });

    it('clearSession no-ops safely', () => {
      clearSession();
    });
  });

  describe('getValidAccessToken', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-05-01T12:00:00.000Z'));
      installBrowserSessionStorage();
    });

    it('returns cached access token when expiry is comfortably in the future', async () => {
      const expiresAtUnix = Math.floor(Date.now() / 1000) + 3600;
      sessionStorage.setItem(STORAGE_KEYS.access_token, 'acc');
      sessionStorage.setItem(STORAGE_KEYS.refresh_token, 'ref');
      sessionStorage.setItem(STORAGE_KEYS.expires_at, String(expiresAtUnix));

      await expect(getValidAccessToken('https://api.example')).resolves.toBe('acc');
    });

    it('refreshes when missing expires_at / zero expiry window (expires soon)', async () => {
      sessionStorage.setItem(STORAGE_KEYS.access_token, 'old');
      sessionStorage.setItem(STORAGE_KEYS.refresh_token, 'ref');

      const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            access_token: 'new',
            refresh_token: 'ref2',
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            token_type: 'bearer',
            user: { id: 'u' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

      await expect(getValidAccessToken('https://api.example')).resolves.toBe('new');
      expect(spy).toHaveBeenCalledTimes(1);
      expect(JSON.parse(spy.mock.calls[0]![1]!.body as string)).toEqual({ refresh_token: 'ref' });
      expect(sessionStorage.getItem(STORAGE_KEYS.access_token)).toBe('new');
    });

    it('throws when not authenticated', async () => {
      await expect(getValidAccessToken('https://api.example')).rejects.toThrow(
        /Not authenticated/i,
      );
    });

    it('clears session and throws when refresh is needed but refresh_token missing', async () => {
      sessionStorage.setItem(STORAGE_KEYS.access_token, 'old');
      sessionStorage.removeItem(STORAGE_KEYS.refresh_token);

      await expect(getValidAccessToken('https://api.example')).rejects.toThrow(/Session expired/i);
      expect(sessionStorage.getItem(STORAGE_KEYS.access_token)).toBeNull();
    });

    it('clears session when refresh responds non-OK', async () => {
      sessionStorage.setItem(STORAGE_KEYS.access_token, 'old');
      sessionStorage.setItem(STORAGE_KEYS.refresh_token, 'ref');

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 401 }));

      await expect(getValidAccessToken('https://api.example')).rejects.toThrow(/Session expired/i);
      expect(sessionStorage.getItem(STORAGE_KEYS.access_token)).toBeNull();
    });
  });

  describe('loadStored expiry parsing', () => {
    beforeEach(() => {
      installBrowserSessionStorage();
    });

    it('treats invalid expires_at as missing (triggers refresh path)', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-05-01T12:00:00.000Z'));

      sessionStorage.setItem(STORAGE_KEYS.access_token, 'old');
      sessionStorage.setItem(STORAGE_KEYS.refresh_token, 'ref');
      sessionStorage.setItem(STORAGE_KEYS.expires_at, 'not-a-number');

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            access_token: 'refreshed',
            refresh_token: 'ref',
            expires_in: 3600,
            token_type: 'bearer',
            user: { id: 'u' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

      await expect(getValidAccessToken('https://api')).resolves.toBe('refreshed');
      vi.useRealTimers();
    });
  });
});
