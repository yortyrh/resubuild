// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryProvider } from '@/components/providers/query-provider';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockDeleteCv = vi.fn();
const mockListCvs = vi.fn();
const mockDownloadCvPdf = vi.fn();
const mockDownloadCvJson = vi.fn();
const mockTriggerBrowserDownload = vi.fn();

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    listCvs: (...args: unknown[]) => mockListCvs(...args),
    deleteCv: (...args: unknown[]) => mockDeleteCv(...args),
    downloadCvPdf: (...args: unknown[]) => mockDownloadCvPdf(...args),
    downloadCvJson: (...args: unknown[]) => mockDownloadCvJson(...args),
  };
});

vi.mock('@/lib/download', () => ({
  triggerBrowserDownload: (...args: unknown[]) => mockTriggerBrowserDownload(...args),
}));

import { CvList } from '@/components/dashboard/cv-list';

function renderCvList() {
  return render(
    <QueryProvider>
      <CvList />
    </QueryProvider>,
  );
}

const sampleCv = {
  id: 'cv-1',
  title: 'Engineer CV',
  templateId: 'classic',
  updated_at: '2026-01-01T00:00:00.000Z',
  data: {},
};

const sampleCvWithBasics = {
  id: 'cv-2',
  title: 'Yorty Ruiz Hernández — Python Backend Engineer',
  templateId: 'classic',
  updated_at: '2026-01-01T00:00:00.000Z',
  data: {
    basics: {
      name: 'Yorty Ruiz Hernández',
      label: 'Python Backend Engineer',
      email: 'yorty.ruiz@gmail.com',
      phone: '+1 365 833 4392',
      url: 'https://www.linkedin.com/in/yorty',
    },
  },
};

const sampleCvUrlOnly = {
  id: 'cv-3',
  title: 'Url Only CV',
  templateId: 'classic',
  updated_at: '2026-01-01T00:00:00.000Z',
  data: {
    basics: {
      name: 'Url Only',
      label: 'Designer',
      url: 'https://www.linkedin.com/in/url-only',
    },
  },
};

const sampleCvPhoneOnly = {
  id: 'cv-4',
  title: 'Phone Only CV',
  templateId: 'classic',
  updated_at: '2026-01-01T00:00:00.000Z',
  data: {
    basics: {
      name: 'Phone Only',
      label: 'Consultant',
      phone: '+1 555 0100',
    },
  },
};

describe('CvList', () => {
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

  it('loads and displays CVs', async () => {
    mockListCvs.mockResolvedValue([sampleCv]);

    renderCvList();

    const titleLink = await screen.findByRole('link', { name: 'Engineer CV' });
    expect(titleLink).toHaveAttribute('href', '/dashboard/cv/cv-1');
  });

  it('renders a thumbnail per card with the CV template id', async () => {
    mockListCvs.mockResolvedValue([sampleCv]);

    const { container } = renderCvList();

    await waitFor(() => {
      expect(screen.getByText('Engineer CV')).toBeInTheDocument();
    });

    const thumbnails = container.querySelectorAll('[data-template]');
    expect(thumbnails).toHaveLength(1);
    expect(thumbnails[0]).toHaveAttribute('data-template', 'classic');
  });

  it('exposes a dedicated Preview button per card', async () => {
    mockListCvs.mockResolvedValue([sampleCv]);

    renderCvList();

    const previewLink = await screen.findByRole('link', { name: 'Preview Engineer CV' });
    expect(previewLink).toHaveAttribute('href', '/dashboard/cv/cv-1/preview');
  });

  it('opens a 3-dots menu with Export PDF, Export JSON Resume, and Delete actions (no Edit)', async () => {
    const user = userEvent.setup();
    mockListCvs.mockResolvedValue([sampleCv]);

    renderCvList();

    const menuTrigger = await screen.findByRole('button', { name: 'Open actions for Engineer CV' });
    await user.click(menuTrigger);

    expect(await screen.findByRole('menuitem', { name: /Export PDF/ })).toBeInTheDocument();
    expect(await screen.findByRole('menuitem', { name: /Export JSON Resume/ })).toBeInTheDocument();
    expect(await screen.findByRole('menuitem', { name: /^Delete$/ })).toBeInTheDocument();

    // The editor link is already exposed as the card's title and thumbnail,
    // so the dropdown should not duplicate it.
    expect(screen.queryByRole('menuitem', { name: /^Edit$/ })).not.toBeInTheDocument();
  });

  it('opens the delete confirmation dialog from the actions menu', async () => {
    const user = userEvent.setup();
    mockListCvs.mockResolvedValue([sampleCv]);
    mockDeleteCv.mockResolvedValue(undefined);

    renderCvList();

    const menuTrigger = await screen.findByRole('button', { name: 'Open actions for Engineer CV' });
    await user.click(menuTrigger);

    const deleteItem = await screen.findByRole('menuitem', { name: /Delete/ });
    await user.click(deleteItem);

    // Dialog opens with the CV title in the description and a destructive
    // confirm button.
    await screen.findByRole('heading', { name: 'Delete CV?' });
    expect(screen.getByText(/"Engineer CV" will be permanently removed\./)).toBeInTheDocument();
    const confirmButton = screen.getByRole('button', { name: 'Delete' });
    expect(confirmButton).toBeInTheDocument();
    expect(confirmButton).not.toBeDisabled();

    // Cancel keeps the dialog open and does not delete.
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(mockDeleteCv).not.toHaveBeenCalled();
    });
  });

  it('splits the structured basics into a name title and label subtitle', async () => {
    mockListCvs.mockResolvedValue([sampleCvWithBasics]);

    renderCvList();

    // The name is the linkable title, the label is a muted subtitle.
    const nameLink = await screen.findByRole('link', { name: 'Yorty Ruiz Hernández' });
    expect(nameLink).toHaveAttribute('href', '/dashboard/cv/cv-2');
    expect(nameLink).toHaveClass('text-xl', 'font-semibold');

    expect(screen.getByText('Python Backend Engineer')).toBeInTheDocument();
  });

  it('renders only the email in the contact row (email wins over url/phone)', async () => {
    mockListCvs.mockResolvedValue([sampleCvWithBasics]);

    renderCvList();

    // The list is async; wait for the data to render.
    expect(await screen.findByText('yorty.ruiz@gmail.com')).toBeInTheDocument();
    // Phone and url are intentionally hidden to keep the card compact.
    expect(screen.queryByText('+1 365 833 4392')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'linkedin.com/in/yorty' })).not.toBeInTheDocument();
  });

  it('falls back to the url in the contact row when email is missing', async () => {
    mockListCvs.mockResolvedValue([sampleCvUrlOnly]);

    renderCvList();

    const urlLink = await screen.findByRole('link', { name: 'linkedin.com/in/url-only' });
    expect(urlLink).toHaveAttribute('href', 'https://www.linkedin.com/in/url-only');
    expect(screen.queryByText('+1 555 0100')).not.toBeInTheDocument();
  });

  it('falls back to the phone in the contact row when email and url are missing', async () => {
    mockListCvs.mockResolvedValue([sampleCvPhoneOnly]);

    renderCvList();

    expect(await screen.findByText('+1 555 0100')).toBeInTheDocument();
  });

  it('falls back to the cv.title when no basics are present', async () => {
    mockListCvs.mockResolvedValue([sampleCv]);

    renderCvList();

    const titleLink = await screen.findByRole('link', { name: 'Engineer CV' });
    expect(titleLink).toBeInTheDocument();
    // No subtitle label is rendered when there is no structured basics.
    expect(screen.queryByText('Python Backend Engineer')).not.toBeInTheDocument();
  });

  it('downloads the PDF when the Export PDF menu item is clicked', async () => {
    const user = userEvent.setup();
    mockListCvs.mockResolvedValue([sampleCv]);
    const pdfBlob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    mockDownloadCvPdf.mockResolvedValue({ blob: pdfBlob, filename: 'engineer-cv.pdf' });

    renderCvList();

    const menuTrigger = await screen.findByRole('button', { name: 'Open actions for Engineer CV' });
    await user.click(menuTrigger);

    await user.click(await screen.findByRole('menuitem', { name: /Export PDF/ }));

    await waitFor(() => {
      expect(mockDownloadCvPdf).toHaveBeenCalledWith('cv-1');
    });
    expect(mockTriggerBrowserDownload).toHaveBeenCalledWith(pdfBlob, 'engineer-cv.pdf');
    expect(mockDownloadCvJson).not.toHaveBeenCalled();
  });

  it('downloads the JSON Resume when the Export JSON Resume menu item is clicked', async () => {
    const user = userEvent.setup();
    mockListCvs.mockResolvedValue([sampleCv]);
    const jsonBlob = new Blob(['{"basics":{}}'], { type: 'application/json' });
    mockDownloadCvJson.mockResolvedValue({ blob: jsonBlob, filename: 'engineer-cv.json' });

    renderCvList();

    const menuTrigger = await screen.findByRole('button', { name: 'Open actions for Engineer CV' });
    await user.click(menuTrigger);

    await user.click(await screen.findByRole('menuitem', { name: /Export JSON Resume/ }));

    await waitFor(() => {
      expect(mockDownloadCvJson).toHaveBeenCalledWith('cv-1');
    });
    expect(mockTriggerBrowserDownload).toHaveBeenCalledWith(jsonBlob, 'engineer-cv.json');
    expect(mockDownloadCvPdf).not.toHaveBeenCalled();
  });

  it('shows an error toast when the export request fails', async () => {
    const user = userEvent.setup();
    const { toast } = await import('sonner');
    mockListCvs.mockResolvedValue([sampleCv]);
    mockDownloadCvPdf.mockRejectedValue(new Error('PDF export is temporarily unavailable'));

    renderCvList();

    const menuTrigger = await screen.findByRole('button', { name: 'Open actions for Engineer CV' });
    await user.click(menuTrigger);

    await user.click(await screen.findByRole('menuitem', { name: /Export PDF/ }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('PDF export is temporarily unavailable');
    });
  });
});
