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
    if (pathname === '/dashboard' || pathname === '/dashboard/') return true;
    if (pathname.startsWith('/dashboard/applications')) return false;
    return pathname.startsWith('/dashboard');
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface DashboardSidebarNavProps {
  onNavClick?: () => void;
  collapsed?: boolean;
}

export function DashboardSidebarNav({ onNavClick, collapsed = false }: DashboardSidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className={cn('flex w-full flex-col gap-1', collapsed && 'items-center')}
    >
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            aria-label={collapsed ? label : undefined}
            title={collapsed ? label : undefined}
            onClick={onNavClick}
            className={cn(
              'flex items-center rounded-md text-sm transition-colors',
              'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
              collapsed
                ? cn(
                    'mx-auto size-10 justify-center px-0',
                    active
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground',
                  )
                : cn(
                    'w-full gap-3 px-3 py-2',
                    active
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground',
                  ),
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {!collapsed ? <span className="truncate">{label}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
