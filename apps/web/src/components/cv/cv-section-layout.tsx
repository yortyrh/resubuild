'use client';

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useState } from 'react';
import { CvSectionNav } from '@/components/cv/cv-section-nav-links';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CvSectionLayoutProps {
  cvId: string;
  children: React.ReactNode;
}

type NavState = 'auto' | 'collapsed' | 'expanded';

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
    <div className="flex gap-4 md:gap-6">
      <aside
        className={cn(
          'shrink-0 transition-[width] duration-200 ease-in-out',
          navState === 'auto' && 'w-12 md:w-48',
          navState === 'collapsed' && 'w-12',
          navState === 'expanded' && 'w-48',
        )}
      >
        <div className="sticky top-6 flex flex-col gap-1">
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
              'text-muted-foreground size-9 shrink-0',
              navState === 'collapsed' && 'mx-auto',
              navState === 'expanded' && '',
              navState === 'auto' && 'mx-auto md:mx-0',
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
          <div id="cv-section-nav">
            <CvSectionNav cvId={cvId} navState={navState} />
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
