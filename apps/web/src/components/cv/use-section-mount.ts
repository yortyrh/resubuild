'use client';

import { useEffect } from 'react';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import type { CvSectionSlug } from '@/components/cv/cv-section-nav';

/**
 * Announces to the editor provider that this section is mounted as the
 * current children prop. The chrome compares this against the URL-derived
 * section to detect in-flight navigations and show a destination skeleton.
 */
export function useSectionMount(slug: CvSectionSlug): void {
  const { setMountedSection } = useCvEditor();
  useEffect(() => {
    setMountedSection(slug);
  }, [slug, setMountedSection]);
}
