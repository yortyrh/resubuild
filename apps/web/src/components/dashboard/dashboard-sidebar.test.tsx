// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar';
import { DashboardSidebarProvider } from '@/components/dashboard/dashboard-sidebar-context';
import { createQueryWrapper } from '@/lib/queries/test-utils';

const mockPathname = vi.fn<() => string | null>(() => '/dashboard');

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

vi.mock('@/components/landing/logo-vectorized.svg', () => ({
  default: '/logo.svg',
}));

vi.mock('@/lib/queries/auth-mutations', () => ({
  useLogout: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/lib/queries/auth-queries', () => ({
  useAuthMe: () => ({ data: undefined }),
}));

function Providers({ children }: { children: ReactNode }) {
  const QueryWrapper = createQueryWrapper();
  return (
    <QueryWrapper>
      <DashboardSidebarProvider>{children}</DashboardSidebarProvider>
    </QueryWrapper>
  );
}

describe('DashboardSidebar', () => {
  beforeEach(() => {
    mockPathname.mockReturnValue('/dashboard');
  });

  afterEach(() => {
    cleanup();
    mockPathname.mockReset();
  });

  function renderSidebar() {
    return render(<DashboardSidebar />, { wrapper: Providers });
  }

  it('renders the logo link to /dashboard', () => {
    renderSidebar();

    const logo = screen.getByRole('link', { name: /Resubuild/i });
    expect(logo).toHaveAttribute('href', '/dashboard');
  });

  it('renders primary nav and user menu', () => {
    renderSidebar();

    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /My CVs/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Applications/ })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Settings' })).not.toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'User menu' })).toBeInTheDocument();
  });

  it('does not render CV section nav in the sidebar (lives in the editor)', () => {
    mockPathname.mockReturnValue('/dashboard/cv/cv-1/work');
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: query === '(max-width: 767px)',
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    });
    renderSidebar();

    expect(screen.queryByRole('navigation', { name: 'CV sections' })).not.toBeInTheDocument();
  });

  it('does not render CV section nav outside the CV editor', () => {
    mockPathname.mockReturnValue('/dashboard/applications');
    renderSidebar();

    expect(screen.queryByRole('navigation', { name: 'CV sections' })).not.toBeInTheDocument();
  });

  it('calls onNavClick when a primary nav link is clicked', () => {
    const onNavClick = vi.fn();
    render(<DashboardSidebar onNavClick={onNavClick} />, { wrapper: Providers });

    const cvsLink = screen.getByRole('link', { name: /My CVs/ });
    cvsLink.click();

    expect(onNavClick).toHaveBeenCalled();
  });
});
