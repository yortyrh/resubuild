'use client';

import {
  type CvTitleBasics,
  deriveCvShortTitleFromBasics,
  deriveCvTitleFromBasics,
} from '@resubuild/types';
import Link from 'next/link';
import { CV_SECTIONS, type CvSectionSlug } from '@/components/cv/cv-section-nav';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface CvEditorBreadcrumbProps {
  cvId: string;
  basics?: CvTitleBasics | null;
  /** Section slug for editor routes; omit when `pageLabel` is set (e.g. Preview). */
  activeSection?: CvSectionSlug;
  /** Final breadcrumb segment for non-section pages (e.g. Preview). */
  pageLabel?: string;
  className?: string;
}

function sectionLabel(slug: CvSectionSlug): string {
  return CV_SECTIONS.find((section) => section.slug === slug)?.label ?? 'Summary';
}

export function CvTitleDisplay({
  basics,
  muted,
}: {
  basics?: CvTitleBasics | null;
  muted: boolean;
}) {
  const title = deriveCvTitleFromBasics(basics);
  const shortTitle = deriveCvShortTitleFromBasics(basics);
  const showShortTitle = shortTitle !== title;

  return (
    <>
      {showShortTitle ? (
        <span className={cn('md:hidden', muted && 'text-muted-foreground')}>{shortTitle}</span>
      ) : null}
      <span className={cn(showShortTitle && 'hidden md:inline', muted && 'text-muted-foreground')}>
        {title}
      </span>
    </>
  );
}

export function CvEditorBreadcrumb({
  cvId,
  basics,
  activeSection,
  pageLabel,
  className,
}: CvEditorBreadcrumbProps) {
  const isLoading = basics === null;
  const title = deriveCvTitleFromBasics(basics);
  const isUntitled = !isLoading && title === 'Untitled CV';
  const onBasics = !pageLabel && activeSection === 'basics';
  const showTrailEnd =
    pageLabel ?? (activeSection && !onBasics ? sectionLabel(activeSection) : null);
  const cvHref = `/dashboard/cv/${cvId}`;

  return (
    <Breadcrumb className={cn('mt-0', className)}>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/dashboard">My CVs</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          {isLoading ? (
            <Skeleton aria-hidden="true" className="h-4 w-36 max-w-[45vw] sm:w-56" />
          ) : onBasics ? (
            <BreadcrumbPage>
              <CvTitleDisplay basics={basics} muted={isUntitled} />
            </BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild>
              <Link href={cvHref} aria-label={title}>
                <CvTitleDisplay basics={basics} muted={isUntitled} />
              </Link>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>
        {showTrailEnd ? (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{showTrailEnd}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : null}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
