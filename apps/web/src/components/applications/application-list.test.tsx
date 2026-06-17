// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApplicationList } from './application-list';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

const mockListApplications = vi.fn();
const mockDeleteApplication = vi.fn();
const mockUpdateApplication = vi.fn();
const mockDownloadCvPdf = vi.fn();
const mockDownloadApplicationLetterPdf = vi.fn();
const mockTriggerBrowserDownload = vi.fn();

vi.mock('@/lib/api', () => ({
  listApplications: (...args: unknown[]) => mockListApplications(...args),
  deleteApplication: (...args: unknown[]) => mockDeleteApplication(...args),
  updateApplication: (...args: unknown[]) => mockUpdateApplication(...args),
  downloadCvPdf: (...args: unknown[]) => mockDownloadCvPdf(...args),
  downloadApplicationLetterPdf: (...args: unknown[]) => mockDownloadApplicationLetterPdf(...args),
}));

vi.mock('@/lib/download', () => ({
  triggerBrowserDownload: (...args: unknown[]) => mockTriggerBrowserDownload(...args),
}));

function renderList() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ApplicationList />
    </QueryClientProvider>,
  );
}

describe('ApplicationList', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders the skeleton while the list is loading', () => {
    // Promise that never resolves → isLoading stays true.
    mockListApplications.mockReturnValue(new Promise(() => {}));

    renderList();

    expect(screen.getByText('Loading applications')).toBeInTheDocument();
  });

  it('renders applications in a data table with Company, Position, Status and Actions columns', async () => {
    mockListApplications.mockResolvedValue([
      {
        id: 'app-1',
        status: 'ready',
        jobTitle: 'Engineer',
        jobCompany: 'Acme',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    renderList();

    // The table exposes accessible column headers. Use waitFor to assert
    // the full set so we don't race the skeleton → data-table swap.
    await waitFor(() => {
      const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
      expect(headers).toEqual(['Company', 'Position', 'Application status', 'Actions']);
    });

    // Company and Position are each links to the application workspace.
    const companyLink = await screen.findByRole('link', { name: 'Acme' });
    expect(companyLink).toHaveAttribute('href', '/dashboard/applications/app-1');

    expect(screen.getByRole('link', { name: 'Engineer' })).toHaveAttribute(
      'href',
      '/dashboard/applications/app-1',
    );

    // The status cell shows the human-readable status label.
    expect(screen.getByText('Ready')).toBeInTheDocument();

    // The Update button stays inline; the row's other actions live in a 3-dots menu.
    expect(screen.getByRole('button', { name: 'Update Engineer application' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Engineer application' })).toBeInTheDocument();
  });

  it('opens a 3-dots menu with Export CV as PDF, Export cover letter as PDF, Preview CV, and Delete', async () => {
    const user = userEvent.setup();
    mockListApplications.mockResolvedValue([
      {
        id: 'app-1',
        status: 'ready',
        jobTitle: 'Engineer',
        jobCompany: 'Acme',
        tailoredCvId: 'cv-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    renderList();

    const trigger = await screen.findByRole('button', { name: 'Open Engineer application' });
    await user.click(trigger);

    expect(await screen.findByRole('menuitem', { name: /Export CV as PDF/ })).toBeInTheDocument();
    expect(
      await screen.findByRole('menuitem', { name: /Export cover letter as PDF/ }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('menuitem', { name: /^Preview CV$/ })).toBeInTheDocument();
    expect(await screen.findByRole('menuitem', { name: /^Delete$/ })).toBeInTheDocument();
  });

  it('downloads the CV PDF when the menu item is clicked', async () => {
    const user = userEvent.setup();
    mockListApplications.mockResolvedValue([
      {
        id: 'app-1',
        status: 'ready',
        jobTitle: 'Engineer',
        jobCompany: 'Acme',
        tailoredCvId: 'cv-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    const pdfBlob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    mockDownloadCvPdf.mockResolvedValue({ blob: pdfBlob, filename: 'engineer-cv.pdf' });

    renderList();

    const trigger = await screen.findByRole('button', { name: 'Open Engineer application' });
    await user.click(trigger);

    await user.click(await screen.findByRole('menuitem', { name: /Export CV as PDF/ }));

    await waitFor(() => {
      expect(mockDownloadCvPdf).toHaveBeenCalledWith('cv-1');
    });
    expect(mockTriggerBrowserDownload).toHaveBeenCalledWith(pdfBlob, 'engineer-cv.pdf');
  });

  it('downloads the cover letter PDF when the menu item is clicked', async () => {
    const user = userEvent.setup();
    mockListApplications.mockResolvedValue([
      {
        id: 'app-1',
        status: 'ready',
        jobTitle: 'Engineer',
        jobCompany: 'Acme',
        tailoredCvId: 'cv-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    const pdfBlob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    mockDownloadApplicationLetterPdf.mockResolvedValue({
      blob: pdfBlob,
      filename: 'engineer-letter.pdf',
    });

    renderList();

    const trigger = await screen.findByRole('button', { name: 'Open Engineer application' });
    await user.click(trigger);

    await user.click(await screen.findByRole('menuitem', { name: /Export cover letter as PDF/ }));

    await waitFor(() => {
      expect(mockDownloadApplicationLetterPdf).toHaveBeenCalledWith('app-1');
    });
    expect(mockTriggerBrowserDownload).toHaveBeenCalledWith(pdfBlob, 'engineer-letter.pdf');
  });

  it('shows an error toast when the CV PDF export fails', async () => {
    const user = userEvent.setup();
    const { toast } = await import('sonner');
    mockListApplications.mockResolvedValue([
      {
        id: 'app-1',
        status: 'ready',
        jobTitle: 'Engineer',
        jobCompany: 'Acme',
        tailoredCvId: 'cv-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    mockDownloadCvPdf.mockRejectedValue(new Error('PDF export is temporarily unavailable'));

    renderList();

    const trigger = await screen.findByRole('button', { name: 'Open Engineer application' });
    await user.click(trigger);

    await user.click(await screen.findByRole('menuitem', { name: /Export CV as PDF/ }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('PDF export is temporarily unavailable');
    });
  });

  it('deletes an application after confirmation', async () => {
    const user = userEvent.setup();
    mockListApplications.mockResolvedValue([
      {
        id: 'app-1',
        status: 'ready',
        jobTitle: 'Engineer',
        jobCompany: 'Acme',
        tailoredCvId: 'cv-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    mockDeleteApplication.mockResolvedValue(undefined);

    renderList();

    // Open the row's actions menu and click the Delete entry.
    const trigger = await screen.findByRole('button', { name: 'Open Engineer application' });
    await user.click(trigger);
    await user.click(await screen.findByRole('menuitem', { name: /^Delete$/ }));
    // Then the confirm button inside the modal (no aria-label, accessible name = "Delete").
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(mockDeleteApplication.mock.calls[0]?.[0]).toBe('app-1');
    });
  });

  it('disables the Update button and shows "Updating…" while an update is in progress', async () => {
    mockListApplications.mockResolvedValue([
      {
        id: 'app-1',
        status: 'ready',
        jobTitle: 'Engineer',
        jobCompany: 'Acme',
        updateInProgress: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    renderList();

    const updateButton = await screen.findByRole('button', {
      name: 'Update Engineer application',
    });
    expect(updateButton).toBeDisabled();
    expect(updateButton).toHaveTextContent('Updating…');

    // The status cell also surfaces the in-progress state via the dedicated region.
    expect(screen.getByLabelText('Update in progress')).toBeInTheDocument();
  });

  it('hides the "Prepare application" visible label below sm and exposes it via aria-label', async () => {
    mockListApplications.mockResolvedValue([]);

    const { container } = renderList();

    const trigger = await screen.findByRole('link', { name: 'Prepare application' });
    expect(trigger).toHaveAttribute('aria-label', 'Prepare application');
    expect(trigger).toHaveAttribute('href', '/dashboard/applications/new');

    const visibleLabel = container.querySelector('span.hidden.sm\\:inline');
    expect(visibleLabel).not.toBeNull();
    expect(visibleLabel).toHaveTextContent('Prepare application');
  });
});
