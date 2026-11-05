'use client';

import { Bot, PlugZap } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard/settings/ai-agent', label: 'AI model', icon: Bot },
  { href: '/dashboard/settings/mcp', label: 'MCP access', icon: PlugZap },
] as const;

/** Sub-navigation shared by the settings pages linked from the user menu. */
export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Settings" className="lg:sticky lg:top-20">
      <p className="text-muted-foreground mb-2 hidden px-3 text-sm font-medium lg:block">
        Settings
      </p>
      <ul className="flex gap-1 overflow-x-auto lg:flex-col">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href) ?? false;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'focus-visible:ring-ring flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2',
                  active
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
