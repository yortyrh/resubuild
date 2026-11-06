'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getSectionIcon } from '@/components/cv/cv-section-icons';
import {
  CV_SECTIONS,
  type CvSectionSlug,
  getSectionHref,
  resolveActiveSectionFromPathname,
} from '@/components/cv/cv-section-nav';
import { cn } from '@/lib/utils';

type NavState = 'auto' | 'collapsed' | 'expanded';

interface CvSectionNavProps {
  cvId: string;
  onSelect?: () => void;
  density?: 'default' | 'comfortable';
  navState?: NavState;
}

export function CvSectionNav({
  cvId,
  onSelect,
  density = 'default',
  navState = 'auto',
}: CvSectionNavProps) {
  const pathname = usePathname();
  const activeSlug = resolveActiveSectionFromPathname(pathname);
  const comfortable = density === 'comfortable';
  const iconOnly = navState === 'collapsed' || navState === 'auto';

  return (
    <nav aria-label="CV sections" className="flex flex-col gap-0.5">
      {CV_SECTIONS.map(({ slug, label }) => {
        const isActive = slug === activeSlug;
        const Icon = getSectionIcon(slug);
        return (
          <Link
            key={slug}
            href={getSectionHref(cvId, slug)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={iconOnly ? label : undefined}
            title={iconOnly ? label : undefined}
            onClick={onSelect}
            className={cn(
              'flex items-center rounded-md text-sm transition-colors',
              navState === 'collapsed' && 'mx-auto size-10 justify-center px-0',
              navState === 'expanded' &&
                cn('gap-2.5 px-3', comfortable ? 'min-h-9 py-1.5' : 'py-2'),
              navState === 'auto' &&
                cn(
                  'mx-auto size-10 justify-center px-0',
                  'md:mx-0 md:size-auto md:w-full md:justify-start md:gap-2.5 md:px-3',
                  comfortable ? 'md:min-h-9 md:py-1.5' : 'md:py-2',
                ),
              isActive
                ? cn(
                    'text-foreground font-semibold',
                    navState === 'collapsed' && 'bg-accent text-accent-foreground',
                    navState === 'expanded' &&
                      'bg-card border-primary rounded-l-none border-l-2 pl-[calc(0.75rem-2px)] shadow-[0_0_0_1px_hsl(var(--border)/0.6)]',
                    navState === 'auto' &&
                      'bg-accent text-accent-foreground md:bg-card md:text-foreground md:border-primary md:rounded-l-none md:border-l-2 md:pl-[calc(0.75rem-2px)] md:shadow-[0_0_0_1px_hsl(var(--border)/0.6)]',
                  )
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
            )}
          >
            <Icon
              className={cn('size-4 shrink-0', isActive ? 'text-primary' : 'opacity-80')}
              aria-hidden="true"
            />
            <span
              className={cn(
                'truncate',
                navState === 'collapsed' && 'hidden',
                navState === 'expanded' && 'inline',
                navState === 'auto' && 'hidden md:inline',
              )}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export type { CvSectionSlug };
