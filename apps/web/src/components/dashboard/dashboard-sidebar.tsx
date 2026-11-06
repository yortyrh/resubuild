'use client';

import Link from 'next/link';
import { BrandLogo, BrandMark } from '@/components/brand/brand-logo';
import { useDashboardSidebar } from '@/components/dashboard/dashboard-sidebar-context';
import { DashboardSidebarNav } from '@/components/dashboard/dashboard-sidebar-nav';
import { UserMenu } from '@/components/dashboard/user-menu';
import { cn } from '@/lib/utils';

interface DashboardSidebarProps {
  onNavClick?: () => void;
  alwaysExpanded?: boolean;
}

export function DashboardSidebar({ onNavClick, alwaysExpanded = false }: DashboardSidebarProps) {
  const { collapsed, ready } = useDashboardSidebar();
  const isCollapsed = !alwaysExpanded && ready && collapsed;

  return (
    <div
      className={cn('flex h-full flex-col gap-3 py-4', isCollapsed ? 'items-center px-2' : 'px-3')}
    >
      <div className={cn('shrink-0', !isCollapsed && 'w-full px-1')}>
        <Link
          href="/dashboard"
          className={cn('inline-block', isCollapsed ? 'mx-auto' : '')}
          onClick={onNavClick}
        >
          {isCollapsed ? (
            <BrandMark title="Resubuild" className="text-foreground size-7" />
          ) : (
            <BrandLogo className="py-2 text-lg" />
          )}
        </Link>
      </div>

      <DashboardSidebarNav onNavClick={onNavClick} collapsed={isCollapsed} />

      <div className="min-h-0 w-full flex-1" />

      <div className="chrome-divider w-full shrink-0 border-t pt-2">
        <div className={cn(isCollapsed ? 'flex justify-center' : 'px-1')}>
          <UserMenu collapsed={isCollapsed} />
        </div>
      </div>
    </div>
  );
}
