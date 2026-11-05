import type { Metadata } from 'next';
import { SessionGate } from '@/components/auth/session-gate';
import { DashboardBreadcrumbProvider } from '@/components/dashboard/dashboard-breadcrumb-context';
import { DashboardSidebarProvider } from '@/components/dashboard/dashboard-sidebar-context';
import { DashboardSidebarShell } from '@/components/dashboard/dashboard-sidebar-shell';
import { DashboardTopBar } from '@/components/dashboard/dashboard-top-bar';
import { PendingGuestImportSaver } from '@/components/guest-import/pending-guest-import-saver';
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
        <PendingGuestImportSaver />
        <DashboardBreadcrumbProvider>
          <DashboardSidebarProvider>
            <div className="min-h-screen md:grid md:grid-cols-[auto_1fr]">
              <DashboardSidebarShell />

              <div className="flex min-h-screen flex-col">
                <DashboardTopBar />
                <main className="bg-desk flex-1 px-4 py-6 sm:px-8 sm:py-8">
                  <div className="mx-auto w-full max-w-7xl">{children}</div>
                </main>
              </div>
            </div>
          </DashboardSidebarProvider>
        </DashboardBreadcrumbProvider>
      </SessionGate>
    </AuthenticatedProviders>
  );
}
