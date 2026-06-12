// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ApplicationWorkspaceBreadcrumb } from './application-workspace-breadcrumb';

describe('ApplicationWorkspaceBreadcrumb', () => {
  afterEach(() => {
    cleanup();
  });

  it('links Applications and shows the current application label', () => {
    render(
      <ApplicationWorkspaceBreadcrumb jobTitle="Engineering Manager" jobCompany="Acme Corp" />,
    );

    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Applications' })).toHaveAttribute(
      'href',
      '/dashboard/applications',
    );
    expect(screen.getAllByText('Engineering Manager').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0);
  });

  it('supports a static page label', () => {
    render(<ApplicationWorkspaceBreadcrumb pageLabel="Preparing application…" />);

    expect(screen.getByText('Preparing application…')).toBeInTheDocument();
  });

  it('hides the trail end when hideTrail is set', () => {
    render(
      <ApplicationWorkspaceBreadcrumb
        jobTitle="Engineering Manager"
        jobCompany="Acme Corp"
        hideTrail
      />,
    );

    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(nav).getByRole('link', { name: 'Applications' })).toHaveAttribute(
      'href',
      '/dashboard/applications',
    );
    expect(within(nav).queryByText('Engineering Manager')).not.toBeInTheDocument();
    expect(within(nav).queryByText('Acme Corp')).not.toBeInTheDocument();
  });
});
