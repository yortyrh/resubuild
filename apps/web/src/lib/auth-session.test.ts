import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.fn();
const mockRefreshSession = vi.fn();
const mockSetSession = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: mockGetSession,
      refreshSession: mockRefreshSession,
      setSession: mockSetSession,
    },
  }),
}));

import {
  clearSession,
  getValidAccessToken,
  hasSession,
  persistSupabaseSession,
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
    vi.clearAllMocks();
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

  describe('persistSupabaseSession', () => {
    beforeEach(() => {
      installBrowserSessionStorage();
    });

    it('mirrors a supabase session into sessionStorage', () => {
      persistSupabaseSession({
        access_token: 'acc',
        refresh_token: 'ref',
        expires_in: 3600,
        expires_at: 1_800_000_000,
        token_type: 'bearer',
        user: { id: 'u1', email: 'a@b.com' } as never,
      });
      expect(sessionStorage.getItem(STORAGE_KEYS.access_token)).toBe('acc');
      expect(sessionStorage.getItem(STORAGE_KEYS.refresh_token)).toBe('ref');
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

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns cached access token when expiry is comfortably in the future', async () => {
      const expiresAtUnix = Math.floor(Date.now() / 1000) + 3600;
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'acc',
            refresh_token: 'ref',
            expires_in: 3600,
            expires_at: expiresAtUnix,
            token_type: 'bearer',
            user: { id: 'u1' },
          },
        },
        error: null,
      });

      await expect(getValidAccessToken()).resolves.toBe('acc');
      expect(mockRefreshSession).not.toHaveBeenCalled();
    });

    it('refreshes when the session expires soon', async () => {
      const soon = Math.floor(Date.now() / 1000) + 30;
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'old',
            refresh_token: 'ref',
            expires_in: 30,
            expires_at: soon,
            token_type: 'bearer',
            user: { id: 'u1' },
          },
        },
        error: null,
      });
      mockRefreshSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'new',
            refresh_token: 'ref2',
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            token_type: 'bearer',
            user: { id: 'u1' },
          },
        },
        error: null,
      });

      await expect(getValidAccessToken()).resolves.toBe('new');
      expect(mockRefreshSession).toHaveBeenCalledTimes(1);
      expect(sessionStorage.getItem(STORAGE_KEYS.access_token)).toBe('new');
    });

    it('throws when not authenticated', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
      mockSetSession.mockResolvedValue({ data: { session: null }, error: null });

      await expect(getValidAccessToken()).rejects.toThrow(/Not authenticated/i);
    });

    it('rehydrates the Supabase client from sessionStorage when cookies are missing', async () => {
      sessionStorage.setItem(STORAGE_KEYS.access_token, 'stored-acc');
      sessionStorage.setItem(STORAGE_KEYS.refresh_token, 'stored-ref');
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
      mockSetSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'stored-acc',
            refresh_token: 'stored-ref',
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            token_type: 'bearer',
            user: { id: 'u1' },
          },
        },
        error: null,
      });

      await expect(getValidAccessToken()).resolves.toBe('stored-acc');
      expect(mockSetSession).toHaveBeenCalledWith({
        access_token: 'stored-acc',
        refresh_token: 'stored-ref',
      });
    });

    it('clears session and throws when refresh is needed but refresh_token missing', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'old',
            refresh_token: '',
            expires_in: 30,
            expires_at: Math.floor(Date.now() / 1000) + 30,
            token_type: 'bearer',
            user: { id: 'u1' },
          },
        },
        error: null,
      });

      await expect(getValidAccessToken()).rejects.toThrow(/Session expired/i);
      expect(sessionStorage.getItem(STORAGE_KEYS.access_token)).toBeNull();
    });

    it('clears session when refresh fails', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'old',
            refresh_token: 'ref',
            expires_in: 30,
            expires_at: Math.floor(Date.now() / 1000) + 30,
            token_type: 'bearer',
            user: { id: 'u1' },
          },
        },
        error: null,
      });
      mockRefreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'expired' },
      });

      await expect(getValidAccessToken()).rejects.toThrow(/Session expired/i);
      expect(sessionStorage.getItem(STORAGE_KEYS.access_token)).toBeNull();
    });
  });
});
