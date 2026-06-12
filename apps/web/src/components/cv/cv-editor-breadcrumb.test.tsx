// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
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

    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My CVs' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByText('Jane Doe — Senior Software Engineer')).toBeInTheDocument();
    expect(within(nav).queryByText('Basics')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cv-page-title')).not.toBeInTheDocument();
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
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(nav).getByText('Projects')).toBeInTheDocument();
  });

  it('shows the trail-end as a page title on three-level breadcrumbs', () => {
    render(
      <CvEditorBreadcrumb
        cvId="cv-1"
        basics={{ name: 'Jane Doe', label: 'Engineer' }}
        activeSection="volunteer"
      />,
    );

    const title = screen.getByTestId('cv-page-title');
    expect(title.tagName).toBe('H1');
    expect(title).toHaveTextContent('Volunteer');
    expect(title).toHaveClass('text-2xl', 'font-semibold');
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
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(nav).getByText('Preview')).toBeInTheDocument();
    expect(screen.getByTestId('cv-page-title')).toHaveTextContent('Preview');
  });
});
