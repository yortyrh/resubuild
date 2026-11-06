// @vitest-environment jsdom
import { act, cleanup, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetCv = vi.fn();
const setBreadcrumb = vi.fn();
const resetBreadcrumb = vi.fn();
const editorState = vi.hoisted(() => ({ mountedSection: 'work' as string | null }));

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/cv/cv-1/work',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/components/cv/cv-editor-provider', () => ({
  useCvEditor: () => ({
    cvId: 'cv-1',
    mountedSection: editorState.mountedSection,
    setMountedSection: vi.fn(),
  }),
}));

vi.mock('@/components/dashboard/dashboard-breadcrumb-context', () => ({
  useDashboardBreadcrumb: () => ({
    variant: 'default',
    setBreadcrumb,
    reset: resetBreadcrumb,
  }),
}));

vi.mock('@/components/cv/use-application-for-cv', () => ({
  useApplicationForCv: () => null,
}));

vi.mock('@/components/cv/cv-section-nav-links', () => ({
  CvSectionNav: () => null,
}));

vi.mock('@/components/cv/cv-editor-header-actions', () => ({
  CvEditorHeaderActions: () => null,
}));

vi.mock('@/components/cv/cv-application-promote-button', () => ({
  CvApplicationPromoteButton: () => null,
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    getCv: (...args: unknown[]) => mockGetCv(...args),
  };
});

import { cvKeys } from '@/lib/queries/keys';
import { renderWithQueryClient } from '@/lib/queries/test-utils';
import { CvEditorChrome } from './cv-editor-chrome';

const cvRecord = {
  id: 'cv-1',
  user_id: 'u1',
  title: 'Engineer CV',
  templateId: 'modern',
  data: { basics: { name: 'Jane Doe', label: 'Engineer' } },
  created_at: 'c',
  updated_at: 'u',
};

function renderChrome() {
  return renderWithQueryClient(
    <CvEditorChrome cvId="cv-1">
      <p>Section body</p>
    </CvEditorChrome>,
  );
}

describe('CvEditorChrome', () => {
  beforeEach(() => {
    editorState.mountedSection = 'work';
    mockGetCv.mockReset();
    setBreadcrumb.mockReset();
    resetBreadcrumb.mockReset();
  });

  afterEach(() => cleanup());

  it('shows the section skeleton and hides the section while the CV header loads', () => {
    mockGetCv.mockReturnValue(new Promise(() => undefined));

    renderChrome();

    expect(screen.getByRole('status', { name: 'Loading section' })).toBeInTheDocument();
    expect(screen.queryByText('Section body')).not.toBeVisible();
    expect(setBreadcrumb).toHaveBeenLastCalledWith(
      expect.objectContaining({ variant: 'cv', cvId: 'cv-1', basics: null }),
    );
  });

  it('loads the CV header itself and shows the section once loaded', async () => {
    mockGetCv.mockResolvedValue(cvRecord);

    renderChrome();

    await waitFor(() =>
      expect(screen.queryByRole('status', { name: 'Loading section' })).not.toBeInTheDocument(),
    );
    expect(mockGetCv).toHaveBeenCalledWith('cv-1');
    expect(screen.getByText('Section body')).toBeVisible();
  });

  it('puts the CV basics in the breadcrumb', async () => {
    mockGetCv.mockResolvedValue(cvRecord);

    renderChrome();

    await waitFor(() =>
      expect(setBreadcrumb).toHaveBeenLastCalledWith(
        expect.objectContaining({
          variant: 'cv',
          cvId: 'cv-1',
          basics: { name: 'Jane Doe', label: 'Engineer' },
          activeSection: 'work',
        }),
      ),
    );
  });

  it('shows the load error instead of the section', async () => {
    mockGetCv.mockRejectedValue(new Error('CV not found'));

    renderChrome();

    expect(await screen.findByText('CV not found', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.queryByText('Section body')).not.toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Loading section' })).not.toBeInTheDocument();
  });

  it('keeps the section visible while the CV header reloads', async () => {
    mockGetCv.mockResolvedValueOnce(cvRecord).mockReturnValue(new Promise(() => undefined));

    const { queryClient } = renderChrome();
    await waitFor(() => expect(screen.getByText('Section body')).toBeVisible());

    act(() => {
      void queryClient.invalidateQueries({ queryKey: cvKeys.detail('cv-1') });
    });

    await waitFor(() => expect(mockGetCv).toHaveBeenCalledTimes(2));
    expect(screen.getByText('Section body')).toBeVisible();
    expect(screen.queryByRole('status', { name: 'Loading section' })).not.toBeInTheDocument();
  });

  it('covers the previous section with a skeleton while navigating', async () => {
    editorState.mountedSection = 'skills';
    mockGetCv.mockResolvedValue(cvRecord);

    renderChrome();
    await waitFor(() => expect(mockGetCv).toHaveBeenCalled());

    expect(screen.getByRole('status', { name: 'Loading section' })).toBeInTheDocument();
  });
});
