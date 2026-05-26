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
                cn('gap-2.5 px-3', comfortable ? 'min-h-11 py-3 text-base' : 'py-2'),
              navState === 'auto' &&
                cn(
                  'mx-auto size-10 justify-center px-0',
                  'md:mx-0 md:size-auto md:w-full md:justify-start md:gap-2.5 md:px-3',
                  comfortable ? 'md:min-h-11 md:py-3 md:text-base' : 'md:py-2',
                ),
              isActive
                ? cn(
                    'bg-accent text-accent-foreground font-medium',
                    navState === 'expanded' &&
                      comfortable &&
                      'border-primary border-l-2 pl-[calc(0.75rem-2px)] font-semibold',
                    navState === 'auto' &&
                      comfortable &&
                      'md:border-primary md:border-l-2 md:pl-[calc(0.75rem-2px)] md:font-semibold',
                  )
                : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground',
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
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
