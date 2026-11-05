/**
 * A CV imported in the free wizard, kept in this browser until the visitor
 * signs up (also across OAuth redirects and email verification). The
 * dashboard saves it to the new account, then clears it.
 */
const STORAGE_KEY = 'resubuild.pendingGuestImport';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface StoredImport {
  data: Record<string, unknown>;
  savedAt: number;
}

export function savePendingGuestImport(data: Record<string, unknown>, now = Date.now()): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, savedAt: now }));
  } catch {
    // Storage full or blocked: the visitor can still import again after signing up.
  }
}

export function loadPendingGuestImport(now = Date.now()): Record<string, unknown> | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredImport;
    if (
      !stored ||
      typeof stored.data !== 'object' ||
      stored.data === null ||
      now - stored.savedAt > MAX_AGE_MS
    ) {
      clearPendingGuestImport();
      return null;
    }
    return stored.data;
  } catch {
    clearPendingGuestImport();
    return null;
  }
}

export function clearPendingGuestImport(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
