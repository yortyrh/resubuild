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
import { getCv } from '@/lib/api';

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
  const [resume, setResumeState] = useState<Resume>(() => createEmptyResume());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mountedSection, setMountedSectionState] = useState<CvSectionSlug | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getCv(cvId)
      .then((cv) => {
        if (cancelled) return;
        const slim = cv.data as Resume;
        const { meta: _meta, ...slimWithoutMeta } = slim;
        setResumeState({
          ...createEmptyResume(),
          ...slimWithoutMeta,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load CV');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cvId]);

  const setResume = useCallback((next: Resume | ((prev: Resume) => Resume)) => {
    setResumeState((prev) =>
      typeof next === 'function' ? (next as (p: Resume) => Resume)(prev) : next,
    );
  }, []);

  const setMountedSection = useCallback((slug: CvSectionSlug) => {
    setMountedSectionState(slug);
  }, []);

  const value = useMemo<CvEditorState>(
    () => ({
      cvId,
      resume,
      loading,
      error,
      setResume,
      mountedSection,
      setMountedSection,
    }),
    [cvId, resume, loading, error, setResume, mountedSection, setMountedSection],
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
