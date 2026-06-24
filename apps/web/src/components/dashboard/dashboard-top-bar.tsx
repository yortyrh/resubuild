'use client';

import { Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useState } from 'react';
import { CvApplicationEditorBreadcrumb } from '@/components/cv/cv-application-editor-breadcrumb';
import { CvEditorBreadcrumb } from '@/components/cv/cv-editor-breadcrumb';
import {
  DashboardBreadcrumbProvider,
  useDashboardBreadcrumb,
} from '@/components/dashboard/dashboard-breadcrumb-context';
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar';
import { useDashboardSidebar } from '@/components/dashboard/dashboard-sidebar-context';
import {
  type BreadcrumbItem,
  useRouteBreadcrumbs,
} from '@/components/dashboard/use-route-breadcrumbs';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import type { JobApplicationSummary } from '@/lib/api';
import { useIsMobile } from '@/lib/use-is-mobile';
import { cn } from '@/lib/utils';

export function DashboardTopBar({ actions }: { actions?: ReactNode }) {
  const { collapsed, toggle, ready } = useDashboardSidebar();
  const breadcrumb = useDashboardBreadcrumb();
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);
  const genericCrumbs = useRouteBreadcrumbs();

  if (isMobile) {
    return (
      <header
        className={cn(
          'chrome-divider bg-background no-print sticky top-0 z-30 flex h-14 items-center gap-1 border-b px-2',
        )}
      >
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button type="button" variant="ghost" size="icon" aria-label="Show menu">
              <Menu className="size-5" aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 sm:max-w-sm">
            <SheetTitle className="sr-only">Dashboard menu</SheetTitle>
            <SheetDescription className="sr-only">Navigate the dashboard.</SheetDescription>
            <DashboardSidebar onNavClick={() => setSheetOpen(false)} alwaysExpanded />
          </SheetContent>
        </Sheet>
        <div className="min-w-0 flex-1">
          <DashboardBreadcrumb breadcrumb={breadcrumb} genericCrumbs={genericCrumbs} />
        </div>
        {actions ? <div className="ml-auto flex items-center gap-2">{actions}</div> : null}
      </header>
    );
  }

  return (
    <header
      className={cn(
        'chrome-divider bg-background no-print sticky top-0 z-30 flex h-14 items-center gap-1 border-b px-2',
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        onClick={toggle}
        disabled={!ready}
      >
        {collapsed ? (
          <PanelLeftOpen className="size-5" aria-hidden="true" />
        ) : (
          <PanelLeftClose className="size-5" aria-hidden="true" />
        )}
      </Button>
      <div className="min-w-0 flex-1">
        <DashboardBreadcrumb breadcrumb={breadcrumb} genericCrumbs={genericCrumbs} />
      </div>
      {actions ? <div className="ml-auto flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}

function DashboardBreadcrumb({
  breadcrumb,
  genericCrumbs,
}: {
  breadcrumb: ReturnType<typeof useDashboardBreadcrumb>;
  genericCrumbs: BreadcrumbItem[];
}) {
  if (breadcrumb.variant === 'cv' && breadcrumb.cvId) {
    if (breadcrumb.application) {
      return (
        <CvApplicationEditorBreadcrumb
          application={breadcrumb.application}
          cvId={breadcrumb.cvId}
          activeSection={breadcrumb.activeSection}
          pageLabel={breadcrumb.pageLabel}
        />
      );
    }
    return (
      <CvEditorBreadcrumb
        cvId={breadcrumb.cvId}
        basics={breadcrumb.basics}
        activeSection={breadcrumb.activeSection}
        pageLabel={breadcrumb.pageLabel}
      />
    );
  }

  if (breadcrumb.variant === 'application' && breadcrumb.application) {
    return <ApplicationBreadcrumb application={breadcrumb.application} />;
  }

  return <GenericBreadcrumbs crumbs={genericCrumbs} />;
}

function ApplicationBreadcrumb({ application }: { application: JobApplicationSummary }) {
  const company = application.jobCompany?.trim();
  const title = application.jobTitle?.trim();
  const trailEnd = company || title || 'Application';
  const fullTitle = title && company ? `${title} · ${company}` : trailEnd;
  return (
    <nav aria-label="Breadcrumb" className="ml-1 flex min-w-0 flex-1 items-center gap-1.5 text-sm">
      <Link
        href="/dashboard"
        className="text-muted-foreground hover:text-foreground truncate transition-colors"
      >
        Dashboard
      </Link>
      <span aria-hidden="true" className="text-muted-foreground">
        /
      </span>
      <Link
        href="/dashboard/applications"
        className="text-muted-foreground hover:text-foreground truncate transition-colors"
      >
        Applications
      </Link>
      <span aria-hidden="true" className="text-muted-foreground">
        /
      </span>
      <span className="truncate font-medium" aria-current="page" title={fullTitle}>
        {trailEnd}
      </span>
    </nav>
  );
}

function GenericBreadcrumbs({ crumbs }: { crumbs: BreadcrumbItem[] }) {
  if (crumbs.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className="ml-1 flex min-w-0 flex-1 items-center gap-1.5 text-sm">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <span key={`${crumb.href}-${index}`} className="flex min-w-0 items-center gap-1.5">
            {index > 0 ? (
              <span aria-hidden="true" className="text-muted-foreground">
                /
              </span>
            ) : null}
            {isLast ? (
              <span className="truncate font-medium" aria-current="page">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-muted-foreground hover:text-foreground truncate transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

// Re-export the provider for convenience.
export { DashboardBreadcrumbProvider };
