// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ImportUrlForm } from './import-url-form';

const mockImportCvFromUrl = vi.fn();

vi.mock('@/lib/api', () => ({
  importCvFromUrl: (...args: unknown[]) => mockImportCvFromUrl(...args),
}));

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
  useAiAgentActive: () => ({ data: { configured: true } }),
  usePdfImportJob: () => ({ data: undefined, error: undefined }),
}));

vi.mock('@/lib/queries/web-scrape-queries', () => ({
  useWebScrapeConfig: () => ({ data: { configured: false } }),
}));

vi.mock('@/components/cv/json-resume-editor', () => ({
  formatJsonForEditor: (text: string) => text,
}));

describe('ImportUrlForm', () => {
  const mockOnImport = vi.fn();
  const mockOnCancel = vi.fn();

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('fetches JSON Resume from a URL and imports it', async () => {
    mockImportCvFromUrl.mockResolvedValue({
      kind: 'json',
      data: { basics: { name: 'Registry User', label: 'Engineer' } },
    });
    mockOnImport.mockResolvedValue(undefined);
    const user = userEvent.setup({ delay: null });

    render(<ImportUrlForm onImport={mockOnImport} onCancel={mockOnCancel} />);
    await user.type(
      screen.getByLabelText(/Import from URL/i),
      'https://registry.jsonresume.org/thomasdavis',
    );
    await user.click(screen.getByRole('button', { name: 'Fetch' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Import' })).toBeEnabled();
    });

    await user.click(screen.getByRole('button', { name: 'Import' }));

    await waitFor(() => {
      expect(mockOnImport).toHaveBeenCalledWith({
        data: expect.objectContaining({
          basics: expect.objectContaining({ name: 'Registry User' }),
        }),
        useGravatar: false,
      });
    });
  });
});
