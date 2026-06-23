// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardSidebarProvider, useDashboardSidebar } from './dashboard-sidebar-context';

const MOBILE_QUERY = '(max-width: 767px)';
const TABLET_QUERY = '(min-width: 768px) and (max-width: 1023px)';

const mockPathname = vi.fn<() => string | null>(() => '/dashboard');

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

type Viewport = 'mobile' | 'tablet' | 'desktop';

interface FakeMql {
  matches: boolean;
  media: string;
  addEventListener: (event: string, listener: (event: { matches: boolean }) => void) => void;
  removeEventListener: (event: string, listener: (event: { matches: boolean }) => void) => void;
}

let mobileMql: FakeMql;
let tabletMql: FakeMql;
const mobileListeners = new Set<(event: { matches: boolean }) => void>();
const tabletListeners = new Set<(event: { matches: boolean }) => void>();

function matchQuery(viewport: Viewport, query: string): boolean {
  if (query === MOBILE_QUERY) return viewport === 'mobile';
  if (query === TABLET_QUERY) return viewport === 'tablet';
  return viewport === 'desktop';
}

function mockViewport(viewport: Viewport) {
  mobileMql = {
    matches: viewport === 'mobile',
    media: MOBILE_QUERY,
    addEventListener: (_event, listener) => {
      mobileListeners.add(listener);
    },
    removeEventListener: (_event, listener) => {
      mobileListeners.delete(listener);
    },
  };
  tabletMql = {
    matches: viewport === 'tablet',
    media: TABLET_QUERY,
    addEventListener: (_event, listener) => {
      tabletListeners.add(listener);
    },
    removeEventListener: (_event, listener) => {
      tabletListeners.delete(listener);
    },
  };
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => {
      if (query === MOBILE_QUERY) return mobileMql;
      if (query === TABLET_QUERY) return tabletMql;
      return {
        matches: matchQuery(viewport, query),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      };
    },
  });
  return {
    setViewport(next: Viewport) {
      const nextMobile = next === 'mobile';
      const nextTablet = next === 'tablet';
      const fireMobile = mobileMql.matches !== nextMobile;
      const fireTablet = tabletMql.matches !== nextTablet;
      mobileMql.matches = nextMobile;
      tabletMql.matches = nextTablet;
      if (fireMobile) {
        for (const listener of mobileListeners) listener({ matches: nextMobile });
      }
      if (fireTablet) {
        for (const listener of tabletListeners) listener({ matches: nextTablet });
      }
    },
  };
}

function clearListeners() {
  mobileListeners.clear();
  tabletListeners.clear();
}

describe('DashboardSidebarProvider', () => {
  beforeEach(() => {
    mockPathname.mockReturnValue('/dashboard');
  });

  afterEach(() => {
    window.localStorage.clear();
    clearListeners();
    mockPathname.mockReset();
    mockPathname.mockReturnValue('/dashboard');
  });

  it('defaults to the sidebar mode on desktop', async () => {
    mockViewport('desktop');
    const { result } = renderHook(() => useDashboardSidebar(), {
      wrapper: DashboardSidebarProvider,
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.mode).toBe('sidebar');
    expect(result.current.collapsed).toBe(false);
  });

  it('defaults to icons on tablet (768–1023px)', async () => {
    mockViewport('tablet');
    const { result } = renderHook(() => useDashboardSidebar(), {
      wrapper: DashboardSidebarProvider,
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.mode).toBe('icons');
    expect(result.current.collapsed).toBe(true);
  });

  it('uses the drawer mode on mobile (<768px)', async () => {
    mockViewport('mobile');
    const { result } = renderHook(() => useDashboardSidebar(), {
      wrapper: DashboardSidebarProvider,
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.mode).toBe('drawer');
  });

  it('defaults to icons on desktop when the CV editor route is active', async () => {
    mockViewport('desktop');
    mockPathname.mockReturnValue('/dashboard/cv/cv-1/work');
    const { result } = renderHook(() => useDashboardSidebar(), {
      wrapper: DashboardSidebarProvider,
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.mode).toBe('sidebar');
    expect(result.current.collapsed).toBe(true);
  });

  it('defaults to icons on desktop when the CV preview route is active', async () => {
    mockViewport('desktop');
    mockPathname.mockReturnValue('/dashboard/cv/cv-1/preview');
    const { result } = renderHook(() => useDashboardSidebar(), {
      wrapper: DashboardSidebarProvider,
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.collapsed).toBe(true);
  });

  it('defaults to icons on desktop for the CV basics route', async () => {
    mockViewport('desktop');
    mockPathname.mockReturnValue('/dashboard/cv/cv-1');
    const { result } = renderHook(() => useDashboardSidebar(), {
      wrapper: DashboardSidebarProvider,
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.collapsed).toBe(true);
  });

  it('keeps the expanded default on dashboard sub-routes that are not CV editor', async () => {
    mockViewport('desktop');
    mockPathname.mockReturnValue('/dashboard/applications');
    const { result } = renderHook(() => useDashboardSidebar(), {
      wrapper: DashboardSidebarProvider,
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.collapsed).toBe(false);
  });

  it('resets the toggle state and snaps to the new mode when the viewport changes', async () => {
    const viewport = mockViewport('desktop');
    const { result } = renderHook(() => useDashboardSidebar(), {
      wrapper: DashboardSidebarProvider,
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.collapsed).toBe(false);

    // User collapses the sidebar on desktop.
    act(() => result.current.toggle());
    expect(result.current.collapsed).toBe(true);

    // Resize into the tablet band → icons default, toggle reset.
    await act(async () => {
      viewport.setViewport('tablet');
    });
    expect(result.current.mode).toBe('icons');
    expect(result.current.collapsed).toBe(true);

    // User expands the tablet sidebar.
    act(() => result.current.toggle());
    expect(result.current.collapsed).toBe(false);

    // Resize into the mobile band → drawer, toggle reset.
    await act(async () => {
      viewport.setViewport('mobile');
    });
    expect(result.current.mode).toBe('drawer');

    // Resize back to desktop → full sidebar (not the collapsed toggle from
    // earlier — the toggle was reset on every viewport change).
    await act(async () => {
      viewport.setViewport('desktop');
    });
    expect(result.current.mode).toBe('sidebar');
    expect(result.current.collapsed).toBe(false);
  });

  it('resets the toggle when navigating between a CV editor route and a non-CV route', async () => {
    mockViewport('desktop');
    mockPathname.mockReturnValue('/dashboard');
    const { result, rerender } = renderHook(() => useDashboardSidebar(), {
      wrapper: DashboardSidebarProvider,
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.collapsed).toBe(false);

    // Navigate to a CV editor route → desktop should snap to icons.
    await act(async () => {
      mockPathname.mockReturnValue('/dashboard/cv/cv-1/work');
      rerender();
    });
    expect(result.current.collapsed).toBe(true);

    // User expands the sidebar on the CV editor route.
    act(() => result.current.toggle());
    expect(result.current.collapsed).toBe(false);

    // Navigate back to a non-CV route → desktop should snap back to expanded,
    // ignoring the previous toggle (the path-driven default changed).
    await act(async () => {
      mockPathname.mockReturnValue('/dashboard/applications');
      rerender();
    });
    expect(result.current.collapsed).toBe(false);
  });

  it('lets the user toggle within the same CV editor route', async () => {
    mockViewport('desktop');
    mockPathname.mockReturnValue('/dashboard/cv/cv-1/work');
    const { result } = renderHook(() => useDashboardSidebar(), {
      wrapper: DashboardSidebarProvider,
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.collapsed).toBe(true);

    act(() => result.current.toggle());
    expect(result.current.collapsed).toBe(false);

    act(() => result.current.setCollapsed(true));
    expect(result.current.collapsed).toBe(true);
  });

  it('lets the user toggle within the same viewport', async () => {
    mockViewport('tablet');
    const { result } = renderHook(() => useDashboardSidebar(), {
      wrapper: DashboardSidebarProvider,
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.collapsed).toBe(true);

    act(() => result.current.toggle());
    expect(result.current.collapsed).toBe(false);

    act(() => result.current.setCollapsed(true));
    expect(result.current.collapsed).toBe(true);
  });
});
