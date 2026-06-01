// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryProvider } from '@/components/providers/query-provider';
import { ImportFileForm } from './import-file-form';

const mockGetAiAgentActive = vi.fn();
const mockStartPdfImport = vi.fn();
const mockImportCvFromMarkdown = vi.fn();
const mockGetPdfImportJob = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastInfo = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    info: (...args: unknown[]) => mockToastInfo(...args),
  },
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    getAiAgentActive: (...args: unknown[]) => mockGetAiAgentActive(...args),
    startPdfImport: (...args: unknown[]) => mockStartPdfImport(...args),
    importCvFromMarkdown: (...args: unknown[]) => mockImportCvFromMarkdown(...args),
    getPdfImportJob: (...args: unknown[]) => mockGetPdfImportJob(...args),
  };
});

vi.mock('@/lib/import-cv-media', () => ({
  checkImportableMediaUrl: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/import-cv-preview', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/import-cv-preview')>();
  return {
    ...actual,
    probeExternalImageUrl: vi.fn().mockResolvedValue(false),
  };
});

vi.mock('@/lib/queries/ai-agent-queries', () => ({
  useAiAgentActive: () => ({
    data: { configured: true, modelId: 'openai/gpt-4o-mini' },
    isLoading: false,
  }),
  usePdfImportJob: (jobId: string | null) => ({
    data: jobId
      ? {
          status: 'succeeded',
          previewData: { basics: { name: 'Jane Doe' } },
          discoveredProfilesCount: 2,
        }
      : undefined,
    error: undefined,
  }),
}));

vi.mock('@/components/cv/json-resume-editor', () => ({
  formatJsonForEditor: (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return '';
    }
    try {
      return `${JSON.stringify(JSON.parse(trimmed), null, 2)}\n`;
    } catch {
      return text;
    }
  },
  JsonResumeEditor: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <textarea
      aria-label="JSON source"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

function renderForm() {
  const onImport = vi.fn().mockResolvedValue(undefined);
  const onCancel = vi.fn();
  render(
    <QueryProvider>
      <ImportFileForm onImport={onImport} onCancel={onCancel} pollIntervalMs={0} />
    </QueryProvider>,
  );
  return { onImport, onCancel };
}

describe('ImportFileForm', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('detects JSON and shows validation for direct import', async () => {
    mockGetAiAgentActive.mockResolvedValue({ configured: true });
    const user = userEvent.setup({ delay: null });
    renderForm();

    const file = new File([JSON.stringify({ basics: { name: 'Alex' } })], 'resume.json', {
      type: 'application/json',
    });
    await user.upload(screen.getByTestId('import-file-upload-input'), file);

    await waitFor(() => {
      expect(screen.getByTestId('import-file-kind')).toHaveTextContent('JSON Resume');
      expect(mockToastSuccess).toHaveBeenCalledWith('JSON Resume data is valid.');
    });
  });

  it('hides JSON validation after agent PDF import succeeds', async () => {
    mockGetAiAgentActive.mockResolvedValue({ configured: true, modelId: 'openai/gpt-4o-mini' });
    mockStartPdfImport.mockResolvedValue({ jobId: 'job-1' });
    mockGetPdfImportJob.mockResolvedValue({
      status: 'succeeded',
      previewData: { basics: { name: 'Jane Doe' } },
    });

    const user = userEvent.setup({ delay: null });
    const { onImport } = renderForm();

    const file = new File(['%PDF'], 'resume.pdf', { type: 'application/pdf' });
    await user.upload(screen.getByTestId('import-file-upload-input'), file);
    await user.click(screen.getByRole('button', { name: 'Import' }));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(
        'Résumé is ready to import. We found 2 social profiles—review them in Preview or Edit before Save.',
      );
    });
    expect(screen.queryByText(/JSON Resume data is valid/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(onImport).toHaveBeenCalled();
    });
  });

  it('shows validation again after editing agent output', async () => {
    mockGetAiAgentActive.mockResolvedValue({ configured: true, modelId: 'openai/gpt-4o-mini' });
    mockStartPdfImport.mockResolvedValue({ jobId: 'job-1' });
    mockGetPdfImportJob.mockResolvedValue({
      status: 'succeeded',
      previewData: { basics: { name: 'Jane Doe' } },
    });

    const user = userEvent.setup({ delay: null });
    renderForm();

    const file = new File(['%PDF'], 'resume.pdf', { type: 'application/pdf' });
    await user.upload(screen.getByTestId('import-file-upload-input'), file);
    await user.click(screen.getByRole('button', { name: 'Import' }));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(
        'Résumé is ready to import. We found 2 social profiles—review them in Preview or Edit before Save.',
      );
    });

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('JSON source'), {
      target: { value: '{ not json' },
    });
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid JSON file')).toBeInTheDocument();
    });
  });
});
