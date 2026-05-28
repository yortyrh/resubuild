// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateCv = vi.fn();
const mockReplace = vi.fn();
const mockPush = vi.fn();
const mockGetImportLlmConfig = vi.fn();

const mockResolveImportedResumeData = vi.fn(
  async (data: Record<string, unknown>, _options?: { useGravatar?: boolean }) => data,
);

vi.mock('@/lib/api', () => ({
  createCv: (...args: unknown[]) => mockCreateCv(...args),
  getImportLlmConfig: (...args: unknown[]) => mockGetImportLlmConfig(...args),
  startPdfImport: vi.fn(),
  getPdfImportJob: vi.fn(),
}));

vi.mock('@/lib/import-cv-media', () => ({
  resolveImportedResumeData: (data: Record<string, unknown>, options?: { useGravatar?: boolean }) =>
    mockResolveImportedResumeData(data, options),
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

vi.mock('@resumind/types', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@resumind/types')>();
  return {
    ...actual,
    createEmptyResume: () => ({
      basics: {},
      work: [],
      volunteer: [],
      education: [],
      awards: [],
      certificates: [],
      publications: [],
      skills: [],
      languages: [],
      interests: [],
      references: [],
      projects: [],
    }),
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
}));

import { NewCvPageClient } from './new-cv-page-client';

describe('NewCvPageClient', () => {
  beforeEach(() => {
    mockGetImportLlmConfig.mockResolvedValue({ configured: true, modelId: 'openai/gpt-4o-mini' });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('does not auto-create a CV on load', () => {
    render(<NewCvPageClient />);
    expect(mockCreateCv).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('defaults to the PDF import tab and orders tabs PDF, manual, JSON', async () => {
    render(<NewCvPageClient />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Import PDF',
      'Create manually',
      'Import JSON',
    ]);
    expect(screen.getByRole('tab', { name: 'Import PDF' })).toHaveAttribute('data-state', 'active');
    expect(await screen.findByTestId('import-file-upload')).toBeInTheDocument();
  });

  it('creates a CV from import and navigates to the editor', async () => {
    mockCreateCv.mockResolvedValue({ id: 'cv-import-1' });
    const user = userEvent.setup({ delay: null });
    render(<NewCvPageClient />);

    await user.click(screen.getByRole('tab', { name: 'Import JSON' }));
    await user.click(screen.getByRole('button', { name: 'Edit JSON…' }));
    fireEvent.change(screen.getByLabelText('JSON source'), {
      target: {
        value: JSON.stringify({ basics: { name: 'Jane Doe', label: 'Engineer' } }),
      },
    });
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Import' })).toBeEnabled();
    });
    await user.click(screen.getByRole('button', { name: 'Import' }));

    await waitFor(() => {
      expect(mockCreateCv).toHaveBeenCalledTimes(1);
    });
    expect(mockResolveImportedResumeData).toHaveBeenCalledWith(
      expect.objectContaining({
        basics: expect.objectContaining({ name: 'Jane Doe', label: 'Engineer' }),
      }),
      { useGravatar: false },
    );
    expect(mockCreateCv).toHaveBeenCalledWith({
      data: expect.objectContaining({
        basics: expect.objectContaining({ name: 'Jane Doe', label: 'Engineer' }),
        work: [],
        education: [],
      }),
    });
    expect(mockReplace).toHaveBeenCalledWith('/dashboard/cv/cv-import-1');
  }, 15_000);

  it('creates a CV and navigates to the editor when Save succeeds', async () => {
    mockCreateCv.mockResolvedValue({ id: 'cv-new-1' });
    const user = userEvent.setup({ delay: null });
    render(<NewCvPageClient />);

    await user.click(screen.getByRole('tab', { name: 'Create manually' }));
    const textboxes = screen.getAllByRole('textbox');
    await user.type(textboxes[0], 'Alex Smith');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockCreateCv).toHaveBeenCalledTimes(1);
    });
    expect(mockCreateCv).toHaveBeenCalledWith({
      data: expect.objectContaining({
        basics: expect.objectContaining({ name: 'Alex Smith' }),
        work: [],
        education: [],
      }),
    });
    expect(mockCreateCv).toHaveBeenCalledWith(
      expect.not.objectContaining({ title: expect.anything() }),
    );
    expect(mockReplace).toHaveBeenCalledWith('/dashboard/cv/cv-new-1');
  }, 15_000);
});
