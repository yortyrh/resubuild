'use client';

import { usePathname } from 'next/navigation';
import { CV_SECTIONS, type CvSectionSlug } from '@/components/cv/cv-section-nav';

export interface BreadcrumbItem {
  label: string;
  href: string;
}

const SECTION_LABELS: Record<CvSectionSlug, string> = CV_SECTIONS.reduce(
  (acc, { slug, label }) => {
    acc[slug] = label;
    return acc;
  },
  {} as Record<CvSectionSlug, string>,
);

function humanize(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function useRouteBreadcrumbs(): BreadcrumbItem[] {
  const pathname = usePathname() ?? '';
  const dashboard: BreadcrumbItem = { label: 'Dashboard', href: '/dashboard' };

  if (pathname === '/dashboard' || pathname === '/dashboard/') {
    return [dashboard];
  }

  if (pathname.startsWith('/dashboard/applications/new')) {
    return [
      dashboard,
      { label: 'Applications', href: '/dashboard/applications' },
      { label: 'New', href: '/dashboard/applications/new' },
    ];
  }

  if (pathname.startsWith('/dashboard/applications')) {
    const rest = pathname.replace('/dashboard/applications', '').replace(/^\//, '');
    if (!rest) {
      return [dashboard, { label: 'Applications', href: '/dashboard/applications' }];
    }
    return [
      dashboard,
      { label: 'Applications', href: '/dashboard/applications' },
      { label: 'Application', href: pathname },
    ];
  }

  if (pathname.startsWith('/dashboard/cv/new')) {
    return [
      dashboard,
      { label: 'CVs', href: '/dashboard' },
      { label: 'New CV', href: '/dashboard/cv/new' },
    ];
  }

  if (pathname.startsWith('/dashboard/cv/')) {
    const parts = pathname.replace('/dashboard/cv/', '').split('/');
    const section = parts[1];
    if (section && section in SECTION_LABELS) {
      return [
        dashboard,
        { label: 'CVs', href: '/dashboard' },
        {
          label: SECTION_LABELS[section as CvSectionSlug],
          href: pathname,
        },
      ];
    }
    return [dashboard, { label: 'CVs', href: '/dashboard' }];
  }

  if (pathname.startsWith('/dashboard/settings')) {
    const rest = pathname.replace('/dashboard/settings', '').replace(/^\//, '');
    if (!rest) {
      return [dashboard, { label: 'Settings', href: '/dashboard/settings/ai-agent' }];
    }
    return [
      dashboard,
      { label: 'Settings', href: '/dashboard/settings/ai-agent' },
      { label: humanize(rest.split('/')[0] ?? ''), href: pathname },
    ];
  }

  return [dashboard];
}
