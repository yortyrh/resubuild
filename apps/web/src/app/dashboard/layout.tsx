import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { SessionGate } from '@/components/auth/session-gate';
import { DashboardTopNav } from '@/components/dashboard/dashboard-top-nav';
import { UserMenu } from '@/components/dashboard/user-menu';
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
        <div className="min-h-screen">
          <header className="chrome-divider bg-background/90 supports-[backdrop-filter]:bg-background/75 border-b shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] backdrop-blur-sm">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-6 sm:py-4">
              <div className="flex min-w-0 items-center gap-3 sm:gap-6">
                <Link href="/dashboard" className="shrink-0">
                  <Image
                    src="/logo-vectorized.svg"
                    alt="Resubuild"
                    width={140}
                    height={50}
                    priority
                    className="h-[50px] w-[140px]"
                  />
                </Link>
                <DashboardTopNav />
              </div>
              <div className="shrink-0">
                <UserMenu />
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-2 pt-2 sm:px-4 sm:pt-2 md:px-4">{children}</main>
        </div>
      </SessionGate>
    </AuthenticatedProviders>
  );
}
