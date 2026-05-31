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
  className?: string;
}

export function ApplicationWorkspaceBreadcrumb({
  jobTitle,
  jobCompany,
  pageLabel,
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
        <BreadcrumbSeparator />
        <BreadcrumbItem className="min-w-0">
          <BreadcrumbPage className="min-w-0">
            {pageLabel ? (
              pageLabel
            ) : (
              <ApplicationJobLabel jobTitle={jobTitle} jobCompany={jobCompany} variant="compact" />
            )}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
