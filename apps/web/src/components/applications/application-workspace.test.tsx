// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApplicationWorkspace } from './application-workspace';

const mockGetApplication = vi.fn();
const mockGetCv = vi.fn();
const mockGetApplicationLetterHtml = vi.fn();
const mockUpdateApplicationLetter = vi.fn();
const mockDownloadApplicationLetterPdf = vi.fn();

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    getApplication: (...args: unknown[]) => mockGetApplication(...args),
    getCv: (...args: unknown[]) => mockGetCv(...args),
    getApplicationLetterHtml: (...args: unknown[]) => mockGetApplicationLetterHtml(...args),
    updateApplicationLetter: (...args: unknown[]) => mockUpdateApplicationLetter(...args),
    downloadApplicationLetterPdf: (...args: unknown[]) => mockDownloadApplicationLetterPdf(...args),
  };
});

vi.mock('@/components/cv/markdown-editor', () => ({
  MarkdownEditor: () => <div data-testid="mock-markdown-editor" />,
  MarkdownEditorHandle: class {},
}));

vi.mock('@/components/cv/basics-section-view', () => ({
  BasicsSectionView: () => <div data-testid="mock-basics" />,
}));

vi.mock('@/components/applications/application-update-dialog', () => ({
  ApplicationUpdateDialog: () => null,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const STORAGE_KEY = 'application-workspace:lastTab';

const readyApplication = {
  id: 'app-1',
  status: 'ready' as const,
  jobTitle: 'Senior Engineer',
  jobCompany: 'Acme',
  selectionRationale: 'Best match',
  coverLetter: 'Hello world',
  coverLetterEmailSubject: 'Subject',
  tailoredCvId: 'cv-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderWorkspace() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ApplicationWorkspace id="app-1" />
    </QueryClientProvider>,
  );
}

describe('ApplicationWorkspace tabs', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    mockGetApplication.mockResolvedValue(readyApplication);
    mockGetCv.mockResolvedValue({ data: { basics: { name: 'Test User' } } });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders three tab triggers in the expected order', async () => {
    renderWorkspace();

    const triggers = await screen.findAllByRole('tab');
    expect(triggers.map((t) => t.textContent)).toEqual([
      'Job summary',
      'Tailored CV',
      'Cover letter',
    ]);
  });

  it('defaults to the Job summary tab when nothing is stored', async () => {
    renderWorkspace();

    const summaryTab = await screen.findByRole('tab', { name: 'Job summary' });
    await waitFor(() => {
      expect(summaryTab).toHaveAttribute('data-state', 'active');
    });
  });

  it('activates the Cover letter tab on mount when sessionStorage has that value', async () => {
    window.sessionStorage.setItem(STORAGE_KEY, 'cover-letter');

    renderWorkspace();

    const coverLetterTab = await screen.findByRole('tab', { name: 'Cover letter' });
    await waitFor(() => {
      expect(coverLetterTab).toHaveAttribute('data-state', 'active');
    });
  });

  it('falls back to the Job summary tab when sessionStorage has an unknown value', async () => {
    window.sessionStorage.setItem(STORAGE_KEY, 'not-a-real-tab');

    renderWorkspace();

    const summaryTab = await screen.findByRole('tab', { name: 'Job summary' });
    await waitFor(() => {
      expect(summaryTab).toHaveAttribute('data-state', 'active');
    });
  });

  it('writes the new tab id to sessionStorage when the user switches tabs', async () => {
    const user = userEvent.setup();
    renderWorkspace();

    const tailoredTab = await screen.findByRole('tab', { name: 'Tailored CV' });
    await user.click(tailoredTab);

    await waitFor(() => {
      expect(window.sessionStorage.getItem(STORAGE_KEY)).toBe('tailored-cv');
    });

    const coverLetterTab = await screen.findByRole('tab', { name: 'Cover letter' });
    await user.click(coverLetterTab);

    await waitFor(() => {
      expect(window.sessionStorage.getItem(STORAGE_KEY)).toBe('cover-letter');
    });
  });
});
