// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useImportPreviewToasts } from './use-import-preview-toasts';

const mockToastSuccess = vi.fn();
const mockToastInfo = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    info: (...args: unknown[]) => mockToastInfo(...args),
  },
}));

describe('useImportPreviewToasts', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows default agent ready message without discovered profiles', () => {
    renderHook(() =>
      useImportPreviewToasts({
        resetKey: 'file-a',
        preview: { valid: true, imageStatus: 'owned' },
        validationSource: 'agent',
      }),
    );

    expect(mockToastSuccess).toHaveBeenCalledWith('Résumé is ready to import.');
  });

  it('mentions discovered profiles when count is present', () => {
    renderHook(() =>
      useImportPreviewToasts({
        resetKey: 'file-b',
        preview: { valid: true, imageStatus: 'owned' },
        validationSource: 'agent',
        discoveredProfilesCount: 2,
      }),
    );

    expect(mockToastSuccess).toHaveBeenCalledWith(
      'Résumé is ready to import. We found 2 social profiles—review them in Preview or Edit before Save.',
    );
  });
});
