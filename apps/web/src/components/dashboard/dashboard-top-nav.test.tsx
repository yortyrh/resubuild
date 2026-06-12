// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DashboardTopNav } from './dashboard-top-nav';

const mockPathname = vi.fn<(href?: string) => string | null>(() => '/dashboard');

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

describe('DashboardTopNav', () => {
  afterEach(() => {
    cleanup();
    mockPathname.mockReset();
    mockPathname.mockReturnValue('/dashboard');
  });

  function renderNav() {
    return render(<DashboardTopNav />);
  }

  it('renders both top-level entries with icons and accessible names', () => {
    renderNav();

    const nav = screen.getByRole('navigation', { name: 'Primary' });
    const cvsLink = within(nav).getByRole('link', { name: /My CVs/ });
    const appsLink = within(nav).getByRole('link', { name: /Applications/ });

    expect(cvsLink).toHaveAttribute('href', '/dashboard');
    expect(appsLink).toHaveAttribute('href', '/dashboard/applications');
  });

  it('marks My CVs as the current page on the dashboard root', () => {
    mockPathname.mockReturnValue('/dashboard');
    renderNav();

    const cvsLink = screen.getByRole('link', { name: /My CVs/ });
    const appsLink = screen.getByRole('link', { name: /Applications/ });

    expect(cvsLink).toHaveAttribute('aria-current', 'page');
    expect(appsLink).not.toHaveAttribute('aria-current');
  });

  it('marks My CVs as current when inside a CV editor route', () => {
    mockPathname.mockReturnValue('/dashboard/cv/cv-1/volunteer');
    renderNav();

    const cvsLink = screen.getByRole('link', { name: /My CVs/ });
    const appsLink = screen.getByRole('link', { name: /Applications/ });

    expect(cvsLink).toHaveAttribute('aria-current', 'page');
    expect(appsLink).not.toHaveAttribute('aria-current');
  });

  it('marks Applications as current inside the applications workspace', () => {
    mockPathname.mockReturnValue('/dashboard/applications/app-1');
    renderNav();

    const cvsLink = screen.getByRole('link', { name: /My CVs/ });
    const appsLink = screen.getByRole('link', { name: /Applications/ });

    expect(appsLink).toHaveAttribute('aria-current', 'page');
    expect(cvsLink).not.toHaveAttribute('aria-current');
  });
});
