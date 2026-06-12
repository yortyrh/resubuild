'use client';

import Link from 'next/link';
import { ApplicationJobLabel } from '@/components/applications/application-job-label';
import { CV_SECTIONS, type CvSectionSlug } from '@/components/cv/cv-section-nav';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import type { JobApplicationSummary } from '@/lib/api';
import { cn } from '@/lib/utils';

interface CvApplicationEditorBreadcrumbProps {
  application: JobApplicationSummary;
  cvId?: string;
  /** Section slug for editor routes; omit when `pageLabel` is set (e.g. Preview). */
  activeSection?: CvSectionSlug;
  /** Final breadcrumb segment for non-section pages (e.g. Preview). */
  pageLabel?: string;
  className?: string;
}

function sectionLabel(slug: CvSectionSlug): string {
  return CV_SECTIONS.find((section) => section.slug === slug)?.label ?? 'Basics';
}

export function CvApplicationEditorBreadcrumb({
  application,
  cvId,
  activeSection,
  pageLabel,
  className,
}: CvApplicationEditorBreadcrumbProps) {
  const onBasics = !pageLabel && activeSection === 'basics';
  const showTrailEnd =
    pageLabel ?? (activeSection && !onBasics ? sectionLabel(activeSection) : null);
  const showCvLink = Boolean(pageLabel && cvId);
  const applicationHref = `/dashboard/applications/${application.id}`;
  const cvHref = cvId ? `/dashboard/cv/${cvId}` : null;

  const label = (
    <ApplicationJobLabel
      jobTitle={application.jobTitle}
      jobCompany={application.jobCompany}
      variant="compact"
    />
  );

  return (
    <div className={cn('space-y-1', className)}>
      <Breadcrumb className="mt-0">
        <BreadcrumbList>
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbLink asChild className="min-w-0">
              <Link href={applicationHref}>{label}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {showCvLink && cvHref ? (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbLink asChild className="min-w-0">
                  <Link href={cvHref}>Edit CV</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </>
          ) : null}
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
      {showTrailEnd ? (
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="cv-page-title">
          {showTrailEnd}
        </h1>
      ) : null}
    </div>
  );
}
