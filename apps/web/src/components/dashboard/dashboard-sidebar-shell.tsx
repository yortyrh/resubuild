'use client';

import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar';
import { useDashboardSidebar } from '@/components/dashboard/dashboard-sidebar-context';

export function DashboardSidebarShell() {
  const { collapsed, ready } = useDashboardSidebar();
  return (
    <aside
      className="surface-soft text-card-foreground chrome-divider sticky top-0 hidden h-screen shrink-0 overflow-y-auto border-r transition-[width] duration-200 md:block"
      data-collapsed={ready && collapsed ? 'true' : 'false'}
      style={{
        width: ready && collapsed ? '4rem' : '16rem',
        borderRadius: '2px',
      }}
      aria-label="Dashboard sidebar"
    >
      <DashboardSidebar />
    </aside>
  );
}
