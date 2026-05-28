// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CvPreviewClient } from './cv-preview-client';

vi.mock('@/lib/api', () => ({
  getCv: vi.fn(),
  getCvExportHtml: vi.fn(),
  downloadCvPdf: vi.fn(),
  listCvTemplates: vi.fn(),
  updateCvTemplate: vi.fn(),
}));

import {
  downloadCvPdf,
  getCv,
  getCvExportHtml,
  listCvTemplates,
  updateCvTemplate,
} from '@/lib/api';

const templates = [
  {
    id: 'mit-classic',
    label: 'MIT Classic',
    description: 'Default',
    category: 'default',
  },
  {
    id: 'capd-alum',
    label: 'Alum',
    description: 'Alum layout',
    category: 'alum',
  },
];

describe('CvPreviewClient', () => {
  beforeEach(() => {
    vi.mocked(getCv).mockResolvedValue({
      id: 'cv-1',
      user_id: 'u1',
      title: 'Jane',
      templateId: 'mit-classic',
      data: {},
      created_at: 'c',
      updated_at: 'u',
    });
    vi.mocked(listCvTemplates).mockResolvedValue(templates);
    vi.mocked(updateCvTemplate).mockResolvedValue({
      id: 'cv-1',
      user_id: 'u1',
      title: 'Jane',
      templateId: 'capd-alum',
      data: {},
      created_at: 'c',
      updated_at: 'u',
    });
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
      expect(screen.getByTitle('Resume preview')).toBeInTheDocument();
    });
    expect(getCvExportHtml).toHaveBeenCalledWith('cv-1', 'mit-classic');

    fireEvent.click(screen.getByRole('button', { name: 'Print' }));
    expect(printSpy).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
    await waitFor(() => {
      expect(downloadCvPdf).toHaveBeenCalledWith('cv-1', 'mit-classic');
    });

    expect(screen.getByRole('link', { name: 'Back to editor' })).toHaveAttribute(
      'href',
      '/dashboard/cv/cv-1',
    );
  });

  it('template change triggers refetch with new query param', async () => {
    render(<CvPreviewClient cvId="cv-1" />);

    await waitFor(() => {
      expect(getCvExportHtml).toHaveBeenCalledWith('cv-1', 'mit-classic');
    });

    fireEvent.change(screen.getByLabelText('Template'), { target: { value: 'capd-alum' } });

    await waitFor(() => {
      expect(updateCvTemplate).toHaveBeenCalledWith('cv-1', 'capd-alum');
      expect(getCvExportHtml).toHaveBeenCalledWith('cv-1', 'capd-alum');
    });
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
