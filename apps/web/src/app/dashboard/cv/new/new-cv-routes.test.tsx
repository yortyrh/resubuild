// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryProvider } from '@/components/providers/query-provider';

const mockCreateCv = vi.fn();
const mockReplace = vi.fn();
const mockPush = vi.fn();
const mockGetAiAgentActive = vi.fn();

const mockResolveImportedResumeData = vi.fn(
  async (data: Record<string, unknown>, _options?: { useGravatar?: boolean }) => data,
);

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    createCv: (...args: unknown[]) => mockCreateCv(...args),
    getAiAgentActive: (...args: unknown[]) => mockGetAiAgentActive(...args),
    startPdfImport: vi.fn(),
    getPdfImportJob: vi.fn(),
  };
});

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

vi.mock('@/lib/queries/ai-agent-queries', () => ({
  useAiAgentActive: () => ({
    data: { configured: true, modelId: 'openai/gpt-4o-mini' },
    isLoading: false,
  }),
  usePdfImportJob: () => ({ data: undefined, error: undefined }),
}));

import CreateCvPage from './create/page';
import ImportFilePage from './import/file/page';

function renderWithProviders(ui: React.ReactElement) {
  return render(<QueryProvider>{ui}</QueryProvider>);
}

describe('New CV route pages', () => {
  beforeEach(() => {
    mockGetAiAgentActive.mockResolvedValue({ configured: true, modelId: 'openai/gpt-4o-mini' });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('does not auto-create a CV on the manual create page', () => {
    renderWithProviders(<CreateCvPage />);
    expect(mockCreateCv).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('renders the unified file import upload', async () => {
    renderWithProviders(<ImportFilePage />);
    expect(await screen.findByTestId('import-file-upload')).toBeInTheDocument();
  });

  it('creates a CV from JSON file import and navigates to the editor', async () => {
    mockCreateCv.mockResolvedValue({ id: 'cv-import-1' });
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<ImportFilePage />);

    await waitFor(() => {
      expect(screen.getByTestId('import-file-upload-input')).toBeInTheDocument();
    });

    const file = new File(
      [JSON.stringify({ basics: { name: 'Jane Doe', label: 'Engineer' } })],
      'resume.json',
      { type: 'application/json' },
    );
    await user.upload(screen.getByTestId('import-file-upload-input'), file);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    });
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockCreateCv).toHaveBeenCalledTimes(1);
    });
    expect(mockReplace).toHaveBeenCalledWith('/dashboard/cv/cv-import-1');
  }, 15_000);

  it('creates a CV from manual create and navigates to the editor', async () => {
    mockCreateCv.mockResolvedValue({ id: 'cv-new-1' });
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<CreateCvPage />);

    const textboxes = screen.getAllByRole('textbox');
    await user.type(textboxes[0], 'Alex Smith');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockCreateCv).toHaveBeenCalledTimes(1);
    });
    expect(mockReplace).toHaveBeenCalledWith('/dashboard/cv/cv-new-1');
  }, 15_000);
});
