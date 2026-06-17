// @vitest-environment jsdom
import type { CvTemplatePresentationConfig } from '@resubuild/resume-template';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CvPreviewClient } from './cv-preview-client';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/components/cv/use-application-for-cv', () => ({
  useApplicationForCv: vi.fn(() => null),
}));

vi.mock('@/lib/api', () => ({
  getCv: vi.fn(),
  getCvExportHtml: vi.fn(),
  downloadCvPdf: vi.fn(),
  downloadCvJson: vi.fn(),
  listCvTemplates: vi.fn(),
  updateCvTemplate: vi.fn(),
  getCvTemplatePresentation: vi.fn(),
  updateCvTemplatePresentation: vi.fn(),
}));

vi.mock('@/lib/cv-preview-resume', () => ({
  fetchCvResumeForPreview: vi.fn(),
}));

vi.mock('@resubuild/resume-template', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@resubuild/resume-template')>();
  return {
    ...actual,
    renderResumeHtml: vi.fn(() => '<html><body>Jane Doe</body></html>'),
  };
});

import { renderResumeHtml } from '@resubuild/resume-template';
import { useApplicationForCv } from '@/components/cv/use-application-for-cv';
import {
  downloadCvJson,
  downloadCvPdf,
  getCv,
  getCvExportHtml,
  getCvTemplatePresentation,
  listCvTemplates,
  updateCvTemplate,
  updateCvTemplatePresentation,
} from '@/lib/api';
import { fetchCvResumeForPreview } from '@/lib/cv-preview-resume';

const templates = [
  {
    id: 'classic',
    label: 'Classic',
    description: 'Default',
    category: 'default',
  },
  {
    id: 'modern',
    label: 'Modern',
    description: 'Design layout',
    category: 'design',
  },
];

const defaultPresentation: CvTemplatePresentationConfig = {
  sectionOrder: ['summary', 'work', 'education', 'skills'],
  hiddenSections: [],
  sectionLabels: {},
  basicsFields: {
    label: true,
    location: true,
    phone: true,
    email: true,
    url: true,
    profiles: true,
    image: false,
  },
  workFields: { location: true, summary: true, highlights: true, url: true },
  volunteerFields: { location: true, summary: true, highlights: true, url: true },
  educationFields: { score: true, courses: true, url: true },
  projectFields: {
    entity: true,
    type: true,
    roles: true,
    description: true,
    highlights: true,
    keywords: true,
    url: true,
  },
  skillsFields: { level: true },
  awardsFields: { awarder: true, summary: true },
  publicationsFields: { publisher: true, summary: true },
  certificatesFields: { issuer: true },
  interestsFields: { keywords: true },
  leadershipVolunteer: false,
};

function mockViewport(isDesktop: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(min-width: 1024px)' ? isDesktop : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('CvPreviewClient', () => {
  beforeEach(() => {
    mockViewport(true);
    vi.mocked(useApplicationForCv).mockReturnValue(null);
    vi.mocked(getCv).mockResolvedValue({
      id: 'cv-1',
      user_id: 'u1',
      title: 'Jane',
      templateId: 'classic',
      data: { basics: { name: 'Jane Doe', label: 'Engineer' } },
      created_at: 'c',
      updated_at: 'u',
    });
    vi.mocked(listCvTemplates).mockResolvedValue(templates);
    vi.mocked(getCvTemplatePresentation).mockResolvedValue({
      templateId: 'classic',
      config: defaultPresentation,
    });
    vi.mocked(updateCvTemplate).mockResolvedValue({
      id: 'cv-1',
      user_id: 'u1',
      title: 'Jane',
      templateId: 'modern',
      data: {},
      created_at: 'c',
      updated_at: 'u',
    });
    vi.mocked(fetchCvResumeForPreview).mockResolvedValue({ basics: { name: 'Jane Doe' } });
    vi.mocked(getCvExportHtml).mockResolvedValue('<html><body>Jane Doe</body></html>');
    vi.mocked(updateCvTemplatePresentation).mockResolvedValue({
      templateId: 'classic',
      config: defaultPresentation,
    });
    vi.mocked(downloadCvPdf).mockResolvedValue({
      blob: new Blob(['pdf'], { type: 'application/pdf' }),
      filename: 'jane-doe.pdf',
    });
    vi.mocked(downloadCvJson).mockResolvedValue({
      blob: new Blob(['{}'], { type: 'application/json' }),
      filename: 'jane-doe.json',
    });
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('loads export html and wires toolbar actions', async () => {
    const iframePrint = vi.fn();
    render(<CvPreviewClient cvId="cv-1" />);

    expect(screen.getByLabelText('Loading breadcrumb')).toBeInTheDocument();

    await waitFor(
      () => {
        expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
      },
      { timeout: 10_000 },
    );
    expect(screen.queryByLabelText('Loading breadcrumb')).not.toBeInTheDocument();

    await waitFor(
      () => {
        expect(screen.getByTitle('Resume preview')).toBeInTheDocument();
      },
      { timeout: 10_000 },
    );
    expect(fetchCvResumeForPreview).toHaveBeenCalledWith('cv-1');
    expect(renderResumeHtml).toHaveBeenCalled();

    const iframe = screen.getByTitle('Resume preview') as HTMLIFrameElement;
    Object.defineProperty(iframe, 'contentWindow', {
      value: { focus: vi.fn(), print: iframePrint },
      configurable: true,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Print' }));
    expect(iframePrint).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'PDF' }));
    await waitFor(
      () => {
        expect(downloadCvPdf).toHaveBeenCalledWith('cv-1', 'classic');
      },
      { timeout: 10_000 },
    );

    fireEvent.click(screen.getByRole('button', { name: 'JSON Resume' }));
    await waitFor(
      () => {
        expect(downloadCvJson).toHaveBeenCalledWith('cv-1');
      },
      { timeout: 10_000 },
    );

    expect(screen.getByRole('link', { name: 'Back to editor' })).toHaveAttribute(
      'href',
      '/dashboard/cv/cv-1',
    );
  });

  it('links back to the application workspace when opened from an application', async () => {
    vi.mocked(useApplicationForCv).mockReturnValue({
      id: 'app-1',
      status: 'ready',
      tailoredCvId: 'cv-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    render(<CvPreviewClient cvId="cv-1" />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Back to application' })).toHaveAttribute(
        'href',
        '/dashboard/applications/app-1',
      );
    });
  });

  it('template change triggers refetch with new query param', async () => {
    render(<CvPreviewClient cvId="cv-1" />);

    await waitFor(() => {
      expect(fetchCvResumeForPreview).toHaveBeenCalledWith('cv-1');
    });

    fireEvent.change(screen.getByLabelText('Template'), { target: { value: 'modern' } });

    await waitFor(() => {
      expect(updateCvTemplate).toHaveBeenCalledWith('cv-1', 'modern');
      expect(renderResumeHtml).toHaveBeenCalledWith(
        expect.objectContaining({ basics: { name: 'Jane Doe' } }),
        'modern',
        expect.objectContaining({ presentationConfig: defaultPresentation }),
      );
    });
  });

  it('shows user-visible message when JSON export fails', async () => {
    vi.mocked(downloadCvJson).mockRejectedValue(new Error('Request failed (500)'));
    render(<CvPreviewClient cvId="cv-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'JSON Resume' })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'JSON Resume' }));

    await waitFor(() => {
      expect(screen.getByText('Request failed (500)')).toBeInTheDocument();
    });
  });

  it('shows user-visible message when PDF export returns 503', async () => {
    vi.mocked(downloadCvPdf).mockRejectedValue(
      new Error('PDF export is temporarily unavailable. Try Print instead.'),
    );
    render(<CvPreviewClient cvId="cv-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'PDF' })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'PDF' }));

    await waitFor(() => {
      expect(
        screen.getByText('PDF export is temporarily unavailable. Try Print instead.'),
      ).toBeInTheDocument();
    });
  });

  it('opens the layout panel in a mobile drawer and keeps the toggle visible', async () => {
    mockViewport(false);

    render(<CvPreviewClient cvId="cv-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Show layout panel' })).toBeInTheDocument();
    });

    const toggle = screen.getByRole('button', { name: 'Show layout panel' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls', 'cv-layout-panel-drawer');

    fireEvent.click(toggle);

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByRole('checkbox', { name: 'Show Education section' }),
    ).toBeInTheDocument();

    // The toolbar toggle is aria-hidden while the Sheet dialog owns focus, so query by aria-label.
    const collapsedToggle = screen.getByLabelText('Hide layout panel');
    expect(collapsedToggle).toHaveAttribute('aria-expanded', 'true');
    expect(collapsedToggle).toHaveAttribute('aria-controls', 'cv-layout-panel-drawer');
  });

  it('does not render the inline layout panel on mobile', () => {
    mockViewport(false);

    render(<CvPreviewClient cvId="cv-1" />);

    expect(document.getElementById('cv-layout-panel')).toBeNull();
  });

  it('opens the layout panel in a drawer on tablet-sized viewports (768–1023px)', async () => {
    mockViewport(false);

    render(<CvPreviewClient cvId="cv-1" />);

    // Below the `lg` breakpoint the inline panel is hidden by Tailwind, so the
    // toggle must drive the drawer — otherwise the button is a silent no-op.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Show layout panel' })).toBeInTheDocument();
    });

    const toggle = screen.getByRole('button', { name: 'Show layout panel' });
    expect(toggle).toHaveAttribute('aria-controls', 'cv-layout-panel-drawer');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById('cv-layout-panel')).toBeNull();

    fireEvent.click(toggle);

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByRole('checkbox', { name: 'Show Education section' }),
    ).toBeInTheDocument();

    const expandedToggle = screen.getByLabelText('Hide layout panel');
    expect(expandedToggle).toHaveAttribute('aria-controls', 'cv-layout-panel-drawer');
    expect(expandedToggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders the inline layout panel on desktop and toggles via the visible button', async () => {
    mockViewport(true);

    render(<CvPreviewClient cvId="cv-1" />);

    await waitFor(() => {
      expect(document.getElementById('cv-layout-panel')).toBeInTheDocument();
    });

    const toggle = screen.getByRole('button', { name: 'Hide layout panel' });
    expect(toggle).toHaveAttribute('aria-controls', 'cv-layout-panel');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(document.getElementById('cv-layout-panel')).toBeNull();
    });
    expect(screen.getByRole('button', { name: 'Show layout panel' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('hides the "Template" label below sm but keeps the select accessible', () => {
    mockViewport(false);

    render(<CvPreviewClient cvId="cv-1" />);

    const label = screen.getByText('Template');
    expect(label).toHaveClass('hidden');
    expect(label).toHaveClass('sm:inline');

    const select = screen.getByLabelText('Template');
    expect(select).toBeInTheDocument();
  });
});
