'use client';

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { createContext, useContext, useState } from 'react';
import { CvSectionNav } from '@/components/cv/cv-section-nav-links';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/lib/use-is-mobile';
import { cn } from '@/lib/utils';

interface CvSectionLayoutProps {
  cvId: string;
  children: React.ReactNode;
}

type NavState = 'auto' | 'collapsed' | 'expanded';

interface CvSectionLayoutContextValue {
  navState: NavState;
  isMobile: boolean;
  toggleCollapsed: () => void;
  openDrawer: () => void;
}

const CvSectionLayoutContext = createContext<CvSectionLayoutContextValue | null>(null);

function useCvSectionLayout(): CvSectionLayoutContextValue {
  const context = useContext(CvSectionLayoutContext);

  if (!context) {
    throw new Error('CvSectionNavToggle must be used within CvSectionLayout');
  }

  return context;
}

function resolveNavState(userCollapsed: boolean | null): NavState {
  if (userCollapsed === true) {
    return 'collapsed';
  }

  if (userCollapsed === false) {
    return 'expanded';
  }

  return 'auto';
}

function getAutoToggleCollapsed(): boolean {
  if (typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(min-width: 768px)').matches;
}

export function CvSectionNavToggle({ className }: { className?: string }) {
  const { navState, isMobile, toggleCollapsed, openDrawer } = useCvSectionLayout();

  if (isMobile) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={openDrawer}
        aria-label="Open section navigation"
        aria-controls="cv-section-nav-drawer"
        className={cn(
          'text-muted-foreground size-9 shrink-0 pl-0 pt-0 text-left align-top',
          className,
        )}
      >
        <PanelLeftOpen className="size-4" aria-hidden="true" />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleCollapsed}
      aria-expanded={navState === 'auto' ? undefined : navState === 'expanded'}
      aria-controls="cv-section-nav"
      aria-label={
        navState === 'collapsed'
          ? 'Expand section navigation'
          : navState === 'expanded'
            ? 'Collapse section navigation'
            : 'Toggle section navigation'
      }
      className={cn(
        'text-muted-foreground size-9 shrink-0 pl-0 pt-0 text-left align-top',
        className,
      )}
    >
      {navState === 'collapsed' ? (
        <PanelLeftOpen className="size-4" aria-hidden="true" />
      ) : (
        <PanelLeftClose className="size-4" aria-hidden="true" />
      )}
    </Button>
  );
}

export function CvSectionLayout({ cvId, children }: CvSectionLayoutProps) {
  const [userCollapsed, setUserCollapsed] = useState<boolean | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navState = resolveNavState(userCollapsed);
  const isMobile = useIsMobile();

  const toggleCollapsed = () => {
    setUserCollapsed((current) => {
      if (current === null) {
        return getAutoToggleCollapsed();
      }

      return !current;
    });
  };

  const openDrawer = () => setDrawerOpen(true);

  return (
    <CvSectionLayoutContext.Provider value={{ navState, isMobile, toggleCollapsed, openDrawer }}>
      <div className="flex gap-2">
        <aside
          className={cn(
            'hidden shrink-0 transition-[width] duration-200 ease-in-out md:block',
            navState === 'auto' && 'md:w-48',
            navState === 'collapsed' && 'md:w-12',
            navState === 'expanded' && 'md:w-48',
          )}
        >
          <div className="sticky top-6 flex flex-col gap-1">
            <div id="cv-section-nav">
              <CvSectionNav cvId={cvId} navState={navState} />
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          id="cv-section-nav-drawer"
          side="left"
          className="flex w-72 flex-col gap-2 px-0 py-2 sm:max-w-sm [&>button]:hidden"
        >
          <SheetTitle className="sr-only">CV sections</SheetTitle>
          <SheetDescription className="sr-only">
            Navigate between CV sections such as basics, work, education, and skills.
          </SheetDescription>
          <div className="scrollbar-hidden flex-1 overflow-y-auto px-2">
            <CvSectionNav
              cvId={cvId}
              navState="expanded"
              density="comfortable"
              onSelect={() => setDrawerOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </CvSectionLayoutContext.Provider>
  );
}
