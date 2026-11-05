// @vitest-environment jsdom
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadPendingGuestImport, savePendingGuestImport } from '@/lib/pending-guest-import';

const replace = vi.fn();
const mutateAsync = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
vi.mock('@/lib/queries/cv-mutations', () => ({ useCreateCv: () => ({ mutateAsync }) }));
vi.mock('@/lib/import-cv-media', () => ({
  resolveImportedResumeData: vi.fn(async (data: unknown) => data),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from 'sonner';
import { PendingGuestImportSaver } from './pending-guest-import-saver';

describe('PendingGuestImportSaver', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('does nothing without a pending import', () => {
    render(<PendingGuestImportSaver />);
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('saves the pending import once and opens it in the editor', async () => {
    savePendingGuestImport({ basics: { name: 'Jane' } });
    mutateAsync.mockResolvedValue({ id: 'cv-1' });
    const { rerender } = render(<PendingGuestImportSaver />);
    rerender(<PendingGuestImportSaver />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard/cv/cv-1'));
    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutateAsync).toHaveBeenCalledWith({ data: { basics: { name: 'Jane' } } });
    expect(loadPendingGuestImport()).toBeNull();
  });

  it('reports a failed save', async () => {
    savePendingGuestImport({ basics: {} });
    mutateAsync.mockRejectedValue(new Error('boom'));
    render(<PendingGuestImportSaver />);
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Could not save your imported CV: boom'),
    );
  });
});
