// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import {
  clearPendingGuestImport,
  loadPendingGuestImport,
  savePendingGuestImport,
} from './pending-guest-import';

describe('pending guest import', () => {
  afterEach(() => window.localStorage.clear());

  it('keeps the imported CV until it is cleared', () => {
    savePendingGuestImport({ basics: { name: 'Jane' } }, 1000);
    expect(loadPendingGuestImport(2000)).toEqual({ basics: { name: 'Jane' } });
    clearPendingGuestImport();
    expect(loadPendingGuestImport(2000)).toBeNull();
  });

  it('drops imports older than a week and corrupt entries', () => {
    savePendingGuestImport({ basics: {} }, 0);
    expect(loadPendingGuestImport(8 * 24 * 60 * 60 * 1000)).toBeNull();
    window.localStorage.setItem('resubuild.pendingGuestImport', '{oops');
    expect(loadPendingGuestImport()).toBeNull();
    expect(window.localStorage.getItem('resubuild.pendingGuestImport')).toBeNull();
  });
});
