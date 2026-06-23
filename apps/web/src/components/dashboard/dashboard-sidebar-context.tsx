'use client';

import { usePathname } from 'next/navigation';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

const MOBILE_QUERY = '(max-width: 767px)';
const TABLET_QUERY = '(min-width: 768px) and (max-width: 1023px)';

/**
 * The dashboard sidebar adapts to three viewports:
 *
 * - `drawer`  — mobile (<768px). The aside is hidden via CSS and the top
 *   bar's hamburger opens a `Sheet` drawer.
 * - `icons`   — tablet (768–1023px). The aside collapses to an icon-only rail.
 * - `sidebar` — desktop (≥1024px). The aside is fully expanded with labels.
 *
 * On every viewport change the user's toggle override is cleared so the
 * viewport-appropriate default takes over (matching the preview's layout
 * left sidebar).
 */
export type DashboardSidebarMode = 'drawer' | 'icons' | 'sidebar';

interface DashboardSidebarContextValue {
  mode: DashboardSidebarMode;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggle: () => void;
  ready: boolean;
}

const DashboardSidebarContext = createContext<DashboardSidebarContextValue | null>(null);

/**
 * Routes that already render their own dedicated side panel (CV editor
 * sections and the preview) — on those pages the dashboard sidebar opens
 * collapsed even on desktop so the inner panel gets the room it needs.
 */
function shouldForceIconsDefault(pathname: string | null): boolean {
  if (!pathname) return false;
  return /^\/dashboard\/cv\/[^/]+(?:$|\/)/.test(pathname);
}

function computeMode(): DashboardSidebarMode {
  if (typeof window === 'undefined') return 'sidebar';
  if (typeof window.matchMedia !== 'function') return 'sidebar';
  if (window.matchMedia(MOBILE_QUERY).matches) return 'drawer';
  if (window.matchMedia(TABLET_QUERY).matches) return 'icons';
  return 'sidebar';
}

/**
 * Subscribes to both the mobile and tablet breakpoints so the mode flips
 * whenever the viewport crosses either boundary. Mirrors
 * `useInlineLayoutPanelDisplayable` from the preview's layout left sidebar.
 */
function useViewportMode(): DashboardSidebarMode {
  const [mode, setMode] = useState<DashboardSidebarMode>('sidebar');

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return;
    }

    const update = () => {
      setMode(computeMode());
    };

    setMode(computeMode());

    const mqlMobile = window.matchMedia(MOBILE_QUERY);
    const mqlTablet = window.matchMedia(TABLET_QUERY);

    if (typeof mqlMobile.addEventListener === 'function') {
      mqlMobile.addEventListener('change', update);
      mqlTablet.addEventListener('change', update);
      return () => {
        mqlMobile.removeEventListener('change', update);
        mqlTablet.removeEventListener('change', update);
      };
    }

    // Safari < 14 fallback
    mqlMobile.addListener(update);
    mqlTablet.addListener(update);
    return () => {
      mqlMobile.removeListener(update);
      mqlTablet.removeListener(update);
    };
  }, []);

  return mode;
}

export function DashboardSidebarProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [userOverride, setUserOverride] = useState<boolean | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const mode = useViewportMode();
  const previousModeRef = useRef<DashboardSidebarMode | null>(null);
  const previousForceIconsRef = useRef<boolean | null>(null);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const forceIconsDefault = shouldForceIconsDefault(pathname);

  // Reset the toggle state whenever the viewport flips to a different mode
  // (mobile → tablet → desktop, etc.) so the new viewport's default applies.
  useEffect(() => {
    if (previousModeRef.current !== null && previousModeRef.current !== mode) {
      setUserOverride(null);
    }
    previousModeRef.current = mode;
  }, [mode]);

  // Reset the toggle state when navigating between routes that want
  // different defaults (e.g. dashboard list vs. CV editor) — otherwise the
  // user's previous manual choice would silently override the new default.
  useEffect(() => {
    if (
      previousForceIconsRef.current !== null &&
      previousForceIconsRef.current !== forceIconsDefault
    ) {
      setUserOverride(null);
    }
    previousForceIconsRef.current = forceIconsDefault;
  }, [forceIconsDefault]);

  // Tablet always defaults to icons; desktop defaults to icons on routes
  // that already have their own side panel (CV editor + preview).
  const autoCollapsed = mode === 'icons' || (mode === 'sidebar' && forceIconsDefault);

  // On mobile the aside is hidden via CSS, so `collapsed` is not rendered —
  // we still keep a sensible default value for any consumer that reads it.
  const collapsed = mode === 'drawer' ? false : (userOverride ?? autoCollapsed);

  const setCollapsed = useCallback((value: boolean) => {
    setUserOverride(value);
  }, []);

  const toggle = useCallback(() => {
    setUserOverride((prev) => {
      // If no prior override, flip from the current context-driven default —
      // mirrors the preview's toggle (`current === null ? getAutoLayoutExpanded() : !current`).
      const current = prev ?? autoCollapsed;
      return !current;
    });
  }, [autoCollapsed]);

  return (
    <DashboardSidebarContext.Provider
      value={{ mode, collapsed, setCollapsed, toggle, ready: hydrated }}
    >
      {children}
    </DashboardSidebarContext.Provider>
  );
}

export function useDashboardSidebar(): DashboardSidebarContextValue {
  const context = useContext(DashboardSidebarContext);
  if (!context) {
    throw new Error('useDashboardSidebar must be used within DashboardSidebarProvider');
  }
  return context;
}
