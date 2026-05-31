// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CvApplicationEditorBreadcrumb } from './cv-application-editor-breadcrumb';

const application = {
  id: 'app-1',
  status: 'ready' as const,
  jobTitle: 'Engineering Manager',
  jobCompany: 'Acme',
  tailoredCvId: 'clone-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('CvApplicationEditorBreadcrumb', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows application label on the basics section without My CVs trail', () => {
    render(<CvApplicationEditorBreadcrumb application={application} activeSection="basics" />);

    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'My CVs' })).not.toBeInTheDocument();
    expect(screen.getByTitle('Engineering Manager · Acme')).toBeInTheDocument();
  });

  it('links back to the application workspace on section routes', () => {
    render(<CvApplicationEditorBreadcrumb application={application} activeSection="work" />);

    expect(screen.getByRole('link', { name: /Engineering Manager/i })).toHaveAttribute(
      'href',
      '/dashboard/applications/app-1',
    );
    expect(screen.getByText('Work')).toBeInTheDocument();
  });

  it('renders preview trail with Edit CV link before Preview', () => {
    render(
      <CvApplicationEditorBreadcrumb
        application={application}
        cvId="clone-1"
        pageLabel="Preview"
      />,
    );

    expect(screen.getByRole('link', { name: /Engineering Manager/i })).toHaveAttribute(
      'href',
      '/dashboard/applications/app-1',
    );
    expect(screen.getByRole('link', { name: 'Edit CV' })).toHaveAttribute(
      'href',
      '/dashboard/cv/clone-1',
    );
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });
});
