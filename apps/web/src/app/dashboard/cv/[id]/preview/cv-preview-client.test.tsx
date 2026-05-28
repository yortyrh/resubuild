// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CvPreviewClient } from './cv-preview-client';

vi.mock('@/lib/api', () => ({
  getCvExportHtml: vi.fn(),
  downloadCvPdf: vi.fn(),
}));

import { downloadCvPdf, getCvExportHtml } from '@/lib/api';

describe('CvPreviewClient', () => {
  beforeEach(() => {
    vi.mocked(getCvExportHtml).mockResolvedValue('<html><body>Jane Doe</body></html>');
    vi.mocked(downloadCvPdf).mockResolvedValue({
      blob: new Blob(['pdf'], { type: 'application/pdf' }),
      filename: 'jane-doe.pdf',
    });
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('loads export html and wires toolbar actions', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<CvPreviewClient cvId="cv-1" />);

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });
    expect(getCvExportHtml).toHaveBeenCalledWith('cv-1');

    fireEvent.click(screen.getByRole('button', { name: 'Print' }));
    expect(printSpy).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
    await waitFor(() => {
      expect(downloadCvPdf).toHaveBeenCalledWith('cv-1');
    });

    expect(screen.getByRole('link', { name: 'Back to editor' })).toHaveAttribute(
      'href',
      '/dashboard/cv/cv-1',
    );
  });

  it('shows user-visible message when PDF export returns 503', async () => {
    vi.mocked(downloadCvPdf).mockRejectedValue(
      new Error('PDF export is temporarily unavailable. Try Print instead.'),
    );
    render(<CvPreviewClient cvId="cv-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Download PDF' })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));

    await waitFor(() => {
      expect(
        screen.getByText('PDF export is temporarily unavailable. Try Print instead.'),
      ).toBeInTheDocument();
    });
  });
});
