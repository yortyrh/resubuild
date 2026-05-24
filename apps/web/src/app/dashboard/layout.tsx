import Link from 'next/link';
import { SignOutButton } from '@/components/dashboard/sign-out-button';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-lg font-semibold">
              Resumind
            </Link>
            <nav className="text-muted-foreground text-sm">
              <Link href="/dashboard" className="hover:text-foreground">
                My CVs
              </Link>
            </nav>
          </div>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
