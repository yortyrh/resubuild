import type { Metadata } from 'next';
import { SessionGate } from '@/components/auth/session-gate';
import { DashboardBreadcrumbProvider } from '@/components/dashboard/dashboard-breadcrumb-context';
import { DashboardSidebarProvider } from '@/components/dashboard/dashboard-sidebar-context';
import { DashboardSidebarShell } from '@/components/dashboard/dashboard-sidebar-shell';
import { DashboardTopBar } from '@/components/dashboard/dashboard-top-bar';
import { AuthenticatedProviders } from '@/components/providers/authenticated-providers';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthenticatedProviders>
      <SessionGate>
        <DashboardBreadcrumbProvider>
          <DashboardSidebarProvider>
            <div className="min-h-screen md:grid md:grid-cols-[auto_1fr]">
              <DashboardSidebarShell />

              <div className="flex min-h-screen flex-col">
                <DashboardTopBar />
                <main className="bg-muted/30 flex-1 px-4 py-4">
                  <div className="w-full">{children}</div>
                </main>
              </div>
            </div>
          </DashboardSidebarProvider>
        </DashboardBreadcrumbProvider>
      </SessionGate>
    </AuthenticatedProviders>
  );
}
