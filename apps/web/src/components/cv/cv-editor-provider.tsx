'use client';

import type { Resume } from '@resumind/types';
import { createEmptyResume } from '@resumind/types';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { CvSectionSlug } from '@/components/cv/cv-section-nav';
import { useCv } from '@/lib/queries/cv-queries';

interface CvEditorState {
  cvId: string;
  resume: Resume;
  loading: boolean;
  error: string | null;
  setResume: (next: Resume | ((prev: Resume) => Resume)) => void;
  mountedSection: CvSectionSlug | null;
  setMountedSection: (slug: CvSectionSlug) => void;
}

const CvEditorContext = createContext<CvEditorState | null>(null);

export function CvEditorProvider({ cvId, children }: { cvId: string; children: ReactNode }) {
  const { data: cv, isLoading, error: queryError } = useCv(cvId);
  const [resume, setResumeState] = useState<Resume>(() => createEmptyResume());
  const [mountedSection, setMountedSectionState] = useState<CvSectionSlug | null>(null);

  useEffect(() => {
    if (!cv) {
      return;
    }

    const slim = cv.data as Resume;
    const { meta: _meta, ...slimWithoutMeta } = slim;
    setResumeState({
      ...createEmptyResume(),
      ...slimWithoutMeta,
    });
  }, [cv]);

  const setResume = useCallback((next: Resume | ((prev: Resume) => Resume)) => {
    setResumeState((prev) =>
      typeof next === 'function' ? (next as (p: Resume) => Resume)(prev) : next,
    );
  }, []);

  const setMountedSection = useCallback((slug: CvSectionSlug) => {
    setMountedSectionState(slug);
  }, []);

  const error = queryError instanceof Error ? queryError.message : queryError ? 'Failed to load CV' : null;

  const value = useMemo<CvEditorState>(
    () => ({
      cvId,
      resume,
      loading: isLoading,
      error,
      setResume,
      mountedSection,
      setMountedSection,
    }),
    [cvId, resume, isLoading, error, setResume, mountedSection, setMountedSection],
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
