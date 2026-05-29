// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CvEditorBreadcrumb } from './cv-editor-breadcrumb';

describe('CvEditorBreadcrumb', () => {
  afterEach(() => {
    cleanup();
  });

  it('uses the full title on larger screens and the name only on smaller screens', () => {
    render(
      <CvEditorBreadcrumb
        cvId="cv-1"
        basics={{ name: 'Jane Doe', label: 'Senior Software Engineer' }}
        activeSection="basics"
      />,
    );

    expect(screen.getByText('Jane Doe — Senior Software Engineer')).toHaveClass(
      'hidden',
      'sm:inline',
    );
    expect(screen.getByText('Jane Doe')).toHaveClass('sm:hidden');
  });

  it('renders My CVs and the CV title on the basics section', () => {
    render(
      <CvEditorBreadcrumb
        cvId="cv-1"
        basics={{ name: 'Jane Doe', label: 'Senior Software Engineer' }}
        activeSection="basics"
      />,
    );

    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My CVs' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByText('Jane Doe — Senior Software Engineer')).toBeInTheDocument();
    expect(screen.queryByText('Basics')).not.toBeInTheDocument();
  });

  it('renders the active section as the current page on section routes', () => {
    render(
      <CvEditorBreadcrumb
        cvId="cv-1"
        basics={{ name: 'Jane Doe', label: 'Senior Software Engineer' }}
        activeSection="projects"
      />,
    );

    expect(
      screen.getByRole('link', { name: 'Jane Doe — Senior Software Engineer' }),
    ).toHaveAttribute('href', '/dashboard/cv/cv-1');
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  it('styles untitled CVs with muted text on the current page', () => {
    render(<CvEditorBreadcrumb cvId="cv-1" basics={{}} activeSection="basics" />);

    const current = screen.getByText('Untitled CV');
    expect(current).toHaveClass('text-muted-foreground');
  });

  it('renders preview trail with linked CV title', () => {
    render(
      <CvEditorBreadcrumb
        cvId="cv-1"
        basics={{ name: 'Jane Doe', label: 'Engineer' }}
        pageLabel="Preview"
      />,
    );

    expect(screen.getByRole('link', { name: 'Jane Doe — Engineer' })).toHaveAttribute(
      'href',
      '/dashboard/cv/cv-1',
    );
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });
});
