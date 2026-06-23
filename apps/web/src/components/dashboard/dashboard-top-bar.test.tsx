// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DashboardBreadcrumbProvider,
  useDashboardBreadcrumb,
} from './dashboard-breadcrumb-context';
import { DashboardSidebarProvider } from './dashboard-sidebar-context';
import { DashboardTopBar } from './dashboard-top-bar';

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

function mockMatchMedia(isMobile: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches:
        query === '(max-width: 767px)'
          ? isMobile
          : query === '(min-width: 768px) and (max-width: 1023px)'
            ? false
            : !isMobile,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
}

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <DashboardBreadcrumbProvider>
      <DashboardSidebarProvider>{children}</DashboardSidebarProvider>
    </DashboardBreadcrumbProvider>
  );
}

function CvBreadcrumbSetter({ cvId }: { cvId: string }) {
  const { setBreadcrumb } = useDashboardBreadcrumb();
  useEffect(() => {
    setBreadcrumb({
      variant: 'cv',
      cvId,
      basics: { name: 'Yorty Ruiz', label: 'Python Backend Engineer' },
      activeSection: 'profiles',
      pageLabel: 'Preview',
    });
  }, [setBreadcrumb, cvId]);
  return null;
}

function ApplicationBreadcrumbSetter() {
  const { setBreadcrumb } = useDashboardBreadcrumb();
  useEffect(() => {
    setBreadcrumb({
      variant: 'application',
      application: {
        id: 'app-1',
        status: 'ready',
        jobTitle: 'Senior Engineer',
        jobCompany: 'United Software Group Inc',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    });
  }, [setBreadcrumb]);
  return null;
}

describe('DashboardTopBar', () => {
  afterEach(() => {
    cleanup();
    mockPathname.mockReset();
    mockPathname.mockReturnValue('/dashboard');
    window.localStorage.clear();
  });

  it('shows the dashboard breadcrumb on non-CV routes', () => {
    mockMatchMedia(false);
    render(<DashboardTopBar />, { wrapper: Providers });
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent('Dashboard');
  });

  it('renders a sidebar toggle button on tablet/desktop', () => {
    mockMatchMedia(false);
    render(<DashboardTopBar />, { wrapper: Providers });

    expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeInTheDocument();
  });

  it('defaults the dashboard sidebar to icons on a CV editor route on desktop', () => {
    mockMatchMedia(false);
    mockPathname.mockReturnValue('/dashboard/cv/cv-1/work');
    render(<DashboardTopBar />, { wrapper: Providers });

    // On a CV editor route the dashboard sidebar opens in icons mode even
    // on desktop (the page already has its own section sidebar).
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument();
  });

  it('renders only a show-menu button on mobile', async () => {
    mockMatchMedia(true);
    render(<DashboardTopBar />, { wrapper: Providers });

    expect(screen.getByRole('button', { name: 'Show menu' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Resubuild/i })).not.toBeInTheDocument();

    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await user.click(screen.getByRole('button', { name: 'Show menu' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('link', { name: /My CVs/ })).toBeInTheDocument();
  });

  it('renders the rich CV breadcrumb when the page registers CV data', async () => {
    mockMatchMedia(false);
    mockPathname.mockReturnValue('/dashboard/cv/cv-1/preview');
    render(
      <Providers>
        <DashboardTopBar />
        <CvBreadcrumbSetter cvId="cv-1" />
      </Providers>,
    );

    // The breadcrumb nav now contains the rich breadcrumb with the CV title
    // and the Preview trail segment.
    const breadcrumb = await screen.findByRole('navigation', { name: 'Breadcrumb' });
    expect(breadcrumb).toHaveTextContent('Yorty Ruiz');
    expect(breadcrumb).toHaveTextContent('Preview');
  });

  it('renders the company name as the application breadcrumb trail', async () => {
    mockMatchMedia(false);
    mockPathname.mockReturnValue('/dashboard/applications/app-1');
    render(
      <Providers>
        <DashboardTopBar />
        <ApplicationBreadcrumbSetter />
      </Providers>,
    );

    const breadcrumb = await screen.findByRole('navigation', { name: 'Breadcrumb' });
    expect(breadcrumb).toHaveTextContent('Dashboard');
    expect(breadcrumb).toHaveTextContent('Applications');
    expect(breadcrumb).toHaveTextContent('United Software Group Inc');
    expect(within(breadcrumb).getByRole('link', { name: 'Applications' })).toHaveAttribute(
      'href',
      '/dashboard/applications',
    );
  });
});
