// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardBreadcrumbProvider } from '@/components/dashboard/dashboard-breadcrumb-context';
import { ApplicationWorkspace } from './application-workspace';

const mockGetApplication = vi.fn();
const mockGetCv = vi.fn();
const mockGetApplicationLetterHtml = vi.fn();
const mockDownloadApplicationLetterPdf = vi.fn();

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    getApplication: (...args: unknown[]) => mockGetApplication(...args),
    getCv: (...args: unknown[]) => mockGetCv(...args),
    getApplicationLetterHtml: (...args: unknown[]) => mockGetApplicationLetterHtml(...args),
    downloadApplicationLetterPdf: (...args: unknown[]) => mockDownloadApplicationLetterPdf(...args),
  };
});

vi.mock('@/components/cv/markdown-view', () => ({
  MarkdownView: ({ value }: { value?: string | null }) => (
    <div data-testid="mock-markdown-view">{value ?? ''}</div>
  ),
}));

vi.mock('@/components/cv/basics-section-view', () => ({
  BasicsSectionView: () => <div data-testid="mock-basics" />,
}));

vi.mock('@/components/applications/application-update-dialog', () => ({
  ApplicationUpdateDialog: () => null,
}));

vi.mock('@/components/applications/application-letter-edit-dialog', () => ({
  ApplicationLetterEditDialog: () => null,
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
      <DashboardBreadcrumbProvider>
        <ApplicationWorkspace id="app-1" />
      </DashboardBreadcrumbProvider>
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

  it('shows the job title as a visible heading on the same row as the Update button', async () => {
    renderWorkspace();

    const heading = await screen.findByRole('heading', {
      level: 1,
      name: 'Senior Engineer · Acme',
    });
    expect(heading).toHaveClass('text-2xl', 'font-semibold');

    // The Update button shares the heading row, not a breadcrumb row above it.
    const updateButton = screen.getByRole('button', { name: /Update/ });
    expect(
      updateButton.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_PRECEDING,
    ).toBeTruthy();
  });

  it('does not render the inner workspace breadcrumb above the title', async () => {
    renderWorkspace();

    // No Applications back-link lives inside the workspace anymore — the
    // top-bar breadcrumb owns the trail.
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).not.toBeInTheDocument();
  });

  it('publishes the application to the dashboard breadcrumb context', async () => {
    let captured: { variant?: string; jobCompany?: string | null } = {};
    const { useDashboardBreadcrumb } =
      await import('@/components/dashboard/dashboard-breadcrumb-context');

    function Probe() {
      const state = useDashboardBreadcrumb();
      captured = { variant: state.variant, jobCompany: state.application?.jobCompany };
      return null;
    }

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <DashboardBreadcrumbProvider>
          <ApplicationWorkspace id="app-1" />
          <Probe />
        </DashboardBreadcrumbProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(captured.variant).toBe('application');
      expect(captured.jobCompany).toBe('Acme');
    });
  });

  it('hides the Update button label on mobile only and exposes it via aria-label', async () => {
    renderWorkspace();

    const updateButton = await screen.findByRole('button', { name: /Update/ });
    expect(updateButton).toHaveAttribute('aria-label', 'Update application');
    expect(within(updateButton).getByText('Update')).toHaveClass('hidden', 'sm:inline');
  });
});

describe('ApplicationWorkspace cover letter tab', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.sessionStorage.setItem(STORAGE_KEY, 'cover-letter');
    mockGetApplication.mockResolvedValue(readyApplication);
    mockGetCv.mockResolvedValue({ data: { basics: { name: 'Test User' } } });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders the cover letter through the read-only MarkdownView', async () => {
    renderWorkspace();

    const view = await screen.findByTestId('mock-markdown-view');
    expect(view).toHaveTextContent('Hello world');
  });

  it('caps the cover letter preview at a scrollable max height', async () => {
    renderWorkspace();

    const view = await screen.findByTestId('mock-markdown-view');
    // The view is wrapped in a constrained container so long letters
    // don't dominate the workspace tab — the wrapper carries the
    // `overflow-y-auto` so the inner MarkdownView scrolls instead of
    // pushing the rest of the page down.
    const wrapper = view.parentElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper).toHaveClass('overflow-y-auto');
    expect(wrapper?.className).toMatch(/max-h-/);
  });

  it('exposes the Edit button before Copy letter in the action bar', async () => {
    renderWorkspace();

    const editButton = await screen.findByRole('button', { name: 'Edit' });
    const copyButton = screen.getByRole('button', { name: /Copy letter/ });

    expect(
      editButton.compareDocumentPosition(copyButton) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('disables Edit while an update is in progress', async () => {
    mockGetApplication.mockResolvedValue({
      ...readyApplication,
      updateInProgress: true,
      updateDraftId: 'draft-1',
    });

    renderWorkspace();

    const editButton = await screen.findByRole('button', { name: 'Edit' });
    expect(editButton).toBeDisabled();
  });
});
