'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useDashboardSidebar } from '@/components/dashboard/dashboard-sidebar-context';
import { DashboardSidebarNav } from '@/components/dashboard/dashboard-sidebar-nav';
import { UserMenu } from '@/components/dashboard/user-menu';
import logoSvg from '@/components/landing/logo-vectorized.svg';
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
            <Image
              src="/icon.svg"
              alt="Resubuild"
              width={40}
              height={40}
              priority
              unoptimized
              className="h-6 w-6"
            />
          ) : (
            <Image
              src={logoSvg}
              alt="Resubuild"
              width={120}
              height={42}
              priority
              className="h-[42px] w-[120px]"
            />
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
