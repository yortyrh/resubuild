// @vitest-environment jsdom
import type { CvTemplatePresentationConfig } from '@resumind/resume-template';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CvPreviewClient } from './cv-preview-client';

vi.mock('@/lib/api', () => ({
  getCv: vi.fn(),
  getCvExportHtml: vi.fn(),
  downloadCvPdf: vi.fn(),
  listCvTemplates: vi.fn(),
  updateCvTemplate: vi.fn(),
  getCvTemplatePresentation: vi.fn(),
  updateCvTemplatePresentation: vi.fn(),
}));

vi.mock('@/lib/cv-preview-resume', () => ({
  fetchCvResumeForPreview: vi.fn(),
}));

vi.mock('@resumind/resume-template', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@resumind/resume-template')>();
  return {
    ...actual,
    renderResumeHtml: vi.fn(() => '<html><body>Jane Doe</body></html>'),
  };
});

import { renderResumeHtml } from '@resumind/resume-template';
import {
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
    expect(screen.getByText('Preview')).toBeInTheDocument();

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

    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
    await waitFor(
      () => {
        expect(downloadCvPdf).toHaveBeenCalledWith('cv-1', 'classic');
      },
      { timeout: 10_000 },
    );

    expect(screen.getByRole('link', { name: 'Back to editor' })).toHaveAttribute(
      'href',
      '/dashboard/cv/cv-1',
    );
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

  it('shows user-visible message when PDF export returns 503', async () => {
    vi.mocked(downloadCvPdf).mockRejectedValue(
      new Error('PDF export is temporarily unavailable. Try Print instead.'),
    );
    render(<CvPreviewClient cvId="cv-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Download PDF' })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));

    await waitFor(() => {
      expect(
        screen.getByText('PDF export is temporarily unavailable. Try Print instead.'),
      ).toBeInTheDocument();
    });
  });

  it('keeps preview beside layout panel on small screens when expanded', async () => {
    mockViewport(false);

    render(<CvPreviewClient cvId="cv-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Show layout panel' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Show layout panel' }));

    const iframe = screen.getByTitle('Resume preview');
    const layoutPanel = document.getElementById('cv-layout-panel');
    const previewFrame = iframe.parentElement;
    const row = previewFrame?.parentElement?.parentElement;

    expect(row).toHaveClass('flex');
    expect(layoutPanel).toBeInTheDocument();
    expect(previewFrame).toHaveClass('surface-soft');
    expect(iframe).toHaveClass('border-0');
  });

  it('hides layout panel on small screens until toggled', async () => {
    mockViewport(false);

    render(<CvPreviewClient cvId="cv-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Show layout panel' })).toBeInTheDocument();
    });

    const layoutPanel = document.getElementById('cv-layout-panel');
    const layoutWrapper = layoutPanel?.parentElement?.parentElement;
    expect(layoutWrapper).toHaveClass('hidden');

    const iframe = screen.getByTitle('Resume preview');
    expect(iframe).not.toHaveClass('hidden');

    fireEvent.click(screen.getByRole('button', { name: 'Show layout panel' }));
    expect(layoutWrapper).toHaveClass('block');
    expect(layoutWrapper).not.toHaveClass('hidden');

    fireEvent.click(screen.getByRole('button', { name: 'Hide layout panel' }));
    expect(layoutWrapper).toHaveClass('hidden');
  });
});
