'use client';

import Link from 'next/link';
import { ApplicationJobLabel } from '@/components/applications/application-job-label';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface ApplicationWorkspaceBreadcrumbProps {
  jobTitle?: string | null;
  jobCompany?: string | null;
  pageLabel?: string;
  /** When true, only render the root "Applications" link (the trail end is rendered as a separate title). */
  hideTrail?: boolean;
  className?: string;
}

export function ApplicationWorkspaceBreadcrumb({
  jobTitle,
  jobCompany,
  pageLabel,
  hideTrail = false,
  className,
}: ApplicationWorkspaceBreadcrumbProps) {
  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/dashboard/applications">Applications</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {hideTrail ? null : (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="min-w-0">
                {pageLabel ? (
                  pageLabel
                ) : (
                  <ApplicationJobLabel
                    jobTitle={jobTitle}
                    jobCompany={jobCompany}
                    variant="compact"
                  />
                )}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
