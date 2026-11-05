'use client';

import { Menu, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import logoSvg from '@/components/landing/logo-vectorized.svg';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/#how-it-works', id: 'how-it-works', label: 'How it works' },
  { href: '/#editor', id: 'editor', label: 'Editor' },
  { href: '/#applications', id: 'applications', label: 'Applications' },
  { href: '/#faq', id: 'faq', label: 'Questions' },
  { href: '/features', id: 'features', label: 'Features' },
] as const;

/** Marks the section currently in view, so the pill nav shows where you are. */
function useActiveSection(enabled: boolean): string {
  const [active, setActive] = useState('');

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === 'undefined') return;
    const nodes = NAV_LINKS.map((link) => document.getElementById(link.id)).filter(
      (node): node is HTMLElement => node !== null,
    );
    if (nodes.length === 0) return;
    const ratios = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // Score by visible height: tall sections never reach a high ratio.
          ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRect.height : 0);
        }
        let best = '';
        let bestRatio = 0;
        for (const [id, ratio] of ratios) {
          if (ratio > bestRatio) {
            best = id;
            bestRatio = ratio;
          }
        }
        setActive(best);
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.05, 0.1, 0.2, 0.4, 0.6, 0.8, 1] },
    );
    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, [enabled]);

  return active;
}

export function MarketingHeader() {
  const pathname = usePathname();
  const active = useActiveSection(pathname === '/');
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const isCurrent = (id: string) => (id === 'features' ? pathname === '/features' : active === id);

  return (
    <header className="no-print sticky top-0 z-50 px-3 pt-3 sm:px-5">
      <div className="bg-card/85 mx-auto flex h-14 max-w-6xl items-center gap-4 rounded-full py-2 pl-5 pr-2 shadow-[0_0_0_1px_hsl(var(--border)),0_8px_24px_-16px_hsl(218_15%_10%/0.35)] backdrop-blur-md">
        <Link href="/" className="flex shrink-0 items-center rounded-sm">
          <Image
            src={logoSvg}
            alt="Resubuild"
            width={2172}
            height={724}
            className="h-8 w-auto"
            priority
            sizes="112px"
          />
        </Link>

        <nav aria-label="Primary" className="hidden flex-1 justify-center md:flex">
          <ul className="flex items-center gap-1 text-sm">
            {NAV_LINKS.map(({ href, id, label }) => (
              <li key={id}>
                <Link
                  href={href}
                  aria-current={isCurrent(id) ? 'true' : undefined}
                  className={cn(
                    'focus-visible:ring-ring rounded-full px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2',
                    isCurrent(id)
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring hidden rounded-full px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 sm:inline-flex"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex h-10 items-center rounded-full px-5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            Get started free
          </Link>
          <button
            type="button"
            className="hover:bg-secondary focus-visible:ring-ring inline-flex size-10 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 md:hidden"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </div>

      {open ? (
        <nav
          id={menuId}
          aria-label="Mobile"
          className="bg-card mx-auto mt-2 max-w-6xl rounded-3xl p-3 shadow-[0_0_0_1px_hsl(var(--border)),0_16px_32px_-16px_hsl(218_15%_10%/0.35)] md:hidden"
        >
          <ul className="flex flex-col">
            {NAV_LINKS.map(({ href, id, label }) => (
              <li key={id}>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  className="hover:bg-secondary block rounded-2xl px-4 py-3 text-lg font-medium"
                >
                  {label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="hover:bg-secondary block rounded-2xl px-4 py-3 text-lg font-medium"
              >
                Log in
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
