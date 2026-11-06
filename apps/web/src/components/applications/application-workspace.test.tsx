// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardBreadcrumbProvider } from '@/components/dashboard/dashboard-breadcrumb-context';
import { ApplicationWorkspace } from './application-workspace';

const mockGetApplication = vi.fn();
const mockGetCv = vi.fn();
const mockGetApplicationLetterHtml = vi.fn();
const mockDownloadApplicationLetterPdf = vi.fn();
const mockDownloadCvPdf = vi.fn();
const mockUseCvPreviewHtml = vi.fn();

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    getApplication: (...args: unknown[]) => mockGetApplication(...args),
    getCv: (...args: unknown[]) => mockGetCv(...args),
    getApplicationLetterHtml: (...args: unknown[]) => mockGetApplicationLetterHtml(...args),
    downloadApplicationLetterPdf: (...args: unknown[]) => mockDownloadApplicationLetterPdf(...args),
    downloadCvPdf: (...args: unknown[]) => mockDownloadCvPdf(...args),
  };
});

vi.mock('@/components/cv/use-cv-preview-html', () => ({
  useCvPreviewHtml: (...args: unknown[]) => mockUseCvPreviewHtml(...args),
}));

vi.mock('@/components/applications/application-job-posting-panel', () => ({
  ApplicationJobPostingPanel: ({
    application,
  }: {
    application: { id: string; jobRawText?: string | null };
  }) => (
    <div data-testid="mock-job-posting-panel">
      {application.id}:{application.jobRawText ?? ''}
    </div>
  ),
}));

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
  jobSourceType: 'url' as const,
  jobSourceUrl: 'https://jobs.example.com/123',
  jobSourceFileName: null,
  jobRawText: '  We are hiring a senior engineer.  ',
  jobSummary: { requirements: ['TypeScript'], keywords: ['NestJS'], language: 'en' },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const LETTER_HTML = '<html><body><p>Rendered letter</p></body></html>';
const CV_HTML = '<html><body><p>Rendered CV</p></body></html>';

function mockWorkspaceDefaults() {
  mockGetApplication.mockResolvedValue(readyApplication);
  mockGetCv.mockResolvedValue({
    id: 'cv-1',
    templateId: 'modern',
    data: { basics: { name: 'Test User' } },
  });
  mockGetApplicationLetterHtml.mockResolvedValue(LETTER_HTML);
  mockUseCvPreviewHtml.mockReturnValue({ html: CV_HTML, loading: false, error: null });
  mockDownloadCvPdf.mockResolvedValue({
    blob: new Blob(['%PDF'], { type: 'application/pdf' }),
    filename: 'Jane Doe - Senior Engineer.pdf',
  });
}

function setupUserWithClipboard() {
  const user = userEvent.setup();
  const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
  return { user, writeText };
}

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
    mockWorkspaceDefaults();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders three tab triggers in the expected order', async () => {
    renderWorkspace();

    const triggers = await screen.findAllByRole('tab');
    expect(triggers.map((t) => t.textContent)).toEqual([
      'Job posting',
      'Tailored CV',
      'Cover letter',
    ]);
    expect(screen.queryByRole('tab', { name: 'Job summary' })).not.toBeInTheDocument();
  });

  it('defaults to the Job posting tab when nothing is stored', async () => {
    renderWorkspace();

    const summaryTab = await screen.findByRole('tab', { name: 'Job posting' });
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

  it('keeps the stored "summary" tab id for the Job posting tab', async () => {
    window.sessionStorage.setItem(STORAGE_KEY, 'summary');

    renderWorkspace();

    const postingTab = await screen.findByRole('tab', { name: 'Job posting' });
    await waitFor(() => {
      expect(postingTab).toHaveAttribute('data-state', 'active');
    });
  });

  it('falls back to the Job posting tab when sessionStorage has an unknown value', async () => {
    window.sessionStorage.setItem(STORAGE_KEY, 'not-a-real-tab');

    renderWorkspace();

    const summaryTab = await screen.findByRole('tab', { name: 'Job posting' });
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

  it('shows the company as the heading and the position as a subtitle on the same row as the Update button', async () => {
    renderWorkspace();

    const heading = await screen.findByRole('heading', {
      level: 1,
      name: 'Acme',
    });
    expect(heading).toHaveClass('display', 'truncate');

    // The position is rendered as a muted subtitle beneath the heading. Scope
    // to the heading row so we don't match the Job posting tab's Position.
    const headingRow = heading.parentElement;
    expect(headingRow).not.toBeNull();
    const subtitle = within(headingRow!).getByText('Senior Engineer');
    expect(subtitle).toHaveClass('text-muted-foreground');
    expect(subtitle.tagName).toBe('P');

    // The Update button shares the heading row, not a breadcrumb row above it.
    const updateButton = screen.getByRole('button', { name: /Update/ });
    expect(
      updateButton.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_PRECEDING,
    ).toBeTruthy();
  });

  it('falls back to "Application" as the heading when the company is missing', async () => {
    mockGetApplication.mockResolvedValue({
      ...readyApplication,
      jobTitle: 'Senior Engineer',
      jobCompany: null,
    });

    renderWorkspace();

    const heading = await screen.findByRole('heading', { level: 1, name: 'Application' });
    const headingRow = heading.parentElement;
    expect(within(headingRow!).getByText('Senior Engineer')).toBeInTheDocument();
  });

  it('omits the subtitle when the position is missing', async () => {
    mockGetApplication.mockResolvedValue({
      ...readyApplication,
      jobTitle: null,
      jobCompany: 'Acme',
    });

    renderWorkspace();

    const heading = await screen.findByRole('heading', { level: 1, name: 'Acme' });
    const headingRow = heading.parentElement;
    expect(within(headingRow!).queryByText('Senior Engineer')).not.toBeInTheDocument();
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

describe('ApplicationWorkspace job posting tab', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    mockWorkspaceDefaults();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders the job posting panel with the application', async () => {
    renderWorkspace();

    const panel = await screen.findByTestId('mock-job-posting-panel');
    expect(panel).toHaveTextContent('app-1:');
    expect(panel).toHaveTextContent('We are hiring a senior engineer.');
  });

  it('copies the job posting as plain text', async () => {
    const { user, writeText } = setupUserWithClipboard();
    renderWorkspace();

    const copyButton = await screen.findByRole('button', { name: /Copy posting/ });
    expect(copyButton).toBeEnabled();
    await user.click(copyButton);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        'Position: Senior Engineer\nCompany: Acme\nSource: https://jobs.example.com/123\n\nWe are hiring a senior engineer.',
      );
    });
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Job posting copied');
  });

  it('disables Copy posting when there is nothing to copy', async () => {
    mockGetApplication.mockResolvedValue({
      ...readyApplication,
      jobTitle: '  ',
      jobCompany: null,
      jobSourceUrl: null,
      jobRawText: '   ',
    });

    renderWorkspace();

    const copyButton = await screen.findByRole('button', { name: /Copy posting/ });
    expect(copyButton).toBeDisabled();
  });

  it('enables Copy posting when only the posting text is saved', async () => {
    const { user, writeText } = setupUserWithClipboard();
    mockGetApplication.mockResolvedValue({
      ...readyApplication,
      jobTitle: null,
      jobCompany: null,
      jobSourceUrl: null,
      jobRawText: 'Only the text',
    });

    renderWorkspace();

    const copyButton = await screen.findByRole('button', { name: /Copy posting/ });
    expect(copyButton).toBeEnabled();
    await user.click(copyButton);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('Only the text');
    });
  });

  it('does not show Copy posting on the other tabs', async () => {
    window.sessionStorage.setItem(STORAGE_KEY, 'cover-letter');

    renderWorkspace();

    await screen.findByRole('button', { name: /Copy letter/ });
    expect(screen.queryByRole('button', { name: /Copy posting/ })).not.toBeInTheDocument();
  });
});

describe('ApplicationWorkspace tailored CV tab', () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    window.sessionStorage.clear();
    window.sessionStorage.setItem(STORAGE_KEY, 'tailored-cv');
    mockWorkspaceDefaults();
    URL.createObjectURL = vi.fn(() => 'blob:cv-pdf');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('renders the tailored CV preview in an iframe instead of the basics view', async () => {
    renderWorkspace();

    const frame = await screen.findByTitle('Resume preview');
    expect(frame.tagName).toBe('IFRAME');
    expect(frame.getAttribute('srcdoc')).toContain('Rendered CV');
    expect(screen.queryByTestId('mock-basics')).not.toBeInTheDocument();
  });

  it('builds the preview from the tailored CV and its template', async () => {
    renderWorkspace();

    await waitFor(() => {
      expect(mockUseCvPreviewHtml).toHaveBeenCalledWith('cv-1', 'modern');
    });
    expect(mockGetCv).toHaveBeenCalledWith('cv-1');
  });

  it('falls back to the classic template when the CV has none', async () => {
    mockGetCv.mockResolvedValue({ id: 'cv-1', templateId: null, data: { basics: {} } });

    renderWorkspace();

    await waitFor(() => {
      expect(mockUseCvPreviewHtml).toHaveBeenCalledWith('cv-1', 'classic');
    });
    expect(mockUseCvPreviewHtml).not.toHaveBeenCalledWith('cv-1', 'modern');
  });

  it('does not render the preview iframe while the preview is loading', async () => {
    mockUseCvPreviewHtml.mockReturnValue({ html: null, loading: true, error: null });

    renderWorkspace();

    await screen.findByRole('tab', { name: 'Tailored CV' });
    expect(screen.queryByTitle('Resume preview')).not.toBeInTheDocument();
  });

  it('keeps the Edit CV and Preview links', async () => {
    renderWorkspace();

    const editLink = await screen.findByRole('link', { name: /Edit CV/ });
    expect(editLink).toHaveAttribute('href', '/dashboard/cv/cv-1?applicationId=app-1');
    expect(screen.getByRole('link', { name: 'Preview' })).toHaveAttribute(
      'href',
      '/dashboard/cv/cv-1/preview?applicationId=app-1',
    );
  });

  it('downloads the tailored CV PDF with its template', async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await waitFor(() => {
      expect(mockUseCvPreviewHtml).toHaveBeenCalledWith('cv-1', 'modern');
    });
    const downloadButton = await screen.findByRole('button', { name: 'Download CV PDF' });
    await user.click(downloadButton);

    await waitFor(() => {
      expect(mockDownloadCvPdf).toHaveBeenCalledWith('cv-1', 'modern');
    });
    expect(mockDownloadCvPdf).toHaveBeenCalledTimes(1);
  });

  it('does not show Download CV PDF on the other tabs', async () => {
    window.sessionStorage.setItem(STORAGE_KEY, 'summary');

    renderWorkspace();

    await screen.findByRole('button', { name: /Copy posting/ });
    expect(screen.queryByRole('button', { name: 'Download CV PDF' })).not.toBeInTheDocument();
  });
});

describe('ApplicationWorkspace cover letter tab', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.sessionStorage.setItem(STORAGE_KEY, 'cover-letter');
    mockWorkspaceDefaults();
    mockGetApplication.mockResolvedValue({
      ...readyApplication,
      coverLetterEmailSubject: '  Application for Senior Engineer  ',
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows the email subject', async () => {
    renderWorkspace();

    expect(await screen.findByText('Email subject')).toBeInTheDocument();
    expect(screen.getByText('Application for Senior Engineer')).toBeInTheDocument();
  });

  it('falls back to a subject built from the position and company', async () => {
    mockGetApplication.mockResolvedValue({ ...readyApplication, coverLetterEmailSubject: '' });

    renderWorkspace();

    expect(await screen.findByText('Application — Senior Engineer at Acme')).toBeInTheDocument();
  });

  it('copies only the subject', async () => {
    const { user, writeText } = setupUserWithClipboard();
    renderWorkspace();

    await user.click(await screen.findByRole('button', { name: /Copy subject/ }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('Application for Senior Engineer');
    });
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Subject copied');
  });

  it('renders the letter HTML in an iframe', async () => {
    renderWorkspace();

    const frame = await screen.findByTitle('Cover letter preview');
    expect(frame.tagName).toBe('IFRAME');
    expect(frame.getAttribute('srcdoc')).toContain('Rendered letter');
    expect(mockGetApplicationLetterHtml).toHaveBeenCalledWith('app-1');
    expect(screen.queryByTestId('mock-markdown-view')).not.toBeInTheDocument();
  });

  it('falls back to the MarkdownView when the letter HTML cannot be loaded', async () => {
    mockGetApplicationLetterHtml.mockRejectedValue(new Error('Request failed (500)'));

    renderWorkspace();

    const view = await screen.findByTestId('mock-markdown-view');
    expect(view).toHaveTextContent('Hello world');
    expect(screen.queryByTitle('Cover letter preview')).not.toBeInTheDocument();
  });

  it('keeps the letter actions', async () => {
    renderWorkspace();

    expect(await screen.findByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy letter/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Print' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PDF' })).toBeInTheDocument();
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

describe('ApplicationWorkspace error states', () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    window.sessionStorage.clear();
    mockWorkspaceDefaults();
    URL.createObjectURL = vi.fn(() => 'blob:cv-pdf');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  function setupUserWithFailingClipboard() {
    const user = userEvent.setup();
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockRejectedValue(new Error('Clipboard permission denied'));
    return { user, writeText };
  }

  it('keeps Download CV PDF disabled until the tailored CV template is known', async () => {
    window.sessionStorage.setItem(STORAGE_KEY, 'tailored-cv');
    let resolveCv: (cv: unknown) => void = () => {};
    mockGetCv.mockReturnValue(
      new Promise((resolve) => {
        resolveCv = resolve;
      }),
    );
    const user = userEvent.setup();

    renderWorkspace();

    const downloadButton = await screen.findByRole('button', { name: 'Download CV PDF' });
    expect(downloadButton).toBeDisabled();
    await user.click(downloadButton);
    expect(mockDownloadCvPdf).not.toHaveBeenCalled();

    resolveCv({ id: 'cv-1', templateId: 'modern', data: { basics: {} } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Download CV PDF' })).toBeEnabled();
    });
  });

  it('shows an error toast when the tailored CV PDF download fails', async () => {
    window.sessionStorage.setItem(STORAGE_KEY, 'tailored-cv');
    mockDownloadCvPdf.mockRejectedValue(new Error('PDF export failed (500)'));
    const user = userEvent.setup();

    renderWorkspace();

    const downloadButton = await screen.findByRole('button', { name: 'Download CV PDF' });
    await waitFor(() => {
      expect(downloadButton).toBeEnabled();
    });
    await user.click(downloadButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('PDF export failed (500)');
    });
    expect(toast.success).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Download CV PDF' })).toBeEnabled();
    });
  });

  it('shows an error toast when copying the posting is rejected by the clipboard', async () => {
    const { user, writeText } = setupUserWithFailingClipboard();

    renderWorkspace();

    await user.click(await screen.findByRole('button', { name: /Copy posting/ }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Copy failed');
    });
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(toast.success).not.toHaveBeenCalledWith('Job posting copied');
  });

  it('shows an error toast when copying the subject is rejected by the clipboard', async () => {
    window.sessionStorage.setItem(STORAGE_KEY, 'cover-letter');
    const { user, writeText } = setupUserWithFailingClipboard();

    renderWorkspace();

    await user.click(await screen.findByRole('button', { name: /Copy subject/ }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Copy failed');
    });
    expect(writeText).toHaveBeenCalledWith('Subject');
    expect(toast.success).not.toHaveBeenCalledWith('Subject copied');
  });

  it('shows the CV preview error message when the preview cannot be built', async () => {
    window.sessionStorage.setItem(STORAGE_KEY, 'tailored-cv');
    mockUseCvPreviewHtml.mockReturnValue({
      html: null,
      loading: false,
      error: 'Could not render the CV preview',
    });

    renderWorkspace();

    expect(await screen.findByText('Could not render the CV preview')).toBeInTheDocument();
    expect(screen.queryByTitle('Resume preview')).not.toBeInTheDocument();
  });
});
