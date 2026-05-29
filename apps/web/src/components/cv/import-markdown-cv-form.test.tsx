// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryProvider } from '@/components/providers/query-provider';
import { ImportMarkdownCvForm, type ImportMarkdownCvFormProps } from './import-markdown-cv-form';

const mockGetAiAgentActive = vi.fn();
const mockImportCvFromMarkdown = vi.fn();
const mockGetPdfImportJob = vi.fn();

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    getAiAgentActive: (...args: unknown[]) => mockGetAiAgentActive(...args),
    importCvFromMarkdown: (...args: unknown[]) => mockImportCvFromMarkdown(...args),
    getPdfImportJob: (...args: unknown[]) => mockGetPdfImportJob(...args),
  };
});

function renderImportForm(props: ImportMarkdownCvFormProps) {
  return render(
    <QueryProvider>
      <ImportMarkdownCvForm {...props} />
    </QueryProvider>,
  );
}

describe('ImportMarkdownCvForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('starts a markdown import job and calls onSuccess when it completes', async () => {
    mockGetAiAgentActive.mockResolvedValue({ configured: true, modelId: 'openai/gpt-4o-mini' });
    mockImportCvFromMarkdown.mockResolvedValue({ jobId: 'job-md-1' });
    mockGetPdfImportJob
      .mockResolvedValueOnce({ status: 'running', progress: 'drafting' })
      .mockResolvedValue({ status: 'succeeded', cvId: 'cv-md-1' });

    const user = userEvent.setup({ delay: null });
    renderImportForm({ onSuccess: mockOnSuccess, onCancel: mockOnCancel, pollIntervalMs: 0 });

    const file = new File(['# Jane Doe\nEngineer'], 'resume.md', { type: 'text/markdown' });
    const input = await screen.findByTestId('import-file-upload-input');
    await user.upload(input, file);
    await user.click(screen.getByRole('button', { name: 'Import Markdown' }));

    await waitFor(() => {
      expect(mockImportCvFromMarkdown).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith('cv-md-1');
    });
  });
});
