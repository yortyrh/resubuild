// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { NewCvFlowBreadcrumb } from './new-cv-flow-breadcrumb';

describe('NewCvFlowBreadcrumb', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the breadcrumb landmark with a My CVs link to /dashboard and the supplied page label', () => {
    render(<NewCvFlowBreadcrumb pageLabel="Import from file" />);

    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My CVs' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByText('Import from file')).toBeInTheDocument();
  });

  it('marks the current page segment with aria-current="page"', () => {
    render(<NewCvFlowBreadcrumb pageLabel="Create CV" />);

    expect(screen.getByText('Create CV')).toHaveAttribute('aria-current', 'page');
  });

  it('renders a different page label per route', () => {
    const { rerender } = render(<NewCvFlowBreadcrumb pageLabel="Import from URL" />);
    expect(screen.getByText('Import from URL')).toBeInTheDocument();

    rerender(<NewCvFlowBreadcrumb pageLabel="Create CV" />);
    expect(screen.getByText('Create CV')).toBeInTheDocument();
    expect(screen.queryByText('Import from URL')).not.toBeInTheDocument();
  });
});
