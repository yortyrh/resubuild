import Link from 'next/link';
import { SessionGate } from '@/components/auth/session-gate';
import { UserMenu } from '@/components/dashboard/user-menu';
import { QueryProvider } from '@/components/providers/query-provider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionGate>
      <QueryProvider>
        <div className="min-h-screen">
          <header className="chrome-divider bg-background/90 supports-[backdrop-filter]:bg-background/75 border-b shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] backdrop-blur-sm">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
              <div className="flex items-center gap-6">
                <Link href="/dashboard" className="text-lg font-semibold">
                  Resumind
                </Link>
                <nav className="text-muted-foreground flex gap-4 text-sm">
                  <Link href="/dashboard" className="hover:text-foreground">
                    My CVs
                  </Link>
                  <Link href="/dashboard/applications" className="hover:text-foreground">
                    Applications
                  </Link>
                </nav>
              </div>
              <UserMenu />
            </div>
          </header>
          <main className="p-4.5 mx-auto max-w-6xl pt-2">{children}</main>
        </div>
      </QueryProvider>
    </SessionGate>
  );
}
