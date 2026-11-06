'use client';

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import type { CvSectionSlug } from '@/components/cv/cv-section-nav';

/**
 * Editor-wide UI state only. CV data lives in React Query: the base in
 * `useCv`, each section in `useCvSectionList` / `useCvSectionItem`.
 */
interface CvEditorState {
  cvId: string;
  mountedSection: CvSectionSlug | null;
  setMountedSection: (slug: CvSectionSlug) => void;
}

const CvEditorContext = createContext<CvEditorState | null>(null);

export function CvEditorProvider({ cvId, children }: { cvId: string; children: ReactNode }) {
  const [mountedSection, setMountedSectionState] = useState<CvSectionSlug | null>(null);

  const setMountedSection = useCallback((slug: CvSectionSlug) => {
    setMountedSectionState(slug);
  }, []);

  const value = useMemo<CvEditorState>(
    () => ({ cvId, mountedSection, setMountedSection }),
    [cvId, mountedSection, setMountedSection],
  );

  return <CvEditorContext.Provider value={value}>{children}</CvEditorContext.Provider>;
}

export function useCvEditor(): CvEditorState {
  const context = useContext(CvEditorContext);
  if (!context) {
    throw new Error('useCvEditor must be used within CvEditorProvider');
  }
  return context;
}
