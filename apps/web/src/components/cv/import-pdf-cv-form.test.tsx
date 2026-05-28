// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockGetImportLlmConfig = vi.fn();
const mockStartPdfImport = vi.fn();
const mockGetPdfImportJob = vi.fn();

vi.mock('@/lib/api', () => ({
  getImportLlmConfig: (...args: unknown[]) => mockGetImportLlmConfig(...args),
  startPdfImport: (...args: unknown[]) => mockStartPdfImport(...args),
  getPdfImportJob: (...args: unknown[]) => mockGetPdfImportJob(...args),
}));

import { ImportPdfCvForm } from './import-pdf-cv-form';

describe('ImportPdfCvForm', () => {
  const onSuccess = vi.fn();
  const onCancel = vi.fn();

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows setup prompt when LLM config is missing', async () => {
    mockGetImportLlmConfig.mockResolvedValue({ configured: false });
    render(<ImportPdfCvForm onSuccess={onSuccess} onCancel={onCancel} pollIntervalMs={0} />);

    expect(await screen.findByText(/Configure LLM settings/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Import PDF' })).not.toBeInTheDocument();
  });

  it('does not upload until import is confirmed', async () => {
    mockGetImportLlmConfig.mockResolvedValue({ configured: true, modelId: 'openai/gpt-4o-mini' });
    render(<ImportPdfCvForm onSuccess={onSuccess} onCancel={onCancel} pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Import PDF' })).toBeDisabled();
    });
    expect(mockStartPdfImport).not.toHaveBeenCalled();
  });

  it('polls until success and calls onSuccess', async () => {
    mockGetImportLlmConfig.mockResolvedValue({ configured: true, modelId: 'openai/gpt-4o-mini' });
    mockStartPdfImport.mockResolvedValue({ jobId: 'job-1' });
    mockGetPdfImportJob
      .mockResolvedValueOnce({ status: 'running', progress: 'drafting' })
      .mockResolvedValue({ status: 'succeeded', cvId: 'cv-99' });

    const user = userEvent.setup({ delay: null });
    render(<ImportPdfCvForm onSuccess={onSuccess} onCancel={onCancel} pollIntervalMs={0} />);

    const file = new File(['%PDF'], 'resume.pdf', { type: 'application/pdf' });
    const input = await screen.findByLabelText('PDF résumé');
    await user.upload(input, file);
    await user.click(screen.getByRole('button', { name: 'Import PDF' }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith('cv-99');
    });
  });

  it('shows failure message when job fails', async () => {
    mockGetImportLlmConfig.mockResolvedValue({ configured: true, modelId: 'openai/gpt-4o-mini' });
    mockStartPdfImport.mockResolvedValue({ jobId: 'job-2' });
    mockGetPdfImportJob.mockResolvedValue({
      status: 'failed',
      errors: ['Schema validation failed'],
    });

    const user = userEvent.setup({ delay: null });
    render(<ImportPdfCvForm onSuccess={onSuccess} onCancel={onCancel} pollIntervalMs={0} />);

    const file = new File(['%PDF'], 'resume.pdf', { type: 'application/pdf' });
    const input = await screen.findByLabelText('PDF résumé');
    await user.upload(input, file);
    await user.click(screen.getByRole('button', { name: 'Import PDF' }));

    expect(await screen.findByText(/Schema validation failed/i)).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
