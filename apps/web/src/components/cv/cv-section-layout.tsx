'use client';

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { createContext, useContext, useState } from 'react';
import { CvSectionNav } from '@/components/cv/cv-section-nav-links';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CvSectionLayoutProps {
  cvId: string;
  children: React.ReactNode;
}

type NavState = 'auto' | 'collapsed' | 'expanded';

interface CvSectionLayoutContextValue {
  navState: NavState;
  toggleCollapsed: () => void;
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
  const { navState, toggleCollapsed } = useCvSectionLayout();

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
      ) : navState === 'expanded' ? (
        <PanelLeftClose className="size-4" aria-hidden="true" />
      ) : (
        <>
          <PanelLeftOpen className="size-4 md:hidden" aria-hidden="true" />
          <PanelLeftClose className="hidden size-4 md:block" aria-hidden="true" />
        </>
      )}
    </Button>
  );
}

export function CvSectionLayout({ cvId, children }: CvSectionLayoutProps) {
  const [userCollapsed, setUserCollapsed] = useState<boolean | null>(null);
  const navState = resolveNavState(userCollapsed);

  const toggleCollapsed = () => {
    setUserCollapsed((current) => {
      if (current === null) {
        return getAutoToggleCollapsed();
      }

      return !current;
    });
  };

  return (
    <CvSectionLayoutContext.Provider value={{ navState, toggleCollapsed }}>
      <div className="flex gap-2">
        <aside
          className={cn(
            'shrink-0 transition-[width] duration-200 ease-in-out',
            navState === 'auto' && 'w-12 md:w-48',
            navState === 'collapsed' && 'w-12',
            navState === 'expanded' && 'w-48',
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
    </CvSectionLayoutContext.Provider>
  );
}
