'use client';

import { Briefcase, FileText } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  Icon: typeof FileText;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'My CVs', Icon: FileText },
  { href: '/dashboard/applications', label: 'Applications', Icon: Briefcase },
];

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === '/dashboard') {
    // The dashboard root is the "My CVs" landing, and the CV editor and
    // applications sub-trees (cv/*, cv/new/*) also belong to the CVs area
    // — the Applications entry owns /dashboard/applications/* instead.
    if (pathname === '/dashboard' || pathname === '/dashboard/') return true;
    if (pathname.startsWith('/dashboard/applications')) return false;
    return pathname.startsWith('/dashboard');
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardTopNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className={cn('text-muted-foreground flex min-w-0 gap-1 text-sm sm:gap-2', className)}
    >
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors sm:gap-2 sm:px-3',
              'hover:text-foreground hover:bg-muted/50',
              'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
              active &&
                'bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">{label}</span>
            <span className="sr-only sm:hidden">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
