'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CV_SECTIONS, type CvSectionSlug, getSectionHref } from '@/components/cv/cv-section-nav';
import { cn } from '@/lib/utils';

interface CvSectionNavProps {
  cvId: string;
  onSelect?: () => void;
}

function resolveActiveSlug(pathname: string): CvSectionSlug {
  const match = pathname.match(/\/dashboard\/cv\/[^/]+\/([^/]+)/);
  if (match && CV_SECTIONS.some((s) => s.slug === match[1])) {
    return match[1] as CvSectionSlug;
  }
  return 'basics';
}

export function CvSectionNav({ cvId, onSelect }: CvSectionNavProps) {
  const pathname = usePathname();
  const activeSlug = resolveActiveSlug(pathname);

  return (
    <nav aria-label="CV sections" className="flex flex-col gap-1">
      {CV_SECTIONS.map(({ slug, label }) => {
        const isActive = slug === activeSlug;
        return (
          <Link
            key={slug}
            href={getSectionHref(cvId, slug)}
            aria-current={isActive ? 'page' : undefined}
            onClick={onSelect}
            className={cn(
              'rounded-md px-3 py-2 text-sm transition-colors',
              isActive
                ? 'bg-accent font-medium text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground',
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
