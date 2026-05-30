// @vitest-environment jsdom
import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CvEditorHeaderActions } from './cv-editor-header-actions';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    downloadCvPdf: vi.fn(),
    downloadCvJson: vi.fn(),
  };
});

import { downloadCvJson, downloadCvPdf } from '@/lib/api';
import { cvKeys } from '@/lib/queries/keys';
import { createTestQueryClient } from '@/lib/queries/test-utils';

describe('CvEditorHeaderActions', () => {
  beforeEach(() => {
    vi.mocked(downloadCvPdf).mockResolvedValue({
      blob: new Blob(['pdf'], { type: 'application/pdf' }),
      filename: 'jane-doe.pdf',
    });
    vi.mocked(downloadCvJson).mockResolvedValue({
      blob: new Blob(['{}'], { type: 'application/json' }),
      filename: 'jane-doe.json',
    });
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  function renderActions() {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(cvKeys.detail('cv-1'), {
      id: 'cv-1',
      user_id: 'u1',
      title: 'Jane',
      templateId: 'modern',
      data: { basics: { name: 'Jane Doe' } },
      created_at: 'c',
      updated_at: 'u',
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <CvEditorHeaderActions cvId="cv-1" />
      </QueryClientProvider>,
    );
  }

  it('renders Preview link and Export menu trigger', async () => {
    renderActions();

    expect(screen.getByRole('link', { name: /Preview/i })).toHaveAttribute(
      'href',
      '/dashboard/cv/cv-1/preview',
    );
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
  });

  it('downloads PDF using the CV template id', async () => {
    const user = userEvent.setup({ delay: null });
    renderActions();

    await user.click(screen.getByRole('button', { name: 'Export' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Download PDF' }));

    await waitFor(() => {
      expect(downloadCvPdf).toHaveBeenCalledWith('cv-1', 'modern');
    });
  });

  it('downloads JSON from the export menu', async () => {
    const user = userEvent.setup({ delay: null });
    renderActions();

    await user.click(screen.getByRole('button', { name: 'Export' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Download JSON' }));

    await waitFor(() => {
      expect(downloadCvJson).toHaveBeenCalledWith('cv-1');
    });
  });

  it('shows export errors below the action buttons', async () => {
    const user = userEvent.setup({ delay: null });
    vi.mocked(downloadCvJson).mockRejectedValue(new Error('Request failed (500)'));
    renderActions();

    await user.click(screen.getByRole('button', { name: 'Export' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Download JSON' }));

    await waitFor(() => {
      expect(screen.getByText('Request failed (500)')).toBeInTheDocument();
    });
  });
});
